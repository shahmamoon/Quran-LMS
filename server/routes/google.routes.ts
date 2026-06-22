import { Router } from 'express';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.middleware.js';
import { successResponse, errorResponse } from '../utils/response.utils.js';
import { prisma } from '../config/prisma.js';
import { Role } from '@prisma/client';
import {
  isGoogleConfigured,
  buildGoogleAuthUrl,
  exchangeGoogleCode,
} from '../services/google-meet.service.js';

const router = Router();

// In-memory nonce → tokens map (TTL 10 min)
const pendingTokens = new Map<string, { accessToken: string; refreshToken: string; expiresAt: Date; expires: number }>();

// GET /api/google/auth?_nonce=xxx — open as popup; redirects to Google OAuth (no auth required)
router.get('/auth', (req, res) => {
  if (!isGoogleConfigured()) { res.status(503).send('Google OAuth not configured'); return; }
  const nonce = (req.query._nonce as string) || (Math.random().toString(36).slice(2) + Date.now().toString(36));
  const url = buildGoogleAuthUrl(nonce); // state = nonce
  res.redirect(url);
});

// GET /api/google/callback — Google redirects here after consent (no auth required)
router.get('/callback', async (req, res) => {
  const { code, state: nonce } = req.query as { code?: string; state?: string };

  if (!code || !nonce) {
    res.send('<script>window.close();</script>'); return;
  }
  if (!isGoogleConfigured()) { res.send('<script>window.close();</script>'); return; }

  try {
    const tokens = await exchangeGoogleCode(code);
    pendingTokens.set(nonce, { ...tokens, expires: Date.now() + 10 * 60 * 1000 });
  } catch (err) {
    console.error('Google OAuth callback error:', err);
  }

  // Close the popup — frontend is polling
  res.send(`<!DOCTYPE html><html><body><script>window.close();</script></body></html>`);
});

// All routes below require auth
router.use(authenticate);

// GET /api/google/poll?nonce=xxx — frontend polls this after popup closes
router.get('/poll', async (req: AuthRequest, res) => {
  if (!req.user) { errorResponse(res, 'Unauthorized', 401); return; }

  const nonce = req.query.nonce as string | undefined;
  if (!nonce) { errorResponse(res, 'Missing nonce', 400); return; }

  const entry = pendingTokens.get(nonce);
  if (!entry || Date.now() > entry.expires) {
    pendingTokens.delete(nonce);
    successResponse(res, { connected: false });
    return;
  }

  // One-time use — claim and save to DB
  pendingTokens.delete(nonce);
  await prisma.user.update({
    where: { id: req.user.userId },
    data: {
      googleAccessToken: entry.accessToken,
      googleRefreshToken: entry.refreshToken,
      googleTokenExpiry: entry.expiresAt,
    },
  });

  successResponse(res, { connected: true });
});

// GET /api/google/status
router.get('/status', async (req: AuthRequest, res) => {
  if (!req.user) { errorResponse(res, 'Unauthorized', 401); return; }

  if (!isGoogleConfigured()) {
    successResponse(res, { configured: false, connected: false });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { googleAccessToken: true, googleRefreshToken: true },
  });

  successResponse(res, { configured: true, connected: !!(user?.googleAccessToken && user.googleRefreshToken) });
});

// DELETE /api/google/disconnect
router.delete('/disconnect', requireRole(Role.ADMIN, Role.TEACHER), async (req: AuthRequest, res) => {
  if (!req.user) { errorResponse(res, 'Unauthorized', 401); return; }

  await prisma.user.update({
    where: { id: req.user.userId },
    data: { googleAccessToken: null, googleRefreshToken: null, googleTokenExpiry: null },
  });
  successResponse(res, { message: 'Google Calendar disconnected' });
});

export default router;
