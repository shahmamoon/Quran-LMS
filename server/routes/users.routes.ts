import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.middleware.js';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response.utils.js';
import { sendWelcomeEmail, sendPasswordResetEmail } from '../services/email.service.js';
import { validate } from '../middleware/validate.middleware.js';
import { CreateUserSchema } from '../schemas/validation.schemas.js';
import { logAudit } from '../utils/audit.utils.js';
import { env } from '../config/env.js';
import { Role, UserStatus } from '@prisma/client';

const router = Router();
router.use(authenticate);

const baseSelect = {
  id: true, email: true, firstName: true, lastName: true, role: true,
  avatarUrl: true, bio: true, phone: true, grade: true, status: true, emailVerified: true,
  lastSeenAt: true, createdAt: true, updatedAt: true,
};

const loginUrl = `${env.CLIENT_URL}/lms/login`;

// GET /api/users/teachers/overview — Admin: each teacher with their subjects + assigned students
router.get('/teachers/overview', requireRole(Role.ADMIN), async (_req, res) => {
  const teachers = await prisma.user.findMany({
    where: { role: Role.TEACHER, status: UserStatus.ACTIVE },
    select: {
      id: true, firstName: true, lastName: true, email: true, avatarUrl: true, phone: true,
      teachingSubjects: {
        select: {
          subject: { select: { id: true, title: true, color: true } },
        },
        orderBy: { assignedAt: 'asc' },
      },
      assignedStudents: {
        distinct: ['userId'],
        select: {
          user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        },
      },
    },
    orderBy: { firstName: 'asc' },
  });
  successResponse(res, teachers);
});

// GET /api/users — ADMIN sees all; TEACHER can only query students
router.get('/', async (req: AuthRequest, res) => {
  const isAdmin = req.user?.role === Role.ADMIN;
  const isTeacher = req.user?.role === Role.TEACHER;
  if (!isAdmin && !isTeacher) { errorResponse(res, 'Forbidden', 403); return; }

  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 50;
  const requestedRole = req.query.role as Role | undefined;
  const requestedStatus = req.query.status as UserStatus | undefined;
  const search = req.query.search as string | undefined;
  const includeParam = ((req.query.include as string) || '').split(',');
  const includeSubjects = includeParam.includes('subjects');
  const includeGroups = includeParam.includes('groups');

  // Teachers can only view students assigned to them
  const effectiveRole = isTeacher ? Role.STUDENT : requestedRole;

  // Status filter: teachers always see only ACTIVE students; admins can filter by status (default: all non-archived)
  const effectiveStatus = isTeacher
    ? UserStatus.ACTIVE
    : requestedStatus ?? undefined;

  const where = {
    // Admin: if no status filter, show ACTIVE + SUSPENDED (hide archived by default; archived tab is explicit)
    ...(isAdmin && !requestedStatus ? { status: { not: UserStatus.ARCHIVED } } : {}),
    ...(effectiveStatus ? { status: effectiveStatus } : {}),
    ...(effectiveRole ? { role: effectiveRole } : {}),
    // Teachers only see students assigned to them:
    // - explicitly via StudentSubject.teacherId, OR
    // - enrolled in a subject the teacher teaches (fallback for enrollments without a teacher assignment)
    ...(isTeacher
      ? {
          enrolledSubjects: {
            some: {
              OR: [
                { teacherId: req.user!.userId },
                {
                  teacherId: null,
                  subject: { teachers: { some: { teacherId: req.user!.userId } } },
                },
              ],
            },
          },
        }
      : {}),
    ...(search
      ? {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' as const } },
            { lastName: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };

  const select = {
    ...baseSelect,
    ...(includeSubjects
      ? {
          enrolledSubjects: {
            select: {
              subjectId: true,
              enrolledAt: true,
              teacherId: true,
              subject: { select: { id: true, title: true, color: true } },
              teacher: { select: { id: true, firstName: true, lastName: true } },
            },
          },
        }
      : {}),
    ...(includeGroups
      ? {
          groupMemberships: {
            select: {
              groupId: true,
              joinedAt: true,
              group: { select: { id: true, name: true } },
            },
          },
        }
      : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, select, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.user.count({ where }),
  ]);

  paginatedResponse(res, users, total, page, limit);
});

// POST /api/users — create user and send welcome email
router.post('/', requireRole(Role.ADMIN), validate(CreateUserSchema), async (req, res) => {
  const { email, password, firstName, lastName, role, bio, phone, grade } = req.body as Record<string, string>;

  const exists = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (exists) { errorResponse(res, 'Email already in use', 409); return; }

  const effectiveRole = (role as Role) ?? Role.STUDENT;
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase().trim(), passwordHash, firstName, lastName,
      role: effectiveRole, bio,
      phone: phone?.trim() || null,
      // Only store grade for students
      grade: effectiveRole === Role.STUDENT ? (grade?.trim() || null) : null,
    },
    select: baseSelect,
  });

  // Send welcome email (non-blocking — don't fail the request if email fails)
  sendWelcomeEmail({
    to: user.email,
    firstName: user.firstName,
    role: user.role,
    password, // plain-text password before hashing — only available here
    loginUrl,
  }).catch((err) => console.error('Welcome email failed:', err));

  logAudit(req, 'CREATE', 'User', user.id, { role: effectiveRole });
  successResponse(res, user, 201);
});

