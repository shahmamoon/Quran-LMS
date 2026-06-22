import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { authenticate, AuthRequest } from '../middleware/auth.middleware.js';
import { successResponse, errorResponse } from '../utils/response.utils.js';
import { buildZoomAuthUrl, exchangeZoomCode } from '../services/zoom.service.js';
import { Role } from '@prisma/client';

const router = Router();

// ─── GET /api/zoom/status — is OAuth feature enabled? is user connected? ──────
router.get('/status', authenticate, async (req: AuthRequest, res) => {
  const featureEnabled = !!(env.ZOOM_OAUTH_CLIENT_ID && env.ZOOM_OAUTH_CLIENT_SECRET && env.ZOOM_REDIRECT_URI);

  if (!featureEnabled) {
    successResponse(res, { enabled: false, connected: false });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { zoomAccessToken: true, zoomTokenExpiry: true },
  });

  const connected = !!(user?.zoomAccessToken && user.zoomTokenExpiry && user.zoomTokenExpiry > new Date());
  successResponse(res, { enabled: true, connected });
});

// ─── GET /api/zoom/connect — redirect to Zoom OAuth ──────────────────────────
router.get('/connect', authenticate, (req: AuthRequest, res) => {
  if (!env.ZOOM_OAUTH_CLIENT_ID || !env.ZOOM_OAUTH_CLIENT_SECRET || !env.ZOOM_REDIRECT_URI) {
    errorResponse(res, 'Zoom OAuth is not configured on this server', 501);
    return;
  }

  const role = req.user!.role as string;
  if (role !== Role.ADMIN && role !== Role.TEACHER) {
    errorResponse(res, 'Only teachers and admins can connect a Zoom account', 403);
    return;
  }

  // Short-lived state JWT to tie the callback back to this user (CSRF protection)
  const state = jwt.sign(
    { userId: req.user!.userId, returnTo: '/lms/profile' },
    env.JWT_SECRET,
    { expiresIn: '10m' }
  );

  res.redirect(buildZoomAuthUrl(state));
});

// ─── GET /api/zoom/callback — Zoom redirects here after authorization ─────────
// This endpoint is NOT behind authenticate — Zoom calls it with a code + state
router.get('/callback', async (req, res) => {
  const { code, state, error } = req.query as Record<string, string>;

  if (error) {
    return res.redirect(`${env.CLIENT_URL}/lms/profile?zoom=denied`);
  }

  if (!code || !state) {
    return res.redirect(`${env.CLIENT_URL}/lms/profile?zoom=error`);
  }

  let payload: { userId: string; returnTo: string };
  try {
    payload = jwt.verify(state, env.JWT_SECRET) as typeof payload;
  } catch {
    return res.redirect(`${env.CLIENT_URL}/lms/profile?zoom=error`);
  }

  try {
    const tokens = await exchangeZoomCode(code);
    await prisma.user.update({
      where: { id: payload.userId },
      data: {
        zoomAccessToken:  tokens.accessToken,
        zoomRefreshToken: tokens.refreshToken,
        zoomTokenExpiry:  tokens.expiresAt,
      },
    });
  } catch (err) {
    console.error('Zoom callback error:', err);
    return res.redirect(`${env.CLIENT_URL}/lms/profile?zoom=error`);
  }

  const returnTo = payload.returnTo ?? '/lms/profile';
  res.redirect(`${env.CLIENT_URL}${returnTo}?zoom=connected`);
});

// ─── DELETE /api/zoom/disconnect — clear user's Zoom tokens ──────────────────
router.delete('/disconnect', authenticate, async (req: AuthRequest, res) => {
  await prisma.user.update({
    where: { id: req.user!.userId },
    data: { zoomAccessToken: null, zoomRefreshToken: null, zoomTokenExpiry: null },
  });
  successResponse(res, { connected: false });
});

export default router;
