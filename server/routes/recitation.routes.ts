import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { successResponse, errorResponse } from '../utils/response.utils.js';
import { logAudit } from '../utils/audit.utils.js';
import {
  CreateRecitationSessionSchema,
  UpdateRecitationSessionSchema,
  CreatePageAttemptSchema,
  UpdatePageAttemptSchema,
} from '../schemas/validation.schemas.js';
import { Role } from '@prisma/client';

const router = Router();
router.use(authenticate);

// ── Reference data ──────────────────────────────────────────────────────────

// GET /api/recitation/pages
// Returns all 604 pages — used to render the Mushaf grid on the teacher/student UI.
router.get('/pages', async (_req, res) => {
  const pages = await prisma.quranPage.findMany({ orderBy: { pageNumber: 'asc' } });
  successResponse(res, pages);
});

// GET /api/recitation/rules
// Returns all Tajweed rules — used to populate the error-logging dropdowns.
router.get('/rules', async (_req, res) => {
  const rules = await prisma.tajweedRule.findMany({ orderBy: { category: 'asc' } });
  successResponse(res, rules);
});

// ── Sessions ───────────────────────────────────────────────────────────────

// POST /api/recitation/sessions
// ADMIN or TEACHER — schedule a new recitation session for a student.
router.post(
  '/sessions',
  requireRole(Role.ADMIN, Role.TEACHER),
  validate(CreateRecitationSessionSchema),
  async (req: AuthRequest, res) => {
    const { studentId, scheduledAt, zoomSessionId, trackType, overallNotes } = req.body;

    const student = await prisma.user.findFirst({
      where: { id: studentId, status: 'ACTIVE', role: Role.STUDENT },
    });
    if (!student) {
      errorResponse(res, 'Student not found or inactive', 404);
      return;
    }

    const teacherId = req.user!.userId;

    const session = await prisma.recitationSession.create({
      data: {
        studentId,
        teacherId,
        scheduledAt: new Date(scheduledAt),
        zoomSessionId: zoomSessionId ?? null,
        trackType: trackType ?? 'RECITATION',
        overallNotes: overallNotes ?? null,
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    logAudit(req, 'CREATE', 'RecitationSession', session.id, { studentId });
    successResponse(res, session, 201);
  },
);

// GET /api/recitation/sessions
// ADMIN: all sessions. TEACHER: only their sessions. STUDENT: only their sessions.
router.get('/sessions', async (req: AuthRequest, res) => {
  const { role, userId } = req.user!;
  const { studentId, status } = req.query;

  const VALID_STATUSES = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
  if (status && !VALID_STATUSES.includes(status as string)) {
    errorResponse(res, 'Invalid status filter', 400); return;
  }

  const where: Record<string, unknown> = {};
  if (role === Role.TEACHER) where.teacherId = userId;
  if (role === Role.STUDENT) where.studentId = userId;
  if (studentId && role !== Role.STUDENT) where.studentId = studentId;
  if (status) where.status = status;

  const sessions = await prisma.recitationSession.findMany({
    where,
    orderBy: { scheduledAt: 'desc' },
    include: {
      student: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      teacher: { select: { id: true, firstName: true, lastName: true } },
      _count:  { select: { attempts: true } },
    },
  });
  successResponse(res, sessions);
});

// GET /api/recitation/sessions/:id
router.get('/sessions/:id', async (req: AuthRequest, res) => {
  const { role, userId } = req.user!;
  const session = await prisma.recitationSession.findUnique({
    where: { id: req.params.id },
    include: {
      student: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      teacher: { select: { id: true, firstName: true, lastName: true } },
      attempts: {
        orderBy: { attemptOrder: 'asc' },
        include: {
          page:   { select: { pageNumber: true, juzNumber: true, surahNameEn: true, surahNameAr: true, ayahStart: true } },
          errors: { include: { rule: true } },
        },
      },
    },
  });

  if (!session) { errorResponse(res, 'Session not found', 404); return; }

  // Students can only see their own sessions
  if (role === Role.STUDENT && session.studentId !== userId) {
    errorResponse(res, 'Forbidden', 403);
    return;
  }
  // Teachers can only see sessions they own
  if (role === Role.TEACHER && session.teacherId !== userId) {
    errorResponse(res, 'Forbidden', 403);
    return;
  }

  successResponse(res, session);
});

// PATCH /api/recitation/sessions/:id
// ADMIN or owning TEACHER — update status, notes, timing.
// Closing a session (→ COMPLETED) triggers a materialized view refresh.
router.patch(
  '/sessions/:id',
  requireRole(Role.ADMIN, Role.TEACHER),
  validate(UpdateRecitationSessionSchema),
  async (req: AuthRequest, res) => {
    const { role, userId } = req.user!;

    const session = await prisma.recitationSession.findUnique({ where: { id: req.params.id } });
    if (!session) { errorResponse(res, 'Session not found', 404); return; }

    if (role === Role.TEACHER && session.teacherId !== userId) {
      errorResponse(res, 'Forbidden', 403);
      return;
    }

    const { status, startedAt, endedAt, durationMins, overallNotes, audioUrl } = req.body;

    const updated = await prisma.recitationSession.update({
      where: { id: req.params.id },
      data: {
        ...(status !== undefined && { status }),
        ...(startedAt !== undefined && { startedAt: startedAt ? new Date(startedAt) : null }),
        ...(endedAt !== undefined && { endedAt: endedAt ? new Date(endedAt) : null }),
        ...(durationMins !== undefined && { durationMins }),
        ...(overallNotes !== undefined && { overallNotes }),
        ...(audioUrl !== undefined && { audioUrl }),
      },
    });

    // Refresh the materialized view when a session is completed so the
    // progress grid reflects the new data. Fire-and-forget — don't block response.
    if (status === 'COMPLETED') {
      prisma.$executeRaw`SELECT refresh_student_page_progress()`.catch(e =>
        console.error('MV refresh after session COMPLETED failed:', e)
      );
    }

    logAudit(req, 'UPDATE', 'RecitationSession', updated.id, { status });
    successResponse(res, updated);
  },
);

// DELETE /api/recitation/sessions/:id  (ADMIN only — hard delete)
router.delete(
  '/sessions/:id',
  requireRole(Role.ADMIN),
  async (req: AuthRequest, res) => {
    const session = await prisma.recitationSession.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { attempts: true } } },
    });
    if (!session) { errorResponse(res, 'Session not found', 404); return; }

    if (session._count.attempts > 0) {
      errorResponse(res, 'Cannot delete a session that has logged attempts', 400);
      return;
    }

    await prisma.recitationSession.delete({ where: { id: req.params.id } });
    await prisma.$executeRaw`SELECT refresh_student_page_progress()`;
    logAudit(req, 'DELETE', 'RecitationSession', req.params.id, {});
    successResponse(res, { id: req.params.id });
  },
);

