import { Router } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.middleware.js';
import { successResponse, errorResponse } from '../utils/response.utils.js';

const router = Router();
router.use(authenticate);

// Used with `select:` (not `include:`) because scalar fields can't appear in Prisma `include`
const participantSelect = {
  userId: true,
  lastReadAt: true,
  user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true, lastSeenAt: true } },
};

// ── Permission guard: can A chat with B? ──────────────────────
async function canChat(actorId: string, actorRole: Role, targetId: string): Promise<boolean> {
  // Fetch target role
  const target = await prisma.user.findUnique({ where: { id: targetId }, select: { role: true, status: true } });
  if (!target || target.status !== 'ACTIVE') return false;

  if (actorRole === Role.ADMIN) return true; // admin → anyone

  if (actorRole === Role.TEACHER) {
    if (target.role === Role.ADMIN) return true;
    if (target.role === Role.STUDENT) {
      // Teacher can only chat with their assigned students
      const enrollment = await prisma.studentSubject.findFirst({
        where: { userId: targetId, teacherId: actorId },
      });
      return !!enrollment;
    }
    return false; // Teacher ↔ Teacher not allowed
  }

  if (actorRole === Role.STUDENT) {
    if (target.role === Role.ADMIN) return true;
    if (target.role === Role.TEACHER) {
      // Student can only chat with their assigned teacher
      const enrollment = await prisma.studentSubject.findFirst({
        where: { userId: actorId, teacherId: targetId },
      });
      return !!enrollment;
    }
    return false; // Student ↔ Student not allowed
  }

  return false;
}

// ── GET /api/chat/available-users ────────────────────────────
// Returns the list of users the current user is allowed to start a DM with.
router.get('/available-users', async (req: AuthRequest, res) => {
  const me = req.user!;

  if (me.role === 'ADMIN') {
    const users = await prisma.user.findMany({
      where: { status: 'ACTIVE', NOT: { id: me.userId } },
      select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true, lastSeenAt: true },
      orderBy: [{ role: 'asc' }, { firstName: 'asc' }],
    });
    successResponse(res, users);
    return;
  }

  if (me.role === 'TEACHER') {
    const [admins, enrollments] = await Promise.all([
      prisma.user.findMany({
        where: { role: Role.ADMIN, status: 'ACTIVE' },
        select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true, lastSeenAt: true },
      }),
      prisma.studentSubject.findMany({
        where: { teacherId: me.userId },
        select: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true, lastSeenAt: true, status: true } } },
      }),
    ]);
    const students = enrollments
      .map((e) => e.user)
      .filter((u) => u.status === 'ACTIVE')
      .filter((u, i, arr) => arr.findIndex((x) => x.id === u.id) === i)
      .map(({ status: _s, ...u }) => u);
    successResponse(res, [...admins, ...students]);
    return;
  }

  // STUDENT — can chat with admin + their assigned teachers
  if (me.role === 'STUDENT') {
    const [admins, enrollments] = await Promise.all([
      prisma.user.findMany({
        where: { role: Role.ADMIN, status: 'ACTIVE' },
        select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true, lastSeenAt: true },
      }),
      prisma.studentSubject.findMany({
        where: { userId: me.userId, teacherId: { not: null } },
        select: { teacher: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true, lastSeenAt: true, status: true } } },
      }),
    ]);
    const teachers = enrollments
      .map((e) => e.teacher!)
      .filter(Boolean)
      .filter((u) => u.status === 'ACTIVE')
      .filter((u, i, arr) => arr.findIndex((x) => x.id === u.id) === i)
      .map(({ status: _s, ...u }) => u);
    successResponse(res, [...admins, ...teachers]);
    return;
  }

  successResponse(res, []);
});

// ── GET /api/chat/conversations ──────────────────────────────
router.get('/conversations', async (req: AuthRequest, res) => {
  const me = req.user!;
  const search = typeof req.query.search === 'string' ? req.query.search.toLowerCase().trim() : '';

  const conversations = await prisma.conversation.findMany({
    where: { participants: { some: { userId: me.userId } } },
    include: {
      participants: { select: participantSelect },
      messages: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: { sender: { select: { id: true, firstName: true, lastName: true } } },
      },
    },
    take: 100,
  });

  // Sort by last message time desc
  const sorted = conversations.sort((a, b) => {
    const ta = a.messages[0]?.createdAt ?? a.createdAt;
    const tb = b.messages[0]?.createdAt ?? b.createdAt;
    return new Date(tb).getTime() - new Date(ta).getTime();
  });

  // Apply client-side search filter (by participant name)
  const filtered = search
    ? sorted.filter((c) =>
        c.isGroup
          ? (c.name ?? '').toLowerCase().includes(search)
          : c.participants.some(
              (p) =>
                p.userId !== me.userId &&
                (`${p.user.firstName} ${p.user.lastName}`).toLowerCase().includes(search)
            )
      )
    : sorted;

  // Compute unread count per conversation in one parallel batch
  const withUnread = await Promise.all(
    filtered.map(async (c) => {
      const myPart = c.participants.find((p) => p.userId === me.userId);
      const lastReadAt = myPart?.lastReadAt ?? null;
      const unreadCount = await prisma.message.count({
        where: {
          conversationId: c.id,
          senderId: { not: me.userId },
          deletedAt: null,
          ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}),
        },
      });
      return { ...c, unreadCount };
    })
  );

  successResponse(res, withUnread);
});

