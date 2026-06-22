import { Router } from 'express';
import { prisma } from '../config/prisma.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.middleware.js';
import { successResponse, errorResponse } from '../utils/response.utils.js';
import { validate } from '../middleware/validate.middleware.js';
import { CreateSubjectSchema } from '../schemas/validation.schemas.js';
import { Role, CourseType, EnrollmentStatus } from '@prisma/client';

const router = Router();
router.use(authenticate);

const teacherSelect = {
  id: true, firstName: true, lastName: true, email: true, avatarUrl: true,
};

// GET /api/subjects
router.get('/', async (req: AuthRequest, res) => {
  // Explicit role branches — the fallback is intentionally forbidden so new
  // roles don't silently inherit access to all subjects.
  let where: Record<string, unknown>;
  if (req.user?.role === Role.TEACHER) {
    where = { teachers: { some: { teacherId: req.user.userId } } };
  } else if (req.user?.role === Role.STUDENT) {
    where = { enrollments: { some: { userId: req.user.userId } } };
  } else if (req.user?.role === Role.ADMIN) {
    where = {}; // Admins see all subjects — intentional
  } else {
    errorResponse(res, 'Forbidden', 403); return;
  }

  // Optional ?type= filter (NOORANI_QAIDA | QURAN_LEARNING | ISLAMIC_LEARNING)
  const { type } = req.query;
  if (type && Object.values(CourseType).includes(type as CourseType)) {
    where = { ...where, courseType: type as CourseType };
  }

  const subjects = await prisma.subject.findMany({
    where,
    include: {
      teachers: { include: { teacher: { select: teacherSelect } }, orderBy: { assignedAt: 'asc' } },
      _count: { select: { weeks: true, enrollments: true } },
    },
    orderBy: [{ isPublished: 'desc' }, { createdAt: 'asc' }],
  });
  successResponse(res, subjects);
});

// POST /api/subjects
router.post('/', requireRole(Role.ADMIN, Role.TEACHER), validate(CreateSubjectSchema), async (req: AuthRequest, res) => {
  try {
    const { title, description, thumbnailUrl, color } = req.body as Record<string, string | undefined>;
    let { teacherIds } = req.body as { teacherIds?: string[] };

    if (!title) { errorResponse(res, 'title is required', 400); return; }

    // Teachers auto-assign themselves; admins must supply at least one teacherId
    if (req.user?.role === Role.TEACHER) {
      teacherIds = [req.user.userId];
    }

    if (!teacherIds || teacherIds.length === 0) {
      errorResponse(res, 'At least one teacher must be assigned', 400); return;
    }

    const { grade, courseType } = req.body as { grade?: string; courseType?: CourseType | null };
    const subject = await prisma.subject.create({
      data: {
        title,
        description,
        thumbnailUrl,
        color: color ?? '#0e91e9',
        grade: grade?.trim() || null,
        courseType: courseType ?? null,
        teachers: { create: teacherIds.map((id) => ({ teacherId: id })) },
      },
      include: {
        teachers: { include: { teacher: { select: teacherSelect } }, orderBy: { assignedAt: 'asc' } },
      },
    });
    successResponse(res, subject, 201);
  } catch (err) {
    console.error('[POST /subjects]', err);
    errorResponse(res, 'Failed to create subject', 500);
  }
});

// GET /api/subjects/:id
router.get('/:id', async (req, res) => {
  const subject = await prisma.subject.findUnique({
    where: { id: req.params.id },
    include: {
      teachers: { include: { teacher: { select: teacherSelect } }, orderBy: { assignedAt: 'asc' } },
      weeks: { include: { lessons: { orderBy: { order: 'asc' } } }, orderBy: { order: 'asc' } },
      _count: { select: { enrollments: true } },
    },
  });
  if (!subject) { errorResponse(res, 'Subject not found', 404); return; }
  successResponse(res, subject);
});

// PUT /api/subjects/:id — update details and/or reassign teachers
router.put('/:id', requireRole(Role.ADMIN, Role.TEACHER), async (req: AuthRequest, res) => {
  try {
    const { title, description, thumbnailUrl, color, isPublished, grade, courseType } = req.body as Record<string, unknown>;
    const { teacherIds } = req.body as { teacherIds?: string[] };

    // Build scalar update (only fields that were sent)
    const data: Record<string, unknown> = {};
    if (title !== undefined)       data.title       = title;
    if (description !== undefined) data.description = description;
    if (thumbnailUrl !== undefined) data.thumbnailUrl = thumbnailUrl;
    if (color !== undefined)       data.color       = color;
    if (isPublished !== undefined) data.isPublished  = isPublished;
    if (grade !== undefined)       data.grade       = (grade as string)?.trim() || null;
    if (courseType !== undefined)  data.courseType  = courseType || null;

    // If teacherIds provided, sync the junction table
    if (teacherIds && teacherIds.length > 0) {
      await prisma.subjectTeacher.deleteMany({ where: { subjectId: req.params.id } });
      data.teachers = { create: teacherIds.map((id: string) => ({ teacherId: id })) };
    }

    const subject = await prisma.subject.update({
      where: { id: req.params.id },
      data,
      include: {
        teachers: { include: { teacher: { select: teacherSelect } }, orderBy: { assignedAt: 'asc' } },
      },
    });
    successResponse(res, subject);
  } catch (err) {
    console.error('[PUT /subjects/:id]', err);
    errorResponse(res, 'Failed to update subject', 500);
  }
});