// ── Page Attempts ───────────────────────────────────────────────────────────

// POST /api/recitation/sessions/:id/attempts
// ADMIN or owning TEACHER — log a page attempt (with optional Tajweed errors).
router.post(
  '/sessions/:id/attempts',
  requireRole(Role.ADMIN, Role.TEACHER),
  validate(CreatePageAttemptSchema),
  async (req: AuthRequest, res) => {
    const { role, userId } = req.user!;

    const session = await prisma.recitationSession.findUnique({ where: { id: req.params.id } });
    if (!session) { errorResponse(res, 'Session not found', 404); return; }
    if (role === Role.TEACHER && session.teacherId !== userId) {
      errorResponse(res, 'Forbidden', 403);
      return;
    }
    if (session.status === 'CANCELLED' || session.status === 'COMPLETED') {
      errorResponse(res, 'Cannot add attempts to a closed session', 400);
      return;
    }

    // Validate page exists
    const page = await prisma.quranPage.findUnique({ where: { pageNumber: req.body.pageNumber } });
    if (!page) { errorResponse(res, `Page ${req.body.pageNumber} not found`, 404); return; }

    // Validate all rule IDs if errors provided
    if (req.body.errors?.length) {
      const ruleIds = req.body.errors.map((e: { ruleId: string }) => e.ruleId);
      const rules = await prisma.tajweedRule.findMany({ where: { id: { in: ruleIds } } });
      if (rules.length !== new Set(ruleIds).size) {
        errorResponse(res, 'One or more Tajweed rule IDs are invalid', 400);
        return;
      }
    }

    // attemptOrder = max current order + 1 (so it's always the next in the session)
    const lastAttempt = await prisma.pageAttempt.findFirst({
      where: { sessionId: req.params.id },
      orderBy: { attemptOrder: 'desc' },
    });
    const attemptOrder = (lastAttempt?.attemptOrder ?? 0) + 1;

    const { pageNumber, status, masteryScore, teacherNotes, errors } = req.body;

    const attempt = await prisma.pageAttempt.create({
      data: {
        sessionId:    req.params.id,
        studentId:    session.studentId,
        teacherId:    session.teacherId,
        pageNumber,
        attemptOrder,
        status,
        masteryScore:  masteryScore ?? null,
        teacherNotes:  teacherNotes ?? null,
        errors: {
          create: (errors ?? []).map((e: {
            ruleId: string;
            ayahNumber?: number | null;
            wordNumber?: number | null;
            severity: string;
            note?: string | null;
          }) => ({
            ruleId:     e.ruleId,
            ayahNumber: e.ayahNumber ?? null,
            wordNumber: e.wordNumber ?? null,
            severity:   e.severity,
            note:       e.note ?? null,
          })),
        },
      },
      include: {
        page:   { select: { pageNumber: true, juzNumber: true, surahNameEn: true, surahNameAr: true } },
        errors: { include: { rule: true } },
      },
    });

    logAudit(req, 'CREATE', 'PageAttempt', attempt.id, { pageNumber, sessionId: req.params.id });
    successResponse(res, attempt, 201);
  },
);

