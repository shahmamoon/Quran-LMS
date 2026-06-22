import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.middleware.js';
import { successResponse, errorResponse } from '../utils/response.utils.js';
import { logAudit } from '../utils/audit.utils.js';
import { Role, QaidaProgressStatus } from '@prisma/client';
import { z } from 'zod';

const router = Router();
router.use(authenticate);

// ── Validation schemas ──────────────────────────────────────────────────────

const UpdateProgressSchema = z.object({
  currentPage:          z.number().int().min(1).optional(),
  completedPages:       z.array(z.number().int().min(1)).optional(),
  completionPercentage: z.number().min(0).max(100).optional(),
  status:               z.nativeEnum(QaidaProgressStatus).optional(),
  lastLessonDate:       z.string().datetime().optional().nullable(),
  teacherNotes:         z.string().max(4000).optional().nullable(),
  nextPage:             z.number().int().min(1).optional().nullable(),
  revisionRequired:     z.boolean().optional(),
});

const CreateBookmarkSchema = z.object({
  studentId:  z.string().min(1),
  bookId:     z.string().min(1),
  pageNumber: z.number().int().min(1),
  note:       z.string().max(1000).optional().nullable(),
});

const CreateNoteSchema = z.object({
  studentId:        z.string().min(1),
  bookId:           z.string().min(1),
  pageNumber:       z.number().int().min(1),
  lessonDate:       z.string().datetime(),
  note:             z.string().min(1).max(4000),
  nextPage:         z.number().int().min(1).optional().nullable(),
  revisionRequired: z.boolean().optional(),
});

const LogHistorySchema = z.object({
  studentId:  z.string().min(1),
  bookId:     z.string().min(1),
  pageNumber: z.number().int().min(1),
  lessonDate: z.string().datetime().optional(),
  note:       z.string().max(4000).optional().nullable(),
  nextPage:   z.number().int().min(1).optional().nullable(),
});

// ── Helper: verify student is active ────────────────────────────────────────

async function findStudent(studentId: string) {
  return prisma.user.findFirst({ where: { id: studentId, status: 'ACTIVE', role: Role.STUDENT } });
}

// ── Books (reference) ────────────────────────────────────────────────────────

// GET /api/qaida/books  —  list all active books (all roles)
router.get('/books', async (_req, res) => {
  const books = await prisma.qaidaBook.findMany({
    where:   { isActive: true },
    orderBy: { order: 'asc' },
  });
  successResponse(res, books);
});

// GET /api/qaida/books/:slug  —  single book by slug
router.get('/books/:slug', async (req, res) => {
  const book = await prisma.qaidaBook.findUnique({ where: { slug: req.params.slug } });
  if (!book) { errorResponse(res, 'Book not found', 404); return; }
  successResponse(res, book);
});

// ── Student progress ─────────────────────────────────────────────────────────

// GET /api/qaida/progress/:studentId/:bookId
router.get('/progress/:studentId/:bookId', async (req: AuthRequest, res) => {
  const { studentId, bookId } = req.params;
  const me = req.user!;

  if (me.role === Role.STUDENT && me.userId !== studentId) {
    errorResponse(res, 'Forbidden', 403); return;
  }

  const progress = await prisma.qaidaStudentProgress.findUnique({
    where:   { studentId_bookId: { studentId, bookId } },
    include: {
      teacher: { select: { id: true, firstName: true, lastName: true } },
      book:    { select: { id: true, slug: true, title: true, totalPages: true, imageFolder: true } },
    },
  });

  successResponse(res, progress ?? null);
});

