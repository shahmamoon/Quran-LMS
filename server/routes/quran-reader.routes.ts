import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.middleware.js';
import { successResponse, errorResponse } from '../utils/response.utils.js';
import { logAudit } from '../utils/audit.utils.js';
import { Role, LessonStatus } from '@prisma/client';
import { z } from 'zod';

const router = Router();
router.use(authenticate);

const UpdateProgressSchema = z.object({
  currentPage:    z.number().int().min(1).max(604).optional(),
  currentSurah:   z.number().int().min(1).max(114).optional().nullable(),
  currentAyah:    z.number().int().min(1).optional().nullable(),
  currentJuz:     z.number().int().min(1).max(30).optional().nullable(),
  lessonStatus:   z.nativeEnum(LessonStatus).optional(),
  teacherNotes:   z.string().max(4000).optional().nullable(),
  nextLessonPage: z.number().int().min(1).max(604).optional().nullable(),
  nextLessonAyah: z.number().int().min(1).optional().nullable(),
});

const CreateBookmarkSchema = z.object({
  studentId:   z.string().min(1),
  pageNumber:  z.number().int().min(1).max(604),
  surahNumber: z.number().int().min(1).max(114).optional().nullable(),
  ayahNumber:  z.number().int().min(1).optional().nullable(),
  note:        z.string().max(1000).optional().nullable(),
});

// ── Student progress ────────────────────────────────────────────────────────

// GET /api/quran-reader/progress/:studentId
router.get('/progress/:studentId', async (req: AuthRequest, res) => {
  const { studentId } = req.params;
  const me = req.user!;

  // Students can only view own; staff can view any
  if (me.role === Role.STUDENT && me.userId !== studentId) {
    errorResponse(res, 'Forbidden', 403); return;
  }

  const progress = await prisma.quranStudentProgress.findUnique({
    where: { studentId },
    include: {
      lastTeacher: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  successResponse(res, progress ?? null);
});

// PUT /api/quran-reader/progress/:studentId
// Only ADMIN/TEACHER can update student progress
router.put(
  '/progress/:studentId',
  requireRole(Role.ADMIN, Role.TEACHER),
  async (req: AuthRequest, res) => {
    const { studentId } = req.params;
    const me = req.user!;

    const parsed = UpdateProgressSchema.safeParse(req.body);
    if (!parsed.success) {
      errorResponse(res, parsed.error.errors[0].message, 400); return;
    }

    const student = await prisma.user.findFirst({
      where: { id: studentId, status: 'ACTIVE', role: Role.STUDENT },
    });
    if (!student) { errorResponse(res, 'Student not found', 404); return; }

    const data = { ...parsed.data, lastTeacherId: me.userId };

    const progress = await prisma.quranStudentProgress.upsert({
      where:  { studentId },
      create: { studentId, ...data },
      update: data,
      include: {
        lastTeacher: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    logAudit(req, 'UPDATE', 'QuranStudentProgress', progress.id, { studentId });
    successResponse(res, progress);
  },
);

// ── Bookmarks ────────────────────────────────────────────────────────────────

// GET /api/quran-reader/bookmarks/:studentId
// Returns bookmarks created by the calling teacher for this student (or all for ADMIN).
router.get('/bookmarks/:studentId', async (req: AuthRequest, res) => {
  const { studentId } = req.params;
  const me = req.user!;

  // Students can only view their own bookmarks (read-only)
  if (me.role === Role.STUDENT && me.userId !== studentId) {
    errorResponse(res, 'Forbidden', 403); return;
  }

  const where =
    me.role === Role.ADMIN
      ? { studentId }
      : me.role === Role.TEACHER
      ? { studentId, teacherId: me.userId }
      : { studentId }; // STUDENT — all their bookmarks

  const bookmarks = await prisma.quranBookmark.findMany({
    where,
    include: {
      teacher: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { pageNumber: 'asc' },
  });

  successResponse(res, bookmarks);
});

// POST /api/quran-reader/bookmarks
router.post(
  '/bookmarks',
  requireRole(Role.ADMIN, Role.TEACHER),
  async (req: AuthRequest, res) => {
    const me = req.user!;

    const parsed = CreateBookmarkSchema.safeParse(req.body);
    if (!parsed.success) {
      errorResponse(res, parsed.error.errors[0].message, 400); return;
    }

    const { studentId, pageNumber, surahNumber, ayahNumber, note } = parsed.data;

    const student = await prisma.user.findFirst({
      where: { id: studentId, status: 'ACTIVE', role: Role.STUDENT },
    });
    if (!student) { errorResponse(res, 'Student not found', 404); return; }

    // Verify page exists
    const page = await prisma.quranPage.findUnique({ where: { pageNumber } });
    if (!page) { errorResponse(res, 'Page not found', 404); return; }

    const bookmark = await prisma.quranBookmark.create({
      data: {
        teacherId: me.userId,
        studentId,
        pageNumber,
        surahNumber: surahNumber ?? null,
        ayahNumber:  ayahNumber  ?? null,
        note:        note        ?? null,
      },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    logAudit(req, 'CREATE', 'QuranBookmark', bookmark.id, { studentId, pageNumber });
    successResponse(res, bookmark, 201);
  },
);

// DELETE /api/quran-reader/bookmarks/:id
router.delete(
  '/bookmarks/:id',
  requireRole(Role.ADMIN, Role.TEACHER),
  async (req: AuthRequest, res) => {
    const { id } = req.params;
    const me = req.user!;

    const bookmark = await prisma.quranBookmark.findUnique({ where: { id } });
    if (!bookmark) { errorResponse(res, 'Bookmark not found', 404); return; }

    // Teachers can only delete their own bookmarks
    if (me.role === Role.TEACHER && bookmark.teacherId !== me.userId) {
      errorResponse(res, 'Forbidden', 403); return;
    }

    await prisma.quranBookmark.delete({ where: { id } });
    logAudit(req, 'DELETE', 'QuranBookmark', id, {});
    successResponse(res, { deleted: true });
  },
);

// ── Lesson history ────────────────────────────────────────────────────────────

// GET /api/quran-reader/history/:studentId
// Returns last 10 recitation sessions with attempt counts for lesson history
router.get('/history/:studentId', async (req: AuthRequest, res) => {
  const { studentId } = req.params;
  const me = req.user!;

  if (me.role === Role.STUDENT && me.userId !== studentId) {
    errorResponse(res, 'Forbidden', 403); return;
  }

  const sessions = await prisma.recitationSession.findMany({
    where: { studentId },
    orderBy: { scheduledAt: 'desc' },
    take: 10,
    include: {
      teacher: { select: { id: true, firstName: true, lastName: true } },
      attempts: {
        select: { pageNumber: true, status: true, masteryScore: true },
        orderBy: { attemptOrder: 'asc' },
      },
    },
  });

  successResponse(res, sessions);
});

export default router;
