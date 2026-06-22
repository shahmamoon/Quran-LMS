import { Router } from 'express';
import { randomUUID } from 'crypto';
import fs from 'fs';
import { prisma } from '../config/prisma.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.middleware.js';
import { successResponse, errorResponse } from '../utils/response.utils.js';
import { lessonUpload } from '../middleware/upload.middleware.js';
import { Role, Prisma } from '@prisma/client';

interface LessonAttachment {
  id: string;
  name: string;
  url: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
}

const router = Router();
router.use(authenticate);

// GET /api/curriculum/:subjectId/weeks
router.get('/:subjectId/weeks', async (req, res) => {
  const weeks = await prisma.week.findMany({
    where: { subjectId: req.params.subjectId },
    include: { lessons: { orderBy: { order: 'asc' } } },
    orderBy: { order: 'asc' },
  });
  successResponse(res, weeks);
});

// POST /api/curriculum/:subjectId/weeks
router.post('/:subjectId/weeks', requireRole(Role.ADMIN, Role.TEACHER), async (req, res) => {
  const { title, description } = req.body as { title: string; description?: string };
  const lastWeek = await prisma.week.findFirst({ where: { subjectId: req.params.subjectId }, orderBy: { order: 'desc' } });
  const week = await prisma.week.create({
    data: { subjectId: req.params.subjectId, title, description, order: (lastWeek?.order ?? 0) + 1 },
  });
  successResponse(res, week, 201);
});

// PUT /api/curriculum/weeks/:weekId
router.put('/weeks/:weekId', requireRole(Role.ADMIN, Role.TEACHER), async (req, res) => {
  const { title, description } = req.body as { title?: string; description?: string };
  const week = await prisma.week.update({ where: { id: req.params.weekId }, data: { title, description } });
  successResponse(res, week);
});

// DELETE /api/curriculum/weeks/:weekId
router.delete('/weeks/:weekId', requireRole(Role.ADMIN, Role.TEACHER), async (req, res) => {
  await prisma.week.delete({ where: { id: req.params.weekId } });
  successResponse(res, { message: 'Week deleted' });
});

// POST /api/curriculum/weeks/:weekId/lessons
router.post('/weeks/:weekId/lessons', requireRole(Role.ADMIN, Role.TEACHER), async (req, res) => {
  const { title, type, content, videoUrl, duration, objectives, resources } = req.body as Record<string, unknown>;
  const lastLesson = await prisma.lesson.findFirst({ where: { weekId: req.params.weekId }, orderBy: { order: 'desc' } });
  const lesson = await prisma.lesson.create({
    data: {
      weekId: req.params.weekId,
      title: title as string,
      type: (type as 'TEXT' | 'VIDEO' | 'QUIZ' | 'ASSIGNMENT') ?? 'TEXT',
      content: content as string,
      videoUrl: videoUrl as string,
      duration: duration as number,
      objectives: (objectives as string[]) ?? [],
      resources: resources as Prisma.InputJsonValue | undefined,
      order: (lastLesson?.order ?? 0) + 1,
    },
  });
  successResponse(res, lesson, 201);
});

// POST /api/curriculum/lessons/reorder — set a new order for lessons in a week
// Body: { weekId: string, lessonIds: string[] }  (lessonIds in the desired order)
// Declared BEFORE /lessons/:lessonId so "reorder" isn't captured as a lessonId.
router.post('/lessons/reorder', requireRole(Role.ADMIN, Role.TEACHER), async (req, res) => {
  const { weekId, lessonIds } = req.body as { weekId?: string; lessonIds?: string[] };
  if (!weekId || !Array.isArray(lessonIds) || lessonIds.length === 0) {
    errorResponse(res, 'weekId and lessonIds[] are required', 400); return;
  }

  // Validate every id belongs to this week (prevents cross-week tampering)
  const owned = await prisma.lesson.findMany({
    where: { weekId, id: { in: lessonIds } },
    select: { id: true },
  });
  if (owned.length !== lessonIds.length) {
    errorResponse(res, 'One or more lessons do not belong to this week', 400); return;
  }

  // Two-phase to respect @@unique([weekId, order]): first park at negative
  // offsets (no collision with existing 0..n), then assign final 0..n.
  await prisma.$transaction([
    ...lessonIds.map((id, i) =>
      prisma.lesson.update({ where: { id }, data: { order: -(i + 1) } })
    ),
    ...lessonIds.map((id, i) =>
      prisma.lesson.update({ where: { id }, data: { order: i } })
    ),
  ]);

  successResponse(res, { weekId, count: lessonIds.length });
});