// GET /api/users/:id
router.get('/:id', async (req: AuthRequest, res) => {
  const { id } = req.params;
  if (req.user?.role !== Role.ADMIN && req.user?.userId !== id) {
    errorResponse(res, 'Forbidden', 403); return;
  }
  const user = await prisma.user.findUnique({ where: { id }, select: baseSelect });
  if (!user) { errorResponse(res, 'User not found', 404); return; }
  successResponse(res, user);
});

// PUT /api/users/:id — update profile
router.put('/:id', async (req: AuthRequest, res) => {
  const { id } = req.params;
  if (req.user?.role !== Role.ADMIN && req.user?.userId !== id) {
    errorResponse(res, 'Forbidden', 403); return;
  }
  const { firstName, lastName, bio, avatarUrl, phone } = req.body as Record<string, string | undefined>;
  const user = await prisma.user.update({
    where: { id },
    data: { firstName, lastName, bio, avatarUrl, phone: phone?.trim() || null },
    select: baseSelect,
  });
  successResponse(res, user);
});

// POST /api/users/:id/reset-password — admin resets a user's password
router.post('/:id/reset-password', requireRole(Role.ADMIN), async (req, res) => {
  const { newPassword } = req.body as { newPassword: string };
  if (!newPassword || newPassword.length < 6) {
    errorResponse(res, 'newPassword must be at least 6 characters', 400); return;
  }

  const user = await prisma.user.findUnique({ where: { id: req.params.id }, select: baseSelect });
  if (!user) { errorResponse(res, 'User not found', 404); return; }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: req.params.id }, data: { passwordHash } });

  // Notify the user by email
  sendPasswordResetEmail({
    to: user.email,
    firstName: user.firstName,
    newPassword,
    loginUrl,
  }).catch((err) => console.error('Password reset email failed:', err));

  logAudit(req, 'RESET_PASSWORD', 'User', req.params.id);
  successResponse(res, { message: 'Password updated and notification email sent' });
});

// PUT /api/users/:id/change-password — user changes their own password
router.put('/:id/change-password', async (req: AuthRequest, res) => {
  const { id } = req.params;
  // Only the user themselves can change their own password (admin uses reset-password instead)
  if (req.user?.userId !== id) {
    errorResponse(res, 'Forbidden', 403); return;
  }

  const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };
  if (!currentPassword || !newPassword) {
    errorResponse(res, 'currentPassword and newPassword are required', 400); return;
  }
  if (newPassword.length < 6) {
    errorResponse(res, 'newPassword must be at least 6 characters', 400); return;
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) { errorResponse(res, 'User not found', 404); return; }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) { errorResponse(res, 'Current password is incorrect', 400); return; }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id }, data: { passwordHash } });

  successResponse(res, { message: 'Password changed successfully' });
});

// PATCH /api/users/:id/status — admin changes a user's status (ACTIVE / SUSPENDED / ARCHIVED)
router.patch('/:id/status', requireRole(Role.ADMIN), async (req, res) => {
  const { status } = req.body as { status?: UserStatus };
  if (!status || !Object.values(UserStatus).includes(status)) {
    errorResponse(res, 'status must be ACTIVE, SUSPENDED, or ARCHIVED', 400); return;
  }

  const target = await prisma.user.findUnique({ where: { id: req.params.id }, select: { id: true, status: true, role: true } });
  if (!target) { errorResponse(res, 'User not found', 404); return; }

  // Prevent admins from archiving/suspending themselves
  if ((req as AuthRequest).user?.userId === req.params.id && status !== UserStatus.ACTIVE) {
    errorResponse(res, 'You cannot change your own status', 422); return;
  }

  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data: { status },
    select: baseSelect,
  });
  logAudit(req, 'UPDATE_STATUS', 'User', req.params.id, { from: target.status, to: status });
  successResponse(res, updated);
});

