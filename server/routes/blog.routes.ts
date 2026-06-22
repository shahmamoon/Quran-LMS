import { Router } from 'express';
import { Prisma, Role } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.middleware.js';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response.utils.js';
import { validate } from '../middleware/validate.middleware.js';
import { CreatePostSchema, UpdatePostSchema } from '../schemas/validation.schemas.js';
import { logAudit } from '../utils/audit.utils.js';

const router = Router();

const authorSelect = { id: true, firstName: true, lastName: true, avatarUrl: true };

/** "How to Teach AI!" -> "how-to-teach-ai" */
function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '') // strip accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200) || 'post';
}

/** Ensure a slug is unique, appending -2, -3, … on collision. */
async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  let slug = base;
  let n = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.post.findUnique({ where: { slug }, select: { id: true } });
    if (!existing || existing.id === excludeId) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

// ─── PUBLIC: list published posts ─────────────────────────────
// GET /api/blog?page=1&limit=20&tag=ai-safety
router.get('/', async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const tag = typeof req.query.tag === 'string' ? req.query.tag : undefined;

  const where: Prisma.PostWhereInput = {
    status: 'PUBLISHED',
    publishedAt: { lte: new Date() },
    ...(tag ? { tags: { has: tag } } : {}),
  };

  const [posts, total] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { author: { select: authorSelect } },
    }),
    prisma.post.count({ where }),
  ]);
  paginatedResponse(res, posts, total, page, limit);
});

// ─── ADMIN: list ALL posts (incl. drafts) ─────────────────────
// Must be declared before GET /:slug so it isn't captured as a slug.
router.get('/admin/all', authenticate, requireRole(Role.ADMIN, Role.TEACHER), async (_req, res) => {
  const posts = await prisma.post.findMany({
    orderBy: [{ createdAt: 'desc' }],
    include: { author: { select: authorSelect } },
  });
  successResponse(res, posts);
});

// ─── ADMIN: create a post ─────────────────────────────────────
router.post('/', authenticate, requireRole(Role.ADMIN, Role.TEACHER), validate(CreatePostSchema), async (req: AuthRequest, res) => {
  try {
    const b = req.body as Record<string, unknown>;
    const baseSlug = slugify((b.slug as string) || (b.title as string));
    const slug = await uniqueSlug(baseSlug);
    const status = (b.status as 'DRAFT' | 'PUBLISHED') ?? 'DRAFT';

    const post = await prisma.post.create({
      data: {
        slug,
        title: b.title as string,
        excerpt: (b.excerpt as string) || null,
        content: b.content as string,
        coverImage: (b.coverImage as string) || null,
        metaTitle: (b.metaTitle as string) || null,
        metaDescription: (b.metaDescription as string) || null,
        keywords: (b.keywords as string) || null,
        tags: (b.tags as string[]) ?? [],
        faqs: (b.faqs as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        status,
        publishedAt: status === 'PUBLISHED' ? new Date() : null,
        authorId: req.user?.userId ?? null,
        authorName: (b.authorName as string) || null,
      },
      include: { author: { select: authorSelect } },
    });

    logAudit(req, 'CREATE', 'Post', post.id, { slug: post.slug, status });
    successResponse(res, post, 201);
  } catch (err) {
    console.error('[POST /blog]', err);
    errorResponse(res, 'Failed to create post', 500);
  }
});

// ─── ADMIN: update a post ─────────────────────────────────────
router.put('/:id', authenticate, requireRole(Role.ADMIN, Role.TEACHER), validate(UpdatePostSchema), async (req: AuthRequest, res) => {
  try {
    const existing = await prisma.post.findUnique({ where: { id: req.params.id } });
    if (!existing) { errorResponse(res, 'Post not found', 404); return; }

    const b = req.body as Record<string, unknown>;
    const data: Prisma.PostUpdateInput = {};

    if (b.title !== undefined)           data.title = b.title as string;
    if (b.excerpt !== undefined)         data.excerpt = (b.excerpt as string) || null;
    if (b.content !== undefined)         data.content = b.content as string;
    if (b.coverImage !== undefined)      data.coverImage = (b.coverImage as string) || null;
    if (b.metaTitle !== undefined)       data.metaTitle = (b.metaTitle as string) || null;
    if (b.metaDescription !== undefined) data.metaDescription = (b.metaDescription as string) || null;
    if (b.keywords !== undefined)        data.keywords = (b.keywords as string) || null;
    if (b.tags !== undefined)            data.tags = (b.tags as string[]) ?? [];
    if (b.authorName !== undefined)      data.authorName = (b.authorName as string) || null;
    if (b.faqs !== undefined)            data.faqs = (b.faqs as Prisma.InputJsonValue) ?? Prisma.JsonNull;

    if (b.slug !== undefined) {
      data.slug = await uniqueSlug(slugify(b.slug as string), existing.id);
    }

    // Status transitions: set publishedAt the first time it goes live.
    if (b.status !== undefined) {
      const next = b.status as 'DRAFT' | 'PUBLISHED';
      data.status = next;
      if (next === 'PUBLISHED' && !existing.publishedAt) data.publishedAt = new Date();
    }

    const post = await prisma.post.update({
      where: { id: req.params.id },
      data,
      include: { author: { select: authorSelect } },
    });

    logAudit(req, 'UPDATE', 'Post', post.id, { slug: post.slug, status: post.status });
    successResponse(res, post);
  } catch (err) {
    console.error('[PUT /blog/:id]', err);
    errorResponse(res, 'Failed to update post', 500);
  }
});

// ─── ADMIN: delete a post ─────────────────────────────────────
router.delete('/:id', authenticate, requireRole(Role.ADMIN), async (req: AuthRequest, res) => {
  try {
    await prisma.post.delete({ where: { id: req.params.id } });
    logAudit(req, 'DELETE', 'Post', req.params.id);
    successResponse(res, { message: 'Post deleted' });
  } catch (err) {
    console.error('[DELETE /blog/:id]', err);
    errorResponse(res, 'Failed to delete post', 500);
  }
});

// ─── PUBLIC: get one published post by slug ───────────────────
// Declared last so it doesn't shadow /admin/all.
router.get('/:slug', async (req, res) => {
  const post = await prisma.post.findFirst({
    where: { slug: req.params.slug, status: 'PUBLISHED', publishedAt: { lte: new Date() } },
    include: { author: { select: authorSelect } },
  });
  if (!post) { errorResponse(res, 'Post not found', 404); return; }
  successResponse(res, post);
});

export default router;