// DELETE /api/subjects/:id
// Blocked if students are enrolled or teachers are assigned — caller must remove them first.
router.delete('/:id', requireRole(Role.ADMIN), async (req, res) => {
  try {
    const { id } = req.params;

    const [studentCount, teacherCount] = await Promise.all([
      prisma.studentSubject.count({ where: { subjectId: id } }),
      prisma.subjectTeacher.count({ where: { subjectId: id } }),
    ]);

    if (studentCount > 0 || teacherCount > 0) {
      const parts: string[] = [];
      if (studentCount > 0) parts.push(`${studentCount} enrolled student${studentCount !== 1 ? 's' : ''}`);
      if (teacherCount > 0) parts.push(`${teacherCount} assigned teacher${teacherCount !== 1 ? 's' : ''}`);
      return errorResponse(
        res,
        `This course has ${parts.join(' and ')}. Please remove all assignments before deleting.`,
        409,
      );
    }

    await prisma.subject.delete({ where: { id } });
    successResponse(res, { message: 'Course deleted' });
  } catch (err: any) {
    if (err.code === 'P2025') return errorResponse(res, 'Course not found', 404);
    errorResponse(res, 'Failed to delete course', 500);
  }
});

// DELETE /api/subjects/:id/teachers/:teacherId — remove one teacher assignment (Admin only)
router.delete('/:id/teachers/:teacherId', requireRole(Role.ADMIN), async (req, res) => {
  try {
    await prisma.subjectTeacher.delete({
      where: { subjectId_teacherId: { subjectId: req.params.id, teacherId: req.params.teacherId } },
    });
    successResponse(res, { message: 'Teacher removed' });
  } catch (err: any) {
    if (err.code === 'P2025') return errorResponse(res, 'Teacher assignment not found', 404);
    errorResponse(res, 'Failed to remove teacher', 500);
  }
});

// GET /api/subjects/:id/enrollments — list enrolled students (staff only)
router.get('/:id/enrollments', requireRole(Role.ADMIN, Role.TEACHER), async (req: AuthRequest, res) => {
  const enrollments = await prisma.studentSubject.findMany({
    where: { subjectId: req.params.id },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true, grade: true } },
      teacher: { select: { id: true, firstName: true, lastName: true } },
      enrolledBy: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { enrolledAt: 'desc' },
  });
  successResponse(res, enrollments);
});

// POST /api/subjects/:id/enroll
router.post('/:id/enroll', requireRole(Role.ADMIN, Role.TEACHER), async (req: AuthRequest, res) => {
  const { userId, teacherId } = req.body as { userId: string; teacherId?: string };
  // Guard: cannot enroll a deactivated user
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { status: true, role: true } });
  if (!target || target.status !== 'ACTIVE') { errorResponse(res, 'Cannot enroll a user who is not active', 422); return; }
  if (target.role !== Role.STUDENT) { errorResponse(res, 'Can only enroll students', 422); return; }

  const enrollment = await prisma.studentSubject.upsert({
    where: { userId_subjectId: { userId, subjectId: req.params.id } },
    update: {
      status: EnrollmentStatus.ACTIVE,
      ...(teacherId ? { teacherId } : {}),
    },
    create: {
      userId,
      subjectId: req.params.id,
      teacherId: teacherId ?? null,
      enrolledById: req.user!.userId,
      status: EnrollmentStatus.ACTIVE,
    },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true, grade: true } },
    },
  });
  successResponse(res, enrollment, 201);
});

// PATCH /api/subjects/:id/enroll/:userId — update enrollment status
router.patch('/:id/enroll/:userId', requireRole(Role.ADMIN, Role.TEACHER), async (req, res) => {
  const { status, completedAt } = req.body as { status?: EnrollmentStatus; completedAt?: string | null };
  if (status && !Object.values(EnrollmentStatus).includes(status)) {
    errorResponse(res, 'Invalid status', 400); return;
  }

  try {
    const enrollment = await prisma.studentSubject.update({
      where: { userId_subjectId: { userId: req.params.userId, subjectId: req.params.id } },
      data: {
        ...(status ? { status } : {}),
        ...(completedAt !== undefined ? { completedAt: completedAt ? new Date(completedAt) : null } : {}),
        ...(status === EnrollmentStatus.COMPLETED && !completedAt ? { completedAt: new Date() } : {}),
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
    successResponse(res, enrollment);
  } catch (e: any) {
    if (e.code === 'P2025') { errorResponse(res, 'Enrollment not found', 404); return; }
    errorResponse(res, 'Failed to update enrollment', 500);
  }
});

// DELETE /api/subjects/:id/enroll/:userId
router.delete('/:id/enroll/:userId', requireRole(Role.ADMIN, Role.TEACHER), async (req, res) => {
  await prisma.studentSubject.deleteMany({ where: { userId: req.params.userId, subjectId: req.params.id } });
  successResponse(res, { message: 'Student unenrolled' });
});

export default router;
