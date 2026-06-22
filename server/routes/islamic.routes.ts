import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.middleware.js';
import { successResponse, errorResponse } from '../utils/response.utils.js';
import { logAudit } from '../utils/audit.utils.js';

const router = Router();

router.use(authenticate);

// ── Zod schemas ──────────────────────────────────────────────────────────────

const CategorySchema = z.object({
  name:        z.string().min(1),
  slug:        z.string().min(1).regex(/^[a-z0-9-]+$/),
  type:        z.enum(['DUA', 'SALAH', 'WUDU', 'KALIMA']).optional().nullable(),
  description: z.string().optional().nullable(),
  icon:        z.string().optional().nullable(),
  order:       z.number().int().default(0),
  isActive:    z.boolean().default(true),
});

const ItemSchema = z.object({
  categoryId:         z.string().min(1),
  type:               z.enum(['DUA', 'SALAH', 'WUDU', 'KALIMA']),
  title:              z.string().min(1),
  arabicText:         z.string().optional(),
  transliteration:    z.string().optional(),
  englishTranslation: z.string().optional(),
  urduTranslation:    z.string().optional(),
  stepNumber:         z.number().int().optional(),
  prayerName:         z.string().optional(),
  rakatCount:         z.number().int().optional(),
  rakatType:          z.string().optional(),
  imageUrl:           z.string().url().optional(),
  audioUrl:           z.string().url().optional(),
  order:              z.number().int().default(0),
  isActive:           z.boolean().default(true),
});

const ProgressSchema = z.object({
  completed:   z.boolean(),
  completedAt: z.string().datetime().optional(),
  notes:       z.string().optional(),
});

const BookmarkSchema = z.object({
  studentId: z.string().min(1),
  itemId:    z.string().min(1),
  note:      z.string().optional(),
});

// ── Categories ───────────────────────────────────────────────────────────────

router.get('/categories', async (req, res) => {
  try {
    const { type } = req.query;
    const where: Record<string, unknown> = {};

    if (type) where.type = type;
    // Students only see active categories; staff see all
    if ((req as AuthRequest).user!.role === Role.STUDENT) where.isActive = true;

    const categories = await prisma.islamicCategory.findMany({
      where,
      orderBy: [{ type: 'asc' }, { order: 'asc' }],
      include: {
        _count: { select: { items: true } },
      },
    });

    successResponse(res, categories);
  } catch (e) {
    errorResponse(res, 'Failed to fetch categories', 500);
  }
});

router.post('/categories', requireRole(Role.ADMIN, Role.TEACHER), async (req, res) => {
  const parse = CategorySchema.safeParse(req.body);
  if (!parse.success) return errorResponse(res, parse.error.message, 400);

  try {
    const category = await prisma.islamicCategory.create({ data: parse.data });
    logAudit(req, 'CREATE', 'IslamicCategory', category.id, { name: category.name });
    successResponse(res, category, 201);
  } catch (e: any) {
    if (e.code === 'P2002') return errorResponse(res, 'Slug already exists', 409);
    errorResponse(res, 'Failed to create category', 500);
  }
});

router.patch('/categories/:id', requireRole(Role.ADMIN, Role.TEACHER), async (req, res) => {
  const parse = CategorySchema.partial().safeParse(req.body);
  if (!parse.success) return errorResponse(res, parse.error.message, 400);

  try {
    const category = await prisma.islamicCategory.update({
      where: { id: req.params.id },
      data:  parse.data,
    });
    logAudit(req, 'UPDATE', 'IslamicCategory', category.id, parse.data);
    successResponse(res, category);
  } catch (e: any) {
    if (e.code === 'P2025') return errorResponse(res, 'Category not found', 404);
    errorResponse(res, 'Failed to update category', 500);
  }
});

router.delete('/categories/:id', requireRole(Role.ADMIN), async (req, res) => {
  try {
    const itemCount = await prisma.islamicItem.count({ where: { categoryId: req.params.id } });
    if (itemCount > 0) {
      // Soft-disable: category has content, prevent hard delete
      const category = await prisma.islamicCategory.update({
        where: { id: req.params.id },
        data:  { isActive: false },
        include: { _count: { select: { items: true } } },
      });
      logAudit(req, 'DISABLE', 'IslamicCategory', req.params.id, { itemCount });
      successResponse(res, { ...category, softDisabled: true });
      return;
    }
    await prisma.islamicCategory.delete({ where: { id: req.params.id } });
    logAudit(req, 'DELETE', 'IslamicCategory', req.params.id, {});
    successResponse(res, { id: req.params.id, deleted: true });
  } catch (e: any) {
    if (e.code === 'P2025') return errorResponse(res, 'Category not found', 404);
    errorResponse(res, 'Failed to delete category', 500);
  }
});