// DELETE /api/users/:id — hard delete; blocked if the user has any dependent records
router.delete('/:id', requireRole(Role.ADMIN), async (req, res) => {
  const { id } = req.params;

  // Prevent self-delete
  if ((req as AuthRequest).user?.userId === id) {
    errorResponse(res, 'You cannot delete your own account', 422); return;
  }

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
  if (!target) { errorResponse(res, 'User not found', 404); return; }

  // Check all dependent records in parallel
  const [
    enrollments, payments, sessions, lessonProgress,
    quranProgress, qaidaProgress, recitationSessions,
    quranBookmarks, qaidaBookmarks, islamicBookmarks,
    qaidaNotes,
  ] = await Promise.all([
    prisma.studentSubject.count({ where: { userId: id } }),
    prisma.payment.count({ where: { studentId: id } }),
    prisma.sessionAttendance.count({ where: { userId: id } }),
    prisma.lessonProgress.count({ where: { userId: id } }),
    prisma.quranStudentProgress.count({ where: { studentId: id } }),
    prisma.qaidaStudentProgress.count({ where: { studentId: id } }),
    prisma.recitationSession.count({ where: { OR: [{ studentId: id }, { teacherId: id }] } }),
    prisma.quranBookmark.count({ where: { OR: [{ studentId: id }, { teacherId: id }] } }),
    prisma.qaidaBookmark.count({ where: { OR: [{ studentId: id }, { teacherId: id }] } }),
    prisma.islamicBookmark.count({ where: { OR: [{ studentId: id }, { teacherId: id }] } }),
    prisma.qaidaLessonNote.count({ where: { OR: [{ studentId: id }, { teacherId: id }] } }),
  ]);

  const total = enrollments + payments + sessions + lessonProgress +
    quranProgress + qaidaProgress + recitationSessions +
    quranBookmarks + qaidaBookmarks + islamicBookmarks + qaidaNotes;

  if (total > 0) {
    errorResponse(res, 'User has linked records. Archive the user instead.', 409); return;
  }

  await prisma.user.delete({ where: { id } });
  logAudit(req, 'DELETE', 'User', id, { role: target.role });
  successResponse(res, { message: 'User permanently deleted' });
});

// PATCH /api/users/:id/grade — admin updates a student's grade level
router.patch('/:id/grade', requireRole(Role.ADMIN), async (req, res) => {
  const { grade } = req.body as { grade?: string };

  const target = await prisma.user.findUnique({ where: { id: req.params.id }, select: { role: true } });
  if (!target) { errorResponse(res, 'User not found', 404); return; }
  if (target.role !== Role.STUDENT) { errorResponse(res, 'Grade can only be set on student accounts', 422); return; }

  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data: { grade: grade?.trim() || null },
    select: baseSelect,
  });
  logAudit(req, 'UPDATE', 'User', req.params.id, { grade: updated.grade });
  successResponse(res, updated);
});


// POST /api/users/:id/enroll — enroll student in subject
// GET /api/users/:id/subjects — subjects a student is enrolled in (staff or self)
router.get('/:id/subjects', async (req: AuthRequest, res) => {
  const requesterId = req.user!.userId;
  const role = req.user!.role;
  if (role === Role.STUDENT && requesterId !== req.params.id) {
    errorResponse(res, 'Forbidden', 403); return;
  }
  const enrollments = await prisma.studentSubject.findMany({
    where: { userId: req.params.id },
    include: { subject: { select: { id: true, title: true, color: true, isPublished: true } } },
    orderBy: { enrolledAt: 'asc' },
  });
  successResponse(res, enrollments.map(e => e.subject));
});

router.post('/:id/enroll', requireRole(Role.ADMIN, Role.TEACHER), async (req, res) => {
  const { subjectId } = req.body as { subjectId: string };
  // Guard: cannot enroll a suspended or archived user
  const target = await prisma.user.findUnique({ where: { id: req.params.id }, select: { status: true } });
  if (!target || target.status !== UserStatus.ACTIVE) { errorResponse(res, 'Cannot enroll a user who is not active', 422); return; }

  await prisma.studentSubject.upsert({
    where: { userId_subjectId: { userId: req.params.id, subjectId } },
    update: {},
    create: { userId: req.params.id, subjectId },
  });
  successResponse(res, { message: 'Enrolled' });
});

export default router;