// GET /api/curriculum/lessons/:lessonId
router.get('/lessons/:lessonId', async (req, res) => {
  const lesson = await prisma.lesson.findUnique({ where: { id: req.params.lessonId }, include: { week: { include: { subject: true } } } });
  if (!lesson) { errorResponse(res, 'Lesson not found', 404); return; }
  successResponse(res, lesson);
});

// PUT /api/curriculum/lessons/:lessonId
router.put('/lessons/:lessonId', requireRole(Role.ADMIN, Role.TEACHER), async (req, res) => {
  const { title, type, content, videoUrl, duration, isPublished, objectives, resources } = req.body as Record<string, unknown>;
  const lesson = await prisma.lesson.update({
    where: { id: req.params.lessonId },
    data: { title: title as string, type: type as 'TEXT' | 'VIDEO' | 'QUIZ' | 'ASSIGNMENT', content: content as string, videoUrl: videoUrl as string, duration: duration as number, isPublished: isPublished as boolean, objectives: objectives as string[], resources: resources as Prisma.InputJsonValue | undefined },
  });
  successResponse(res, lesson);
});

// DELETE /api/curriculum/lessons/:lessonId
router.delete('/lessons/:lessonId', requireRole(Role.ADMIN, Role.TEACHER), async (req, res) => {
  await prisma.lesson.delete({ where: { id: req.params.lessonId } });
  successResponse(res, { message: 'Lesson deleted' });
});

// POST /api/curriculum/lessons/:lessonId/complete — mark complete
// Staff may pass { userId } in the body to mark on behalf of a student.
router.post('/lessons/:lessonId/complete', async (req: AuthRequest, res) => {
  if (!req.user) { errorResponse(res, 'Unauthorized', 401); return; }
  const isStaff = req.user.role === Role.ADMIN || req.user.role === Role.TEACHER;
  const targetUserId = (isStaff && req.body?.userId) ? req.body.userId as string : req.user.userId;
  const progress = await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId: targetUserId, lessonId: req.params.lessonId } },
    update: {},
    create: { userId: targetUserId, lessonId: req.params.lessonId },
  });
  successResponse(res, progress, 201);
});

// DELETE /api/curriculum/lessons/:lessonId/complete — unmark
// Staff may pass { userId } in the body to unmark on behalf of a student.
router.delete('/lessons/:lessonId/complete', async (req: AuthRequest, res) => {
  if (!req.user) { errorResponse(res, 'Unauthorized', 401); return; }
  const isStaff = req.user.role === Role.ADMIN || req.user.role === Role.TEACHER;
  const targetUserId = (isStaff && req.body?.userId) ? req.body.userId as string : req.user.userId;
  await prisma.lessonProgress.deleteMany({ where: { userId: targetUserId, lessonId: req.params.lessonId } });
  successResponse(res, { message: 'Marked incomplete' });
});

// GET /api/curriculum/progress/:userId
router.get('/progress/:userId', async (req: AuthRequest, res) => {
  if (req.user?.role === Role.STUDENT && req.user.userId !== req.params.userId) {
    errorResponse(res, 'Forbidden', 403); return;
  }
  const completions = await prisma.lessonProgress.findMany({ where: { userId: req.params.userId } });
  successResponse(res, completions);
});