// ── Items ────────────────────────────────────────────────────────────────────

router.get('/items', async (req, res) => {
  try {
    const { categoryId, type } = req.query;
    const where: Record<string, unknown> = {};

    if (categoryId) where.categoryId = categoryId as string;
    if (type)       where.type       = type;
    if ((req as AuthRequest).user!.role === Role.STUDENT) where.isActive = true;

    const items = await prisma.islamicItem.findMany({
      where,
      orderBy: [{ order: 'asc' }],
      include: { category: { select: { name: true, type: true } } },
    });

    successResponse(res, items);
  } catch (e) {
    errorResponse(res, 'Failed to fetch items', 500);
  }
});

router.get('/items/:id', async (req, res) => {
  try {
    const item = await prisma.islamicItem.findUnique({
      where:   { id: req.params.id },
      include: { category: true },
    });
    if (!item) return errorResponse(res, 'Item not found', 404);
    if ((req as AuthRequest).user!.role === Role.STUDENT && !item.isActive)
      return errorResponse(res, 'Item not found', 404);
    successResponse(res, item);
  } catch (e) {
    errorResponse(res, 'Failed to fetch item', 500);
  }
});

router.post('/items', requireRole(Role.ADMIN, Role.TEACHER), async (req, res) => {
  const parse = ItemSchema.safeParse(req.body);
  if (!parse.success) return errorResponse(res, parse.error.message, 400);

  try {
    const item = await prisma.islamicItem.create({ data: parse.data });
    logAudit(req, 'CREATE', 'IslamicItem', item.id, { title: item.title });
    successResponse(res, item, 201);
  } catch (e) {
    errorResponse(res, 'Failed to create item', 500);
  }
});

router.patch('/items/:id', requireRole(Role.ADMIN, Role.TEACHER), async (req, res) => {
  const parse = ItemSchema.partial().safeParse(req.body);
  if (!parse.success) return errorResponse(res, parse.error.message, 400);

  try {
    const item = await prisma.islamicItem.update({
      where: { id: req.params.id },
      data:  parse.data,
    });
    logAudit(req, 'UPDATE', 'IslamicItem', item.id, parse.data);
    successResponse(res, item);
  } catch (e: any) {
    if (e.code === 'P2025') return errorResponse(res, 'Item not found', 404);
    errorResponse(res, 'Failed to update item', 500);
  }
});

router.delete('/items/:id', requireRole(Role.ADMIN), async (req, res) => {
  try {
    await prisma.islamicItem.delete({ where: { id: req.params.id } });
    logAudit(req, 'DELETE', 'IslamicItem', req.params.id, {});
    successResponse(res, { id: req.params.id });
  } catch (e: any) {
    if (e.code === 'P2025') return errorResponse(res, 'Item not found', 404);
    errorResponse(res, 'Failed to delete item', 500);
  }
});

// ── Progress ─────────────────────────────────────────────────────────────────

router.get('/progress/:studentId', async (req, res) => {
  const { studentId } = req.params;
  const me = (req as AuthRequest).user!;

  if (me.role === Role.STUDENT && me.userId !== studentId)
    return errorResponse(res, 'Forbidden', 403);

  try {
    const progress = await prisma.islamicProgress.findMany({
      where: { studentId },
      include: { item: { select: { id: true, title: true, type: true, categoryId: true } } },
    });
    successResponse(res, progress);
  } catch (e) {
    errorResponse(res, 'Failed to fetch progress', 500);
  }
});