// PUT /api/qaida/progress/:studentId/:bookId  —  upsert progress (staff only)
router.put(
  '/progress/:studentId/:bookId',
  requireRole(Role.ADMIN, Role.TEACHER),
  async (req: AuthRequest, res) => {
    const { studentId, bookId } = req.params;
    const me = req.user!;

    const parsed = UpdateProgressSchema.safeParse(req.body);
    if (!parsed.success) { errorResponse(res, parsed.error.errors[0].message, 400); return; }

    const student = await findStudent(studentId);
    if (!student) { errorResponse(res, 'Student not found', 404); return; }

    const book = await prisma.qaidaBook.findUnique({ where: { id: bookId } });
    if (!book) { errorResponse(res, 'Book not found', 404); return; }

    // Validate page is within book range
    if (parsed.data.currentPage && parsed.data.currentPage > book.totalPages) {
      errorResponse(res, `Page ${parsed.data.currentPage} exceeds book total (${book.totalPages})`, 400); return;
    }

    const data = { ...parsed.data, teacherId: me.userId, lastLessonDate: parsed.data.lastLessonDate ?? new Date().toISOString() };

    const progress = await prisma.qaidaStudentProgress.upsert({
      where:   { studentId_bookId: { studentId, bookId } },
      create:  { studentId, bookId, ...data },
      update:  data,
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true } },
        book:    { select: { id: true, slug: true, title: true, totalPages: true, imageFolder: true } },
      },
    });

    logAudit(req, 'UPDATE', 'QaidaStudentProgress', progress.id, { studentId, bookId });
    successResponse(res, progress);
  },
);

