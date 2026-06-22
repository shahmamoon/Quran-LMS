import { Router } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.middleware.js';
import { successResponse } from '../utils/response.utils.js';

const router = Router();
router.use(authenticate);

export interface ActivityItem {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  createdAt: string;
  actor?: { firstName: string; lastName: string; avatarUrl: string | null } | null;
}

// ── GET /api/activity ────────────────────────────────────────
// Aggregates recent events from Notification, Message, Session, StudentSubject.
// Returns up to 20 items sorted by recency.
router.get('/', async (req: AuthRequest, res) => {
  const me = req.user!;
  const limit = 20;
  const items: ActivityItem[] = [];

  if (me.role === Role.STUDENT) {
    const [notifications, messages, sessions, enrollments] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: me.userId, archivedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      // Messages received (not sent by me) across my conversations
      prisma.message.findMany({
        where: {
          conversation: { participants: { some: { userId: me.userId } } },
          senderId: { not: me.userId },
          deletedAt: null,
        },
        include: { sender: { select: { firstName: true, lastName: true, avatarUrl: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      prisma.session.findMany({
        where: { attendances: { some: { userId: me.userId } } },
        include: { subject: { select: { title: true } } },
        orderBy: { scheduledAt: 'desc' },
        take: 5,
      }),
      prisma.studentSubject.findMany({
        where: { userId: me.userId },
        include: { subject: { select: { title: true, color: true } } },
        orderBy: { enrolledAt: 'desc' },
        take: 5,
      }),
    ]);

    notifications.forEach((n) => items.push({
      id: `notif:${n.id}`, type: n.type, title: n.title, body: n.body,
      link: n.link ?? '/lms/notifications', createdAt: n.createdAt.toISOString(),
    }));
    messages.forEach((m) => items.push({
      id: `msg:${m.id}`, type: 'message_received',
      title: `New message from ${m.sender.firstName} ${m.sender.lastName}`,
      body: m.content.length > 80 ? `${m.content.slice(0, 80)}…` : m.content,
      link: '/lms/chat', createdAt: m.createdAt.toISOString(),
      actor: m.sender,
    }));
    sessions.forEach((s) => items.push({
      id: `session:${s.id}`, type: 'session_scheduled',
      title: `Class: ${s.title}`,
      body: `${s.subject?.title ?? ''} · ${new Date(s.scheduledAt).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
      link: '/lms/sessions', createdAt: s.createdAt.toISOString(),
    }));
    enrollments.forEach((e) => items.push({
      id: `enroll:${e.userId}:${e.subjectId}`, type: 'course_enrolled',
      title: `Enrolled in ${e.subject.title}`,
      body: 'You have been enrolled in a new course.',
      link: `/lms/subjects/${e.subjectId}`, createdAt: e.enrolledAt.toISOString(),
    }));
  } else if (me.role === Role.TEACHER) {
    const [notifications, messages, sessions, studentCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: me.userId, archivedAt: null },
        orderBy: { createdAt: 'desc' }, take: 8,
      }),
      prisma.message.findMany({
        where: {
          conversation: { participants: { some: { userId: me.userId } } },
          senderId: { not: me.userId }, deletedAt: null,
        },
        include: { sender: { select: { firstName: true, lastName: true, avatarUrl: true } } },
        orderBy: { createdAt: 'desc' }, take: 5,
      }),
      prisma.session.findMany({
        where: { OR: [{ hostId: me.userId }, { attendances: { some: { userId: me.userId } } }] },
        include: { subject: { select: { title: true } } },
        orderBy: { scheduledAt: 'desc' }, take: 5,
      }),
      prisma.studentSubject.count({ where: { teacherId: me.userId } }),
    ]);

    notifications.forEach((n) => items.push({
      id: `notif:${n.id}`, type: n.type, title: n.title, body: n.body,
      link: n.link ?? '/lms/notifications', createdAt: n.createdAt.toISOString(),
    }));
    messages.forEach((m) => items.push({
      id: `msg:${m.id}`, type: 'message_received',
      title: `Message from ${m.sender.firstName} ${m.sender.lastName}`,
      body: m.content.length > 80 ? `${m.content.slice(0, 80)}…` : m.content,
      link: '/lms/chat', createdAt: m.createdAt.toISOString(), actor: m.sender,
    }));
    sessions.forEach((s) => items.push({
      id: `session:${s.id}`, type: 'session_scheduled',
      title: `Class: ${s.title}`,
      body: `${s.subject?.title ?? ''} · ${new Date(s.scheduledAt).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
      link: '/lms/sessions', createdAt: s.createdAt.toISOString(),
    }));
    if (studentCount > 0) items.push({
      id: `students:${me.userId}`, type: 'info',
      title: `${studentCount} student${studentCount !== 1 ? 's' : ''} assigned`,
      body: 'View your student roster on the Students page.',
      link: '/lms/students', createdAt: new Date(0).toISOString(),
    });
  } else {
    // ADMIN — academy-wide view
    const [notifications, messages, recentUsers, sessions] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: me.userId, archivedAt: null },
        orderBy: { createdAt: 'desc' }, take: 8,
      }),
      prisma.message.findMany({
        where: {
          conversation: { participants: { some: { userId: me.userId } } },
          senderId: { not: me.userId }, deletedAt: null,
        },
        include: { sender: { select: { firstName: true, lastName: true, avatarUrl: true } } },
        orderBy: { createdAt: 'desc' }, take: 5,
      }),
      prisma.user.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' }, take: 5,
        select: { id: true, firstName: true, lastName: true, role: true, createdAt: true, avatarUrl: true },
      }),
      prisma.session.findMany({
        orderBy: { scheduledAt: 'desc' }, take: 5,
        include: { subject: { select: { title: true } } },
      }),
    ]);

    notifications.forEach((n) => items.push({
      id: `notif:${n.id}`, type: n.type, title: n.title, body: n.body,
      link: n.link ?? '/lms/notifications', createdAt: n.createdAt.toISOString(),
    }));
    messages.forEach((m) => items.push({
      id: `msg:${m.id}`, type: 'message_received',
      title: `Message from ${m.sender.firstName} ${m.sender.lastName}`,
      body: m.content.length > 80 ? `${m.content.slice(0, 80)}…` : m.content,
      link: '/lms/chat', createdAt: m.createdAt.toISOString(), actor: m.sender,
    }));
    recentUsers.forEach((u) => items.push({
      id: `user:${u.id}`, type: 'user_joined',
      title: `${u.firstName} ${u.lastName} joined`,
      body: `Role: ${u.role.charAt(0) + u.role.slice(1).toLowerCase()}`,
      link: '/lms/users', createdAt: u.createdAt.toISOString(),
      actor: { firstName: u.firstName, lastName: u.lastName, avatarUrl: u.avatarUrl },
    }));
    sessions.forEach((s) => items.push({
      id: `session:${s.id}`, type: 'session_scheduled',
      title: `Session: ${s.title}`,
      body: `${s.subject?.title ?? ''} · ${new Date(s.scheduledAt).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
      link: '/lms/sessions', createdAt: s.createdAt.toISOString(),
    }));
  }

  // Deduplicate by id, sort by recency, cap at limit
  const seen = new Set<string>();
  const result = items
    .filter((i) => { if (seen.has(i.id)) return false; seen.add(i.id); return true; })
    .filter((i) => i.createdAt !== new Date(0).toISOString())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);

  // Always append persistent "footer" items at the bottom if we have room
  const footerItems = items.filter((i) => i.createdAt === new Date(0).toISOString());
  const combined = [...result, ...footerItems].slice(0, limit);

  successResponse(res, combined);
});

export default router;
