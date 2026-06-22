import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.middleware.js';
import { successResponse, errorResponse } from '../utils/response.utils.js';
import { validate } from '../middleware/validate.middleware.js';
import { CreateGroupSchema } from '../schemas/validation.schemas.js';
import { Role } from '@prisma/client';

const router = Router();
router.use(authenticate);

// GET /api/groups
router.get('/', async (req: AuthRequest, res) => {
  const where = req.user?.role === Role.STUDENT
    ? { members: { some: { userId: req.user.userId } } }
    : req.user?.role === Role.TEACHER
    ? { createdById: req.user.userId }
    : {};

  const groups = await prisma.group.findMany({
    where,
    include: {
      _count: { select: { members: true } },
      members: {
        include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true } } },
        take: 8,
      },
      subjects: { include: { subject: { select: { id: true, title: true, color: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });
  successResponse(res, groups);
});

// POST /api/groups
router.post('/', requireRole(Role.ADMIN, Role.TEACHER), validate(CreateGroupSchema), async (req, res) => {
  const { name, description, subjectIds, memberIds } = req.body as {
    name: string; description?: string; subjectIds?: string[]; memberIds?: string[];
  };

  const group = await prisma.group.create({
    data: {
      name,
      description,
      createdById: (req as AuthRequest).user?.userId,
      subjects: subjectIds ? { create: subjectIds.map((id) => ({ subjectId: id })) } : undefined,
      members: memberIds ? { create: memberIds.map((id) => ({ userId: id })) } : undefined,
    },
    include: { _count: { select: { members: true } } },
  });
  successResponse(res, group, 201);
});

// GET /api/groups/:id
router.get('/:id', async (req, res) => {
  const group = await prisma.group.findUnique({
    where: { id: req.params.id },
    include: {
      members: { include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true } } } },
      subjects: { include: { subject: { select: { id: true, title: true, color: true } } } },
    },
  });
  if (!group) { errorResponse(res, 'Group not found', 404); return; }
  successResponse(res, group);
});

// PUT /api/groups/:id
router.put('/:id', requireRole(Role.ADMIN, Role.TEACHER), async (req, res) => {
  const { name, description } = req.body as { name?: string; description?: string };
  const group = await prisma.group.update({ where: { id: req.params.id }, data: { name, description } });
  successResponse(res, group);
});

// DELETE /api/groups/:id
router.delete('/:id', requireRole(Role.ADMIN, Role.TEACHER), async (req, res) => {
  await prisma.group.delete({ where: { id: req.params.id } });
  successResponse(res, { message: 'Group deleted' });
});

// POST /api/groups/:id/members
router.post('/:id/members', requireRole(Role.ADMIN, Role.TEACHER), async (req, res) => {
  const { userId } = req.body as { userId: string };
  // Guard: cannot add a deactivated user to a group
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { status: true } });
  if (!target || target.status !== 'ACTIVE') { errorResponse(res, 'Cannot add a user who is not active to a group', 422); return; }

  await prisma.groupMember.upsert({
    where: { groupId_userId: { groupId: req.params.id, userId } },
    update: {},
    create: { groupId: req.params.id, userId },
  });
  successResponse(res, { message: 'Member added' });
});

// DELETE /api/groups/:id/members/:userId
router.delete('/:id/members/:userId', requireRole(Role.ADMIN, Role.TEACHER), async (req, res) => {
  await prisma.groupMember.deleteMany({ where: { groupId: req.params.id, userId: req.params.userId } });
  successResponse(res, { message: 'Member removed' });
});

export default router;