// GET /api/recitation/sessions/:id/attempts
// Returns all attempts in a session ordered by attemptOrder.
router.get('/sessions/:id/attempts', async (req: AuthRequest, res) => {
  const { role, userId } = req.user!;

  const session = await prisma.recitationSession.findUnique({ where: { id: req.params.id } });
  if (!session) { errorResponse(res, 'Session not found', 404); return; }

  if (role === Role.STUDENT && session.studentId !== userId) {
    errorResponse(res, 'Forbidden', 403); return;
  }
  if (role === Role.TEACHER && session.teacherId !== userId) {
    errorResponse(res, 'Forbidden', 403); return;
  }

  const attempts = await prisma.pageAttempt.findMany({
    where:   { sessionId: req.params.id },
    orderBy: { attemptOrder: 'asc' },
    include: {
      page:   { select: { pageNumber: true, juzNumber: true, surahNameEn: true, surahNameAr: true, ayahStart: true } },
      errors: { include: { rule: true } },
    },
  });
  successResponse(res, attempts);
});

// PATCH /api/recitation/attempts/:attemptId
// ADMIN or owning teacher — correct a mistake on a logged attempt.
// Errors are NOT editable here — delete and re-log the attempt if needed.
router.patch(
  '/attempts/:attemptId',
  requireRole(Role.ADMIN, Role.TEACHER),
  validate(UpdatePageAttemptSchema),
  async (req: AuthRequest, res) => {
    const { role, userId } = req.user!;

    const attempt = await prisma.pageAttempt.findUnique({
      where:   { id: req.params.attemptId },
      include: { session: true },
    });
    if (!attempt) { errorResponse(res, 'Attempt not found', 404); return; }

    if (role === Role.TEACHER && attempt.session.teacherId !== userId) {
      errorResponse(res, 'Forbidden', 403); return;
    }

    if (attempt.session.status === 'CANCELLED') {
      errorResponse(res, 'Cannot modify attempts in a cancelled session', 400); return;
    }

    const { status, masteryScore, teacherNotes } = req.body;

    const updated = await prisma.pageAttempt.update({
      where: { id: req.params.attemptId },
      data: {
        ...(status !== undefined && { status }),
        ...(masteryScore !== undefined && { masteryScore }),
        ...(teacherNotes !== undefined && { teacherNotes }),
      },
      include: { page: true, errors: { include: { rule: true } } },
    });

    // Refresh the MV so edited status/score is immediately visible in the progress grid.
    // Fire and forget — don't let a refresh failure roll back the update.
    prisma.$executeRaw`SELECT refresh_student_page_progress()`.catch(e =>
      console.error('MV refresh after attempt PATCH failed:', e)
    );

    logAudit(req, 'UPDATE', 'PageAttempt', updated.id, { status, masteryScore });
    successResponse(res, updated);
  },
);

// ── Progress ────────────────────────────────────────────────────────────────

// GET /api/recitation/progress/:studentId
// Returns the materialized view rows for this student — the 604-page map data.
// ADMIN / TEACHER: any student. STUDENT: own only.
router.get('/progress/:studentId', async (req: AuthRequest, res) => {
  const { role, userId } = req.user!;
  const { studentId } = req.params;

  if (role === Role.STUDENT && studentId !== userId) {
    errorResponse(res, 'Forbidden', 403); return;
  }

  // Read from the materialized view via raw query (Prisma doesn't model views)
  const rows = await prisma.$queryRaw<Array<{
    studentId:      string;
    pageNumber:     number;
    juzNumber:      number;
    surahNameEn:    string;
    surahNameAr:    string;
    currentStatus:  string | null;
    masteryScore:   number | null;
    attemptCount:   bigint;
    firstTaughtAt:  Date | null;
    lastTaughtAt:   Date | null;
    majorErrorCount: bigint;
  }>>`
    SELECT
      "studentId",
      "pageNumber",
      "juzNumber",
      "surahNameEn",
      "surahNameAr",
      "currentStatus",
      "masteryScore",
      "attemptCount",
      "firstTaughtAt",
      "lastTaughtAt",
      "majorErrorCount"
    FROM student_page_progress
    WHERE "studentId" = ${studentId}
    ORDER BY "pageNumber" ASC
  `;

  // Convert BigInt (Postgres COUNT) to Number for JSON serialization
  const data = rows.map(r => ({
    ...r,
    attemptCount:    Number(r.attemptCount),
    majorErrorCount: Number(r.majorErrorCount),
  }));

  successResponse(res, data);
});

