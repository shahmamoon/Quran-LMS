import { env } from '../config/env.js';

const DAILY_BASE = 'https://api.daily.co/v1';

export function isDailyConfigured(): boolean {
  return !!env.DAILY_API_KEY;
}

function dailyHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${env.DAILY_API_KEY}`,
  };
}

async function dailyRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${DAILY_BASE}${path}`, {
    method,
    headers: dailyHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Daily.co ${method} ${path} → ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export interface DailyRoom {
  name: string;
  url: string;
}

/**
 * Create a Daily.co room for a session.
 * `expiresAt` is when the room auto-closes (Unix timestamp seconds).
 */
export async function createDailyRoom(sessionId: string, expiresAt: Date): Promise<DailyRoom> {
  const name = `session-${sessionId}`;
  const data = await dailyRequest<{ name: string; url: string }>('POST', '/rooms', {
    name,
    properties: {
      exp: Math.floor(expiresAt.getTime() / 1000),
      enable_recording: 'cloud',
      // start_audio_off + start_video_off: sensible defaults for a teaching session
      start_audio_off: false,
      start_video_off: false,
    },
  });
  return { name: data.name, url: data.url };
}

export async function deleteDailyRoom(roomName: string): Promise<void> {
  await dailyRequest('DELETE', `/rooms/${roomName}`);
}

/**
 * Download a Daily.co recording as an ArrayBuffer using the temporary download URL.
 * Daily provides a signed `download_url` that is valid for a short window.
 */
export async function downloadDailyRecording(downloadUrl: string): Promise<ArrayBuffer> {
  const res = await fetch(downloadUrl);
  if (!res.ok) throw new Error(`Daily recording download failed: ${res.status}`);
  return res.arrayBuffer();
}

/**
 * Verify a Daily.co webhook HMAC-SHA256 signature.
 * Daily sends: `Daily-Signature: t=<ts>,v1=<sig>` header.
 * We recompute HMAC over `t.<body>` using DAILY_API_KEY as the secret.
 */
export async function verifyDailyWebhook(
  rawBody: Buffer,
  signatureHeader: string,
): Promise<boolean> {
  if (!env.DAILY_API_KEY) return false;
  const parts = Object.fromEntries(signatureHeader.split(',').map((p) => p.split('=')));
  const t = parts['t'];
  const v1 = parts['v1'];
  if (!t || !v1) return false;

  const { createHmac } = await import('crypto');
  const payload = `${t}.${rawBody.toString('utf8')}`;
  const expected = createHmac('sha256', env.DAILY_API_KEY).update(payload).digest('hex');
  return expected === v1;
}
