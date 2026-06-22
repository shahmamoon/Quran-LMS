import { Router } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.middleware.js';
import { successResponse, errorResponse } from '../utils/response.utils.js';
import { getIo, pushNotification } from '../socket/socket.server.js';

const router = Router();
router.use(authenticate);

// ── GET /api/notifications ───────────────────────────────────
// Params: ?type= (comma-separated), ?archived=true
router.get('/', async (req: AuthRequest, res) => {
  const me = req.user!;
  const typeFilter = typeof req.query.type === 'string' && req.query.type ? req.query.type.split(',').map((t) => t.trim()) : null;
  const showArchived = req.query.archived === 'true';

  const notifications = await prisma.notification.findMany({
    where: {
      userId: me.userId,
      archivedAt: showArchived ? { not: null } : null,
      ...(typeFilter ? { type: { in: typeFilter } } : {}),
    },
    orderBy: [{ isRead: 'asc' }, { createdAt: 'desc' }],
    take: 100,
  });

  const unreadCount = await prisma.notification.count({
    where: { userId: me.userId, isRead: false, archivedAt: null },
  });

  successResponse(res, { notifications, unreadCount });
});

// ── PATCH /api/notifications/:id/read ───────────────────────
router.patch('/:id/read', async (req: AuthRequest, res) => {
  const notif = await prisma.notification.findFirst({ where: { id: req.params.id, userId: req.user!.userId } });
  if (!notif) { errorResponse(res, 'Not found', 404); return; }
  const updated = await prisma.notification.update({ where: { id: req.params.id }, data: { isRead: true } });
  successResponse(res, updated);
});

// ── PATCH /api/notifications/read-all ───────────────────────
router.patch('/read-all', async (req: AuthRequest, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.user!.userId, isRead: false, archivedAt: null },
    data: { isRead: true },
  });
  successResponse(res, { message: 'All notifications marked as read' });
});

// ── PATCH /api/notifications/:id/archive ────────────────────
router.patch('/:id/archive', async (req: AuthRequest, res) => {
  const notif = await prisma.notification.findFirst({ where: { id: req.params.id, userId: req.user!.userId } });
  if (!notif) { errorResponse(res, 'Not found', 404); return; }
  const updated = await prisma.notification.update({
    where: { id: req.params.id },
    data: { archivedAt: notif.archivedAt ? null : new Date(), isRead: true },
  });
  successResponse(res, updated);
});

// ── DELETE /api/notifications/:id ───────────────────────────
router.delete('/:id', async (req: AuthRequest, res) => {
  await prisma.notification.deleteMany({ where: { id: req.params.id, userId: req.user!.userId } });
  successResponse(res, { message: 'Notification deleted' });
});

// ── POST /api/notifications — admin/teacher broadcast ────────
// Targeting options (pick one):
//   userIds: string[]          — explicit list (original behaviour)
//   targetAll: true            — all active users
//   targetRole: Role           — all users of that role
//   targetSubjectId: string    — enrolled students + teachers of that subject
router.post('/', requireRole(Role.ADMIN, Role.TEACHER), async (req: AuthRequest, res) => {
  const {
    title, body, type, link,
    userIds, targetAll, targetRole, targetSubjectId,
  } = req.body as {
    title: string; body: string; type?: string; link?: string;
    userIds?: string[]; targetAll?: boolean;
    targetRole?: 'ADMIN' | 'TEACHER' | 'STUDENT';
    targetSubjectId?: string;
  };

  if (!title || !body) { errorResponse(res, 'title and body are required', 400); return; }

  let resolvedIds: string[] = [];

  if (targetAll) {
    const users = await prisma.user.findMany({ where: { status: 'ACTIVE', NOT: { id: req.user!.userId } }, select: { id: true } });
    resolvedIds = users.map((u) => u.id);
  } else if (targetRole) {
    if (!['ADMIN', 'TEACHER', 'STUDENT'].includes(targetRole)) {
      errorResponse(res, 'targetRole must be ADMIN, TEACHER, or STUDENT', 400); return;
    }
    const users = await prisma.user.findMany({
      where: { role: targetRole as Role, status: 'ACTIVE', NOT: { id: req.user!.userId } },
      select: { id: true },
    });
    resolvedIds = users.map((u) => u.id);
  } else if (targetSubjectId) {
    const [enrollments, teachers] = await Promise.all([
      prisma.studentSubject.findMany({ where: { subjectId: targetSubjectId }, select: { userId: true } }),
      prisma.subjectTeacher.findMany({ where: { subjectId: targetSubjectId }, select: { teacherId: true } }),
    ]);
    const ids = new Set<string>([
      ...enrollments.map((e) => e.userId),
      ...teachers.map((t) => t.teacherId),
    ]);
    ids.delete(req.user!.userId); // don't notify yourself
    resolvedIds = Array.from(ids);
  } else if (Array.isArray(userIds) && userIds.length > 0) {
    resolvedIds = userIds;
  } else {
    errorResponse(res, 'Provide one of: userIds, targetAll, targetRole, or targetSubjectId', 400); return;
  }

  if (resolvedIds.length === 0) {
    successResponse(res, { created: 0 }); return;
  }

  const notifType = type ?? 'info';

  const result = await prisma.notification.createMany({
    data: resolvedIds.map((uid) => ({ userId: uid, title, body, type: notifType, link })),
  });

  try {
    const io = getIo();
    resolvedIds.forEach((uid) => pushNotification(io, uid, { title, body, type: notifType, link }));
  } catch { /* socket may not be ready */ }

  successResponse(res, { created: result.count }, 201);
});

export default router;