// GET /api/curriculum/:subjectId/students — students enrolled in a subject (staff only)
// Teachers only see their own students (teacherId = teacher.id)
router.get('/:subjectId/students', requireRole(Role.ADMIN, Role.TEACHER), async (req: AuthRequest, res) => {
  const isTeacher = req.user?.role === Role.TEACHER;
  const enrollments = await prisma.studentSubject.findMany({
    where: {
      subjectId: req.params.subjectId,
      ...(isTeacher ? { teacherId: req.user!.userId } : {}),
    },
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true },
      },
    },
    orderBy: { enrolledAt: 'asc' },
  });
  successResponse(res, enrollments);
});

// GET /api/curriculum/:subjectId/progress — all students' progress for a subject (staff only)
router.get('/:subjectId/progress', requireRole(Role.ADMIN, Role.TEACHER), async (req, res) => {
  // Get all lesson IDs for this subject
  const weeks = await prisma.week.findMany({
    where: { subjectId: req.params.subjectId },
    select: { lessons: { select: { id: true } } },
  });
  const lessonIds = weeks.flatMap((w) => w.lessons.map((l) => l.id));
  if (lessonIds.length === 0) { successResponse(res, []); return; }

  const progress = await prisma.lessonProgress.findMany({
    where: { lessonId: { in: lessonIds } },
    select: { userId: true, lessonId: true },
  });
  successResponse(res, progress);
});

// ── POST /api/curriculum/lessons/:lessonId/attachments ───────────────
// Teacher/admin uploads a file and appends it to lesson.resources
router.post(
  '/lessons/:lessonId/attachments',
  requireRole(Role.TEACHER, Role.ADMIN),
  lessonUpload.single('file'),
  async (req: AuthRequest, res) => {
    if (!req.file) { errorResponse(res, 'No file uploaded', 400); return; }

    const lesson = await prisma.lesson.findUnique({ where: { id: req.params.lessonId } });
    if (!lesson) {
      // remove the orphaned file
      fs.promises.unlink(req.file.path).catch(() => null);
      errorResponse(res, 'Lesson not found', 404); return;
    }

    const existing: LessonAttachment[] = Array.isArray(lesson.resources)
      ? (lesson.resources as unknown as LessonAttachment[])
      : [];

    const attachment: LessonAttachment = {
      id: randomUUID(),
      name: req.file.originalname,
      url: `/uploads/lesson-attachments/${req.file.filename}`,
      size: req.file.size,
      mimeType: req.file.mimetype,
      uploadedAt: new Date().toISOString(),
    };

    const updated = await prisma.lesson.update({
      where: { id: req.params.lessonId },
      data: { resources: [...existing, attachment] as unknown as Prisma.InputJsonValue },
    });

    successResponse(res, updated, 201);
  },
);

// ── DELETE /api/curriculum/lessons/:lessonId/attachments/:attachmentId
// Teacher/admin removes an attachment from lesson.resources and deletes the file
router.delete(
  '/lessons/:lessonId/attachments/:attachmentId',
  requireRole(Role.TEACHER, Role.ADMIN),
  async (req: AuthRequest, res) => {
    const lesson = await prisma.lesson.findUnique({ where: { id: req.params.lessonId } });
    if (!lesson) { errorResponse(res, 'Lesson not found', 404); return; }

    const existing: LessonAttachment[] = Array.isArray(lesson.resources)
      ? (lesson.resources as unknown as LessonAttachment[])
      : [];

    const toDelete = existing.find((a) => a.id === req.params.attachmentId);

    if (toDelete) {
      // Strip leading slash and resolve to absolute path
      const filePath = toDelete.url.replace(/^\//, '');
      fs.promises.unlink(filePath).catch(() => null);
    }

    const updated = await prisma.lesson.update({
      where: { id: req.params.lessonId },
      data: {
        resources: existing.filter((a) => a.id !== req.params.attachmentId) as unknown as Prisma.InputJsonValue,
      },
    });

    successResponse(res, updated);
  },
);

export default router;
