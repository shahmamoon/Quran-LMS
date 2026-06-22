import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.middleware.js';
import { successResponse, errorResponse } from '../utils/response.utils.js';
import { logAudit } from '../utils/audit.utils.js';
import { Role } from '@prisma/client';

const router = Router();

// GET /api/settings/public — no auth required
router.get('/public', async (_req, res) => {
  const settings = await prisma.setting.findMany({ where: { isPublic: true } });
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  successResponse(res, map);
});

router.use(authenticate);

// GET /api/settings
router.get('/', requireRole(Role.ADMIN), async (_req, res) => {
  const settings = await prisma.setting.findMany({ orderBy: { key: 'asc' } });
  successResponse(res, settings);
});

// PUT /api/settings
router.put('/', requireRole(Role.ADMIN), async (req: AuthRequest, res) => {
  const updates = req.body as Record<string, string>;
  await Promise.all(
    Object.entries(updates).map(([key, value]) =>
      prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } })
    )
  );
  logAudit(req, 'UPDATE', 'Settings', undefined, { keys: Object.keys(updates) });
  successResponse(res, { message: 'Settings updated' });
});

// GET /api/settings/audit-logs
router.get('/audit-logs', requireRole(Role.ADMIN), async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 50;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLog.count(),
  ]);

  successResponse(res, { logs, total, page, limit });
});

export default router;
