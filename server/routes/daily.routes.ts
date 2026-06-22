import { Router } from 'express';
import { randomUUID } from 'crypto';
import { prisma } from '../config/prisma.js';
import { successResponse, errorResponse } from '../utils/response.utils.js';
import { verifyDailyWebhook, downloadDailyRecording, isDailyConfigured } from '../services/daily.service.js';
import { isR2Configured, uploadBufferToR2 } from '../services/r2.service.js';

const router = Router();

/**
 * POST /api/daily/webhook
 *
 * Daily.co calls this when a cloud recording is ready.
 * Payload type: `recording.ready`
 * We download the MP4 from Daily's CDN, push it to R2, then store the key on the Session.
 *
 * IMPORTANT: mounted with express.raw({ type: 'application/json' }) so we can
 * verify the HMAC signature before parsing the body.
 */
router.post('/webhook', async (req, res) => {
  if (!isDailyConfigured()) {
    res.status(200).json({ ok: true }); // silently ack if Daily not configured
    return;
  }

  const sig = req.headers['daily-signature'] as string | undefined;
  if (sig) {
    const valid = await verifyDailyWebhook(req.body as Buffer, sig);
    if (!valid) {
      errorResponse(res, 'Invalid Daily.co signature', 401);
      return;
    }
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse((req.body as Buffer).toString('utf8'));
  } catch {
    errorResponse(res, 'Invalid JSON', 400);
    return;
  }

  // Only handle recording-ready events
  if (payload['type'] !== 'recording.ready') {
    res.status(200).json({ ok: true });
    return;
  }

  const eventData = payload['payload'] as Record<string, unknown> | undefined;
  const roomName = eventData?.['room_name'] as string | undefined;
  const downloadUrl = eventData?.['download_url'] as string | undefined;
  const recordingId = eventData?.['id'] as string | undefined;

  if (!roomName || !downloadUrl) {
    errorResponse(res, 'Missing room_name or download_url', 400);
    return;
  }

  // Find the session with this Daily room
  const session = await prisma.session.findFirst({
    where: { dailyRoomName: roomName },
    select: { id: true, recordingUrl: true },
  });

  if (!session) {
    // Unknown room — ack so Daily stops retrying
    res.status(200).json({ ok: true, note: 'session not found' });
    return;
  }

  if (!isR2Configured()) {
    console.warn(`[Daily webhook] Recording ready for session ${session.id} but R2 is not configured`);
    res.status(200).json({ ok: true, note: 'R2 not configured, recording not stored' });
    return;
  }

  try {
    // Download from Daily's CDN
    const buffer = Buffer.from(await downloadDailyRecording(downloadUrl));

    // Push to R2
    const key = `recordings/${session.id}/${recordingId ?? randomUUID()}.mp4`;
    await uploadBufferToR2(key, buffer, 'video/mp4');

    // Persist to DB (replaces any existing manual recording)
    await prisma.session.update({
      where: { id: session.id },
      data: { recordingUrl: key },
    });

    console.log(`[Daily webhook] Auto-recording saved: ${key} for session ${session.id}`);
    successResponse(res, { ok: true, key });
  } catch (err) {
    console.error('[Daily webhook] Failed to process recording:', err);
    // Return 500 so Daily retries the webhook
    errorResponse(res, 'Failed to process recording', 500);
  }
});

export default router;