// ── POST /api/chat/conversations ─────────────────────────────
router.post('/conversations', async (req: AuthRequest, res) => {
  const me = req.user!;
  const { participantIds, name, isGroup, groupId } = req.body as {
    participantIds: string[]; name?: string; isGroup?: boolean; groupId?: string;
  };

  if (!Array.isArray(participantIds) || participantIds.length === 0) {
    errorResponse(res, 'participantIds is required', 400); return;
  }

  const allParticipants = Array.from(new Set([me.userId, ...participantIds]));

  // Permission check for DMs (not group chats)
  if (!isGroup) {
    const targetId = participantIds[0];
    const allowed = await canChat(me.userId, me.role as Role, targetId);
    if (!allowed) {
      errorResponse(res, 'You are not permitted to start a conversation with this user', 403); return;
    }

    // Return existing DM if one exists
    const existing = await prisma.conversation.findFirst({
      where: {
        isGroup: false,
        AND: allParticipants.map((uid) => ({ participants: { some: { userId: uid } } })),
      },
      include: { participants: { select: participantSelect }, messages: { take: 0 } },
    });
    if (existing) { successResponse(res, { ...existing, unreadCount: 0 }); return; }
  }

  const conversation = await prisma.conversation.create({
    data: {
      name,
      isGroup: isGroup ?? false,
      groupId,
      participants: { create: allParticipants.map((uid) => ({ userId: uid })) },
    },
    include: { participants: { select: participantSelect }, messages: { take: 0 } },
  });
  successResponse(res, { ...conversation, unreadCount: 0 }, 201);
});

// ── PATCH /api/chat/conversations/:id/read ───────────────────
// Mark all messages in a conversation as read for the current user.
router.patch('/conversations/:id/read', async (req: AuthRequest, res) => {
  await prisma.conversationParticipant.updateMany({
    where: { conversationId: req.params.id, userId: req.user!.userId },
    data: { lastReadAt: new Date() },
  });
  successResponse(res, { ok: true });
});

// ── GET /api/chat/conversations/:id/messages ─────────────────
router.get('/conversations/:id/messages', async (req: AuthRequest, res) => {
  const me = req.user!;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 50;

  // Verify membership
  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId: req.params.id, userId: me.userId } },
  });
  if (!participant) { errorResponse(res, 'Conversation not found', 404); return; }

  const [messages, total] = await Promise.all([
    prisma.message.findMany({
      where: { conversationId: req.params.id, deletedAt: null },
      include: { sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.message.count({ where: { conversationId: req.params.id, deletedAt: null } }),
  ]);

  // Mark as read
  await prisma.conversationParticipant.updateMany({
    where: { conversationId: req.params.id, userId: me.userId },
    data: { lastReadAt: new Date() },
  });

  successResponse(res, { messages: messages.reverse(), total, page, limit });
});

// ── POST /api/chat/conversations/:id/messages ────────────────
router.post('/conversations/:id/messages', async (req: AuthRequest, res) => {
  const me = req.user!;
  const { content, type, fileUrl } = req.body as { content: string; type?: 'TEXT' | 'FILE'; fileUrl?: string };
  if (!content?.trim()) { errorResponse(res, 'content is required', 400); return; }

  // Verify membership
  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId: req.params.id, userId: me.userId } },
  });
  if (!participant) { errorResponse(res, 'Conversation not found', 404); return; }

  const message = await prisma.message.create({
    data: {
      conversationId: req.params.id,
      senderId: me.userId,
      content: content.trim(),
      type: type ?? 'TEXT',
      fileUrl,
    },
    include: { sender: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
  });

  // Update sender's lastReadAt so they don't count their own message as unread
  await prisma.conversationParticipant.updateMany({
    where: { conversationId: req.params.id, userId: me.userId },
    data: { lastReadAt: new Date() },
  });

  successResponse(res, message, 201);
});

// ── GET /api/chat/unread-total ───────────────────────────────
// Total unread messages across all conversations (for top-bar badge / mobile).
router.get('/unread-total', async (req: AuthRequest, res) => {
  const me = req.user!;
  const participations = await prisma.conversationParticipant.findMany({
    where: { userId: me.userId },
    select: { conversationId: true, lastReadAt: true },
  });

  let total = 0;
  await Promise.all(
    participations.map(async ({ conversationId, lastReadAt }) => {
      const count = await prisma.message.count({
        where: {
          conversationId,
          senderId: { not: me.userId },
          deletedAt: null,
          ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}),
        },
      });
      total += count;
    })
  );

  successResponse(res, { unread: total });
});

export default router;
