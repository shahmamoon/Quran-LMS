import { S3Client, DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { Readable } from 'stream';
import { env } from '../config/env.js';

export function isR2Configured(): boolean {
  return !!(env.R2_ENDPOINT && env.R2_REGION && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_BUCKET_NAME);
}

// Module-level singleton — avoids recreating the HTTP connection pool on every request.
const r2Client: S3Client | null = isR2Configured()
  ? new S3Client({
      endpoint: env.R2_ENDPOINT!,
      region: env.R2_REGION!,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID!,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY!,
      },
    })
  : null;

function getClient(): S3Client {
  if (!r2Client) throw new Error('R2 is not configured');
  return r2Client;
}

// Generate a presigned PUT URL for direct browser-to-R2 upload. Expires in 1 hour.
export async function getPresignedUploadUrl(key: string): Promise<string> {
  return getSignedUrl(
    getClient(),
    new PutObjectCommand({ Bucket: env.R2_BUCKET_NAME!, Key: key, ContentType: 'video/mp4' }),
    { expiresIn: 3600 },
  );
}

// Stream a recording from R2 for proxying to the client.
export async function getRecordingStream(key: string): Promise<Readable> {
  const result = await getClient().send(new GetObjectCommand({ Bucket: env.R2_BUCKET_NAME!, Key: key }));
  if (!result.Body) throw new Error('Empty response body from R2');
  return result.Body as Readable;
}

// Delete a recording from R2.
export async function deleteRecording(key: string): Promise<void> {
  await getClient().send(new DeleteObjectCommand({ Bucket: env.R2_BUCKET_NAME!, Key: key }));
}

// Upload a buffer to R2 (used by Daily.co webhook to push auto-recordings).
export async function uploadBufferToR2(key: string, buffer: Buffer, contentType = 'video/mp4'): Promise<void> {
  await getClient().send(new PutObjectCommand({
    Bucket: env.R2_BUCKET_NAME!,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));
}

// Extract the R2 object key from recordingUrl (plain key: "recordings/...").
export function keyFromUrl(recordingUrl: string): string {
  if (recordingUrl.startsWith('http')) {
    const url = new URL(recordingUrl);
    return url.pathname.replace(/^\//, '');
  }
  return recordingUrl;
}