// GET /api/qaida/students  —  all students with their Qaida progress (staff only)
router.get(
  '/students',
  requireRole(Role.ADMIN, Role.TEACHER),
  async (req: AuthRequest, res) => {
    const me = req.user!;

    // Build filter: TEACHERs see only their own students (those they have progress records for)
    const progressWhere = me.role === Role.TEACHER ? { teacherId: me.userId } : {};

    const progress = await prisma.qaidaStudentProgress.findMany({
      where:   progressWhere,
      include: {
        student: { select: { id: true, firstName: true, lastName: true, email: true, grade: true } },
        book:    { select: { id: true, slug: true, title: true, totalPages: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    successResponse(res, progress);
  },
);

// ── Bookmarks ─────────────────────────────────────────────────────────────────

// GET /api/qaida/bookmarks/:studentId/:bookId
router.get('/bookmarks/:studentId/:bookId', async (req: AuthRequest, res) => {
  const { studentId, bookId } = req.params;
  const me = req.user!;

  if (me.role === Role.STUDENT && me.userId !== studentId) {
    errorResponse(res, 'Forbidden', 403); return;
  }

  const where =
    me.role === Role.ADMIN   ? { studentId, bookId } :
    me.role === Role.TEACHER ? { studentId, bookId, teacherId: me.userId } :
                               { studentId, bookId }; // STUDENT — all their own

  const bookmarks = await prisma.qaidaBookmark.findMany({
    where,
    include: { teacher: { select: { id: true, firstName: true, lastName: true } } },
    orderBy: { pageNumber: 'asc' },
  });

  successResponse(res, bookmarks);
});

// POST /api/qaida/bookmarks
router.post(
  '/bookmarks',
  requireRole(Role.ADMIN, Role.TEACHER),
  async (req: AuthRequest, res) => {
    const me = req.user!;
    const parsed = CreateBookmarkSchema.safeParse(req.body);
    if (!parsed.success) { errorResponse(res, parsed.error.errors[0].message, 400); return; }

    const { studentId, bookId, pageNumber, note } = parsed.data;

    const student = await findStudent(studentId);
    if (!student) { errorResponse(res, 'Student not found', 404); return; }

    const book = await prisma.qaidaBook.findUnique({ where: { id: bookId } });
    if (!book) { errorResponse(res, 'Book not found', 404); return; }

    if (pageNumber > book.totalPages) {
      errorResponse(res, `Page ${pageNumber} exceeds book total (${book.totalPages})`, 400); return;
    }

    const bookmark = await prisma.qaidaBookmark.create({
      data: { teacherId: me.userId, studentId, bookId, pageNumber, note: note ?? null },
      include: { teacher: { select: { id: true, firstName: true, lastName: true } } },
    });

    logAudit(req, 'CREATE', 'QaidaBookmark', bookmark.id, { studentId, bookId, pageNumber });
    successResponse(res, bookmark, 201);
  },
);

// DELETE /api/qaida/bookmarks/:id
router.delete(
  '/bookmarks/:id',
  requireRole(Role.ADMIN, Role.TEACHER),
  async (req: AuthRequest, res) => {
    const { id } = req.params;
    const me = req.user!;

    const bookmark = await prisma.qaidaBookmark.findUnique({ where: { id } });
    if (!bookmark) { errorResponse(res, 'Bookmark not found', 404); return; }

    if (me.role === Role.TEACHER && bookmark.teacherId !== me.userId) {
      errorResponse(res, 'Forbidden', 403); return;
    }

    await prisma.qaidaBookmark.delete({ where: { id } });
    logAudit(req, 'DELETE', 'QaidaBookmark', id, {});
    successResponse(res, { deleted: true });
  },
);

// ── Lesson notes ──────────────────────────────────────────────────────────────

// GET /api/qaida/notes/:studentId/:bookId
router.get('/notes/:studentId/:bookId', async (req: AuthRequest, res) => {
  const { studentId, bookId } = req.params;
  const me = req.user!;

  if (me.role === Role.STUDENT && me.userId !== studentId) {
    errorResponse(res, 'Forbidden', 403); return;
  }

  const notes = await prisma.qaidaLessonNote.findMany({
    where:   { studentId, bookId },
    include: { teacher: { select: { id: true, firstName: true, lastName: true } } },
    orderBy: { lessonDate: 'desc' },
    take:    50,
  });

  successResponse(res, notes);
});

// POST /api/qaida/notes
router.post(
  '/notes',
  requireRole(Role.ADMIN, Role.TEACHER),
  async (req: AuthRequest, res) => {
    const me = req.user!;
    const parsed = CreateNoteSchema.safeParse(req.body);
    if (!parsed.success) { errorResponse(res, parsed.error.errors[0].message, 400); return; }

    const { studentId, bookId, pageNumber, lessonDate, note, nextPage, revisionRequired } = parsed.data;

    const student = await findStudent(studentId);
    if (!student) { errorResponse(res, 'Student not found', 404); return; }

    const book = await prisma.qaidaBook.findUnique({ where: { id: bookId } });
    if (!book) { errorResponse(res, 'Book not found', 404); return; }

    const lessonNote = await prisma.qaidaLessonNote.create({
      data: {
        studentId,
        teacherId: me.userId,
        bookId,
        pageNumber,
        lessonDate: new Date(lessonDate),
        note,
        nextPage:         nextPage         ?? null,
        revisionRequired: revisionRequired ?? false,
      },
      include: { teacher: { select: { id: true, firstName: true, lastName: true } } },
    });

    logAudit(req, 'CREATE', 'QaidaLessonNote', lessonNote.id, { studentId, bookId, pageNumber });
    successResponse(res, lessonNote, 201);
  },
);

// DELETE /api/qaida/notes/:id  —  ADMIN or owning TEACHER
router.delete(
  '/notes/:id',
  requireRole(Role.ADMIN, Role.TEACHER),
  async (req: AuthRequest, res) => {
    const { id } = req.params;
    const me = req.user!;

    const note = await prisma.qaidaLessonNote.findUnique({ where: { id } });
    if (!note) { errorResponse(res, 'Note not found', 404); return; }

    if (me.role === Role.TEACHER && note.teacherId !== me.userId) {
      errorResponse(res, 'Forbidden', 403); return;
    }

    await prisma.qaidaLessonNote.delete({ where: { id } });
    logAudit(req, 'DELETE', 'QaidaLessonNote', id, {});
    successResponse(res, { deleted: true });
  },
);

// ── Lesson history ────────────────────────────────────────────────────────────

// GET /api/qaida/history/:studentId/:bookId  —  chronological history (last 30 entries)
router.get('/history/:studentId/:bookId', async (req: AuthRequest, res) => {
  const { studentId, bookId } = req.params;
  const me = req.user!;

  if (me.role === Role.STUDENT && me.userId !== studentId) {
    errorResponse(res, 'Forbidden', 403); return;
  }

  const history = await prisma.qaidaLessonHistory.findMany({
    where:   { studentId, bookId },
    include: { teacher: { select: { id: true, firstName: true, lastName: true } } },
    orderBy: { lessonDate: 'desc' },
    take:    30,
  });

  successResponse(res, history);
});

// POST /api/qaida/history  —  log a page taught (appended, never edited)
router.post(
  '/history',
  requireRole(Role.ADMIN, Role.TEACHER),
  async (req: AuthRequest, res) => {
    const me = req.user!;
    const parsed = LogHistorySchema.safeParse(req.body);
    if (!parsed.success) { errorResponse(res, parsed.error.errors[0].message, 400); return; }

    const { studentId, bookId, pageNumber, lessonDate, note, nextPage } = parsed.data;

    const student = await findStudent(studentId);
    if (!student) { errorResponse(res, 'Student not found', 404); return; }

    const book = await prisma.qaidaBook.findUnique({ where: { id: bookId } });
    if (!book) { errorResponse(res, 'Book not found', 404); return; }

    const entry = await prisma.qaidaLessonHistory.create({
      data: {
        studentId,
        teacherId:  me.userId,
        bookId,
        pageNumber,
        lessonDate: lessonDate ? new Date(lessonDate) : new Date(),
        note:       note    ?? null,
        nextPage:   nextPage ?? null,
      },
      include: { teacher: { select: { id: true, firstName: true, lastName: true } } },
    });

    logAudit(req, 'CREATE', 'QaidaLessonHistory', entry.id, { studentId, bookId, pageNumber });
    successResponse(res, entry, 201);
  },
);

// ── Dashboard summary ─────────────────────────────────────────────────────────

// GET /api/qaida/dashboard/student/:studentId  —  widget data for student dashboard
router.get('/dashboard/student/:studentId', async (req: AuthRequest, res) => {
  const { studentId } = req.params;
  const me = req.user!;

  if (me.role === Role.STUDENT && me.userId !== studentId) {
    errorResponse(res, 'Forbidden', 403); return;
  }

  const [progressList, recentHistory, latestNote] = await Promise.all([
    prisma.qaidaStudentProgress.findMany({
      where:   { studentId },
      include: { book: { select: { id: true, slug: true, title: true, totalPages: true } } },
    }),
    prisma.qaidaLessonHistory.findMany({
      where:   { studentId },
      orderBy: { lessonDate: 'desc' },
      take:    5,
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true } },
        book:    { select: { id: true, slug: true, title: true } },
      },
    }),
    prisma.qaidaLessonNote.findFirst({
      where:   { studentId },
      orderBy: { lessonDate: 'desc' },
      include: { teacher: { select: { id: true, firstName: true, lastName: true } } },
    }),
  ]);

  successResponse(res, { progress: progressList, recentHistory, latestNote });
});

// GET /api/qaida/dashboard/teacher  —  summary for teacher/admin dashboard
router.get(
  '/dashboard/teacher',
  requireRole(Role.ADMIN, Role.TEACHER),
  async (req: AuthRequest, res) => {
    const me = req.user!;
    const teacherFilter = me.role === Role.TEACHER ? { teacherId: me.userId } : {};

    const [allProgress, revisionRequired, recentHistory] = await Promise.all([
      prisma.qaidaStudentProgress.findMany({
        where:   teacherFilter,
        include: {
          student: { select: { id: true, firstName: true, lastName: true } },
          book:    { select: { id: true, slug: true, title: true, totalPages: true } },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.qaidaStudentProgress.findMany({
        where:   { ...teacherFilter, revisionRequired: true },
        include: { student: { select: { id: true, firstName: true, lastName: true } } },
      }),
      prisma.qaidaLessonHistory.findMany({
        where:   teacherFilter,
        orderBy: { lessonDate: 'desc' },
        take:    10,
        include: {
          student: { select: { id: true, firstName: true, lastName: true } },
          book:    { select: { id: true, slug: true, title: true } },
        },
      }),
    ]);

    successResponse(res, {
      totalStudents:     allProgress.length,
      revisionRequired:  revisionRequired.length,
      students:          allProgress,
      studentsNeedingRevision: revisionRequired,
      recentActivity:   recentHistory,
    });
  },
);

export default router;