router.put('/progress/:studentId/:itemId', async (req, res) => {
  const { studentId, itemId } = req.params;
  const me = (req as AuthRequest).user!;

  // Students mark their own progress; staff can mark for any student
  if (me.role === Role.STUDENT && me.userId !== studentId)
    return errorResponse(res, 'Forbidden', 403);

  const parse = ProgressSchema.safeParse(req.body);
  if (!parse.success) return errorResponse(res, parse.error.message, 400);

  try {
    const teacherId = me.role !== Role.STUDENT ? me.userId : null;

    const progress = await prisma.islamicProgress.upsert({
      where: { studentId_itemId: { studentId, itemId } },
      create: {
        studentId,
        itemId,
        teacherId,
        completed:   parse.data.completed,
        completedAt: parse.data.completed ? (parse.data.completedAt ? new Date(parse.data.completedAt) : new Date()) : null,
        notes:       parse.data.notes ?? null,
      },
      update: {
        teacherId,
        completed:   parse.data.completed,
        completedAt: parse.data.completed ? (parse.data.completedAt ? new Date(parse.data.completedAt) : new Date()) : null,
        notes:       parse.data.notes ?? null,
      },
    });

    successResponse(res, progress);
  } catch (e) {
    errorResponse(res, 'Failed to update progress', 500);
  }
});

// ── Bookmarks ────────────────────────────────────────────────────────────────

router.get('/bookmarks/:studentId', async (req, res) => {
  const { studentId } = req.params;
  const me = (req as AuthRequest).user!;

  if (me.role === Role.STUDENT && me.userId !== studentId)
    return errorResponse(res, 'Forbidden', 403);

  try {
    const bookmarks = await prisma.islamicBookmark.findMany({
      where:   { studentId },
      include: { item: { select: { id: true, title: true, type: true, categoryId: true } }, teacher: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    });
    successResponse(res, bookmarks);
  } catch (e) {
    errorResponse(res, 'Failed to fetch bookmarks', 500);
  }
});

router.post('/bookmarks', requireRole(Role.ADMIN, Role.TEACHER), async (req, res) => {
  const parse = BookmarkSchema.safeParse(req.body);
  if (!parse.success) return errorResponse(res, parse.error.message, 400);

  try {
    const bookmark = await prisma.islamicBookmark.create({
      data: {
        studentId: parse.data.studentId,
        teacherId: (req as AuthRequest).user!.userId,
        itemId:    parse.data.itemId,
        note:      parse.data.note ?? null,
      },
      include: { teacher: { select: { id: true, firstName: true, lastName: true } } },
    });
    logAudit(req, 'CREATE', 'IslamicBookmark', bookmark.id, { studentId: bookmark.studentId });
    successResponse(res, bookmark, 201);
  } catch (e) {
    errorResponse(res, 'Failed to create bookmark', 500);
  }
});

router.delete('/bookmarks/:id', requireRole(Role.ADMIN, Role.TEACHER), async (req, res) => {
  try {
    await prisma.islamicBookmark.delete({ where: { id: req.params.id } });
    logAudit(req, 'DELETE', 'IslamicBookmark', req.params.id, {});
    successResponse(res, { id: req.params.id });
  } catch (e: any) {
    if (e.code === 'P2025') return errorResponse(res, 'Bookmark not found', 404);
    errorResponse(res, 'Failed to delete bookmark', 500);
  }
});

// ── Dashboard summary ─────────────────────────────────────────────────────────

router.get('/dashboard/:studentId', async (req, res) => {
  const { studentId } = req.params;
  const me = (req as AuthRequest).user!;

  if (me.role === Role.STUDENT && me.userId !== studentId)
    return errorResponse(res, 'Forbidden', 403);

  try {
    const [totalItems, completedCount, bookmarkCount] = await Promise.all([
      prisma.islamicItem.count({ where: { isActive: true } }),
      prisma.islamicProgress.count({ where: { studentId, completed: true } }),
      prisma.islamicBookmark.count({ where: { studentId } }),
    ]);

    const typeBreakdown = await prisma.$queryRaw<Array<{ type: string; completed: bigint }>>`
      SELECT i.type, COUNT(*)::bigint AS completed
      FROM "IslamicProgress" p
      JOIN "IslamicItem" i ON i.id = p."itemId"
      WHERE p."studentId" = ${studentId} AND p.completed = true
      GROUP BY i.type
    `;

    successResponse(res, {
      totalItems,
      completedCount,
      bookmarkCount,
      completionPercentage: totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0,
      typeBreakdown: typeBreakdown.map(r => ({ type: r.type, completed: Number(r.completed) })),
    });
  } catch (e) {
    errorResponse(res, 'Failed to fetch dashboard', 500);
  }
});

export default router;