// GET /api/recitation/progress/:studentId/summary
// Aggregated stats: pages per status, pages per juz, top error rules.
// Useful for the dashboard widget without sending 604 rows.
router.get('/progress/:studentId/summary', async (req: AuthRequest, res) => {
  const { role, userId } = req.user!;
  const { studentId } = req.params;

  if (role === Role.STUDENT && studentId !== userId) {
    errorResponse(res, 'Forbidden', 403); return;
  }
  if (role === Role.TEACHER) {
    const linked = await prisma.recitationSession.findFirst({ where: { studentId, teacherId: userId } });
    if (!linked) { errorResponse(res, 'Forbidden', 403); return; }
  }

  // Status breakdown
  const statusCounts = await prisma.$queryRaw<Array<{ currentStatus: string | null; count: bigint }>>`
    SELECT "currentStatus", COUNT(*) AS count
    FROM student_page_progress
    WHERE "studentId" = ${studentId}
    GROUP BY "currentStatus"
  `;

  // Juz breakdown (how many pages covered per juz)
  const juzCounts = await prisma.$queryRaw<Array<{ juzNumber: number; pagesWorked: bigint }>>`
    SELECT "juzNumber", COUNT(*) AS "pagesWorked"
    FROM student_page_progress
    WHERE "studentId" = ${studentId}
    GROUP BY "juzNumber"
    ORDER BY "juzNumber"
  `;

  // Top 5 Tajweed error rules across all attempts for this student
  const topErrors = await prisma.pageError.groupBy({
    by: ['ruleId'],
    where: { attempt: { studentId } },
    _count: { ruleId: true },
    orderBy: { _count: { ruleId: 'desc' } },
    take: 5,
  });

  const ruleIds = topErrors.map(e => e.ruleId);
  const rules = await prisma.tajweedRule.findMany({ where: { id: { in: ruleIds } } });
  const ruleMap = new Map(rules.map(r => [r.id, r]));

  const topErrorsWithRule = topErrors
    .map(e => ({ rule: ruleMap.get(e.ruleId), count: e._count.ruleId }))
    .filter((e): e is { rule: NonNullable<typeof e.rule>; count: number } => e.rule !== undefined);

  // Pages needing review (NEEDS_REVIEW status)
  const needsReview = await prisma.$queryRaw<Array<{ pageNumber: number; surahNameEn: string; lastTaughtAt: Date }>>`
    SELECT "pageNumber", "surahNameEn", "lastTaughtAt"
    FROM student_page_progress
    WHERE "studentId" = ${studentId}
      AND "currentStatus" = 'NEEDS_REVIEW'
    ORDER BY "lastTaughtAt" ASC
  `;

  successResponse(res, {
    statusBreakdown: statusCounts.map(r => ({ status: r.currentStatus, count: Number(r.count) })),
    juzBreakdown:    juzCounts.map(r => ({ juzNumber: r.juzNumber, pagesWorked: Number(r.pagesWorked) })),
    topErrors:       topErrorsWithRule,
    needsReview,
    totalPagesWorked: statusCounts.reduce((sum, r) => sum + Number(r.count), 0),
  });
});

// GET /api/recitation/progress/:studentId/page/:pageNumber
// Full drill-down: all historical attempts for one student on one page.
router.get('/progress/:studentId/page/:pageNumber', async (req: AuthRequest, res) => {
  const { role, userId } = req.user!;
  const { studentId, pageNumber } = req.params;

  if (role === Role.STUDENT && studentId !== userId) {
    errorResponse(res, 'Forbidden', 403); return;
  }
  if (role === Role.TEACHER) {
    const linked = await prisma.recitationSession.findFirst({ where: { studentId, teacherId: userId } });
    if (!linked) { errorResponse(res, 'Forbidden', 403); return; }
  }

  const pn = parseInt(pageNumber);
  if (isNaN(pn) || pn < 1 || pn > 604) {
    errorResponse(res, 'pageNumber must be 1–604', 400); return;
  }

  const [page, attempts] = await Promise.all([
    prisma.quranPage.findUnique({ where: { pageNumber: pn } }),
    prisma.pageAttempt.findMany({
      where:   { studentId, pageNumber: pn },
      orderBy: { createdAt: 'asc' },
      include: {
        session: { select: { id: true, scheduledAt: true, status: true } },
        teacher: { select: { id: true, firstName: true, lastName: true } },
        errors:  { include: { rule: true }, orderBy: { severity: 'asc' } },
      },
    }),
  ]);

  if (!page) { errorResponse(res, 'Page not found', 404); return; }

  successResponse(res, { page, attempts });
});

export default router;
