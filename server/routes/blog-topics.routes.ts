import { Router } from 'express';
import { Prisma, Role, type BlogTopic } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.middleware.js';
import { successResponse, errorResponse } from '../utils/response.utils.js';
import { validate } from '../middleware/validate.middleware.js';
import { UpdateTopicSchema } from '../schemas/validation.schemas.js';
import { logAudit } from '../utils/audit.utils.js';

// Content-engine topic queue. Mounted at /api/blog/topics (BEFORE /api/blog so
// these paths aren't captured by the public GET /api/blog/:slug handler).
const router = Router();

// All routes here are for the content agent / admins only.
router.use(authenticate, requireRole(Role.ADMIN, Role.TEACHER));

// ─── List topics (optionally by status) ───────────────────────
// GET /api/blog/topics?status=QUEUED
router.get('/', async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const where: Prisma.BlogTopicWhereInput = status
    ? { status: status as BlogTopic['status'] }
    : {};
  const topics = await prisma.blogTopic.findMany({
    where,
    orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    include: { post: { select: { id: true, slug: true, status: true } } },
  });
  successResponse(res, topics);
});

// ─── Atomically claim the next topic to draft ─────────────────
// POST /api/blog/topics/claim-next
// Picks the highest-priority QUEUED topic, flips it to DRAFTING, and returns it.
// FOR UPDATE SKIP LOCKED makes this safe even if two runs overlap.
// Returns { data: null } when the queue is empty (the workflow treats this as "nothing to do").
router.post('/claim-next', async (req: AuthRequest, res) => {
  try {
    const claimed = await prisma.$queryRaw<BlogTopic[]>(Prisma.sql`
      UPDATE "BlogTopic"
      SET status = 'DRAFTING'::"TopicStatus", "updatedAt" = NOW()
      WHERE id = (
        SELECT id FROM "BlogTopic"
        WHERE status = 'QUEUED'::"TopicStatus"
        ORDER BY priority ASC, "createdAt" ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *;
    `);

    const topic = claimed[0] ?? null;
    if (topic) logAudit(req, 'CLAIM', 'BlogTopic', topic.id, { topicTitle: topic.topicTitle });
    successResponse(res, topic);
  } catch (err) {
    console.error('[POST /blog/topics/claim-next]', err);
    errorResponse(res, 'Failed to claim a topic', 500);
  }
});

// ─── Update a topic (report draft result / error) ─────────────
// PATCH /api/blog/topics/:id
router.patch('/:id', validate(UpdateTopicSchema), async (req: AuthRequest, res) => {
  try {
    const existing = await prisma.blogTopic.findUnique({ where: { id: req.params.id } });
    if (!existing) { errorResponse(res, 'Topic not found', 404); return; }

    const b = req.body as Record<string, unknown>;
    const data: Prisma.BlogTopicUpdateInput = {};

    if (b.notes !== undefined)     data.notes = (b.notes as string) || null;
    if (b.lastError !== undefined) data.lastError = (b.lastError as string) || null;
    if (b.postId !== undefined)    data.post = b.postId ? { connect: { id: b.postId as string } } : { disconnect: true };

    if (b.status !== undefined) {
      const next = b.status as BlogTopic['status'];
      data.status = next;
      // stamp draftedAt the first time a draft is produced
      if (next === 'DRAFTED' && !existing.draftedAt) data.draftedAt = new Date();
    }

    const topic = await prisma.blogTopic.update({ where: { id: req.params.id }, data });
    logAudit(req, 'UPDATE', 'BlogTopic', topic.id, { status: topic.status });
    successResponse(res, topic);
  } catch (err) {
    console.error('[PATCH /blog/topics/:id]', err);
    errorResponse(res, 'Failed to update topic', 500);
  }
});

export default router;
