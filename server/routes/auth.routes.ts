import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.utils.js';
import { successResponse, errorResponse } from '../utils/response.utils.js';
import { authenticate, AuthRequest } from '../middleware/auth.middleware.js';
import { logAudit } from '../utils/audit.utils.js';
import { rateLimit } from 'express-rate-limit';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  // Raise limit in dev/test so Playwright can log in multiple roles without hitting the cap
  max: process.env.NODE_ENV === 'production' ? 20 : 200,
  message: 'Too many login attempts',
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body as { email: string; password: string };
  if (!email || !password) {
    errorResponse(res, 'Email and password are required', 400);
    return;
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user || user.status === 'ARCHIVED') {
    logAudit(req, 'LOGIN_FAILED', 'User', undefined, { email: email.toLowerCase().trim(), reason: !user ? 'user_not_found' : 'account_archived' });
    errorResponse(res, 'Invalid credentials', 401);
    return;
  }
  if (user.status === 'SUSPENDED') {
    logAudit(req, 'LOGIN_FAILED', 'User', user.id, { email: user.email, reason: 'account_suspended' });
    errorResponse(res, 'Your account has been suspended. Please contact your administrator.', 403);
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    logAudit(req, 'LOGIN_FAILED', 'User', user.id, { email: user.email, reason: 'wrong_password' });
    errorResponse(res, 'Invalid credentials', 401);
    return;
  }

  const accessToken = signAccessToken({ userId: user.id, role: user.role });
  const refreshToken = signRefreshToken({ userId: user.id, role: user.role });
  const refreshHash = await bcrypt.hash(refreshToken, 10);

  await prisma.user.update({ where: { id: user.id }, data: { refreshToken: refreshHash } });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  logAudit(req, 'LOGIN', 'User', user.id, { role: user.role });
  const { passwordHash: _ph, refreshToken: _rt, resetToken: _rst, resetTokenExpiry: _rte, ...safeUser } = user;
  successResponse(res, { user: safeUser, accessToken });
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  const token: string | undefined = req.cookies?.refreshToken as string | undefined;
  if (!token) { errorResponse(res, 'No refresh token', 401); return; }

  try {
    const payload = verifyRefreshToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.refreshToken) { errorResponse(res, 'Invalid refresh token', 401); return; }

    // Suspended/archived users must not be able to refresh — their existing cookies
    // remain valid in the browser, so this is the only gate that stops them.
    if (user.status === 'SUSPENDED') { errorResponse(res, 'Account suspended', 403); return; }
    if (user.status === 'ARCHIVED') { errorResponse(res, 'Account deactivated', 401); return; }

    const valid = await bcrypt.compare(token, user.refreshToken);
    if (!valid) { errorResponse(res, 'Invalid refresh token', 401); return; }

    const accessToken = signAccessToken({ userId: user.id, role: user.role });
    successResponse(res, { accessToken });
  } catch {
    errorResponse(res, 'Invalid or expired refresh token', 401);
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req: AuthRequest, res) => {
  if (req.user) {
    await prisma.user.update({ where: { id: req.user.userId }, data: { refreshToken: null } });
    logAudit(req, 'LOGOUT', 'User', req.user.userId);
  }
  res.clearCookie('refreshToken');
  successResponse(res, { message: 'Logged out' });
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res) => {
  if (!req.user) { errorResponse(res, 'Unauthorized', 401); return; }
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { id: true, email: true, firstName: true, lastName: true, role: true, avatarUrl: true, bio: true, status: true, emailVerified: true, createdAt: true },
  });
  if (!user) { errorResponse(res, 'User not found', 404); return; }
  successResponse(res, user);
});

export default router;
