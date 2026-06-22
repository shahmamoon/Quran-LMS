import { z } from 'zod';

// ─── Users ────────────────────────────────────────────────────
export const CreateUserSchema = z.object({
  email:     z.string().email('Valid email required'),
  password:  z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(1).max(100),
  lastName:  z.string().min(1).max(100),
  role:      z.enum(['ADMIN', 'TEACHER', 'STUDENT']).optional(),
  bio:       z.string().max(500).optional().nullable(),
  phone:     z.string().max(20).optional().nullable(),
  grade:     z.string().optional().nullable(),
});

// ─── Subjects ─────────────────────────────────────────────────
export const CreateSubjectSchema = z.object({
  title:        z.string().min(1, 'Title is required').max(200),
  description:  z.string().max(2000).optional().nullable(),
  thumbnailUrl: z.string().url().optional().or(z.literal('')).nullable(),
  color:        z.string().optional(),
  grade:        z.string().optional().nullable(),
  courseType:   z.enum(['NOORANI_QAIDA', 'QURAN_LEARNING', 'ISLAMIC_LEARNING']).optional().nullable(),
  teacherIds:   z.array(z.string()).optional(),
});

// ─── Sessions ─────────────────────────────────────────────────
export const CreateSessionSchema = z.object({
  title:           z.string().min(1, 'Title is required').max(200),
  description:     z.string().max(2000).optional(),
  subjectId:       z.string().optional().nullable(),
  groupId:         z.string().optional().nullable(),
  studentId:       z.string().optional().nullable(),
  hostId:          z.string().optional(),
  scheduledAt:     z.string().min(1, 'scheduledAt is required'),
  durationMinutes: z.coerce.number().int().min(1).max(480).optional(),
  zoomJoinUrl:     z.string().url().optional().or(z.literal('')).nullable(),
  recurringDays:   z.array(z.number().int().min(0).max(6)).max(7).optional(),
  recurringUntil:  z.string().optional(),
});

// ─── Groups ───────────────────────────────────────────────────
export const CreateGroupSchema = z.object({
  name:        z.string().min(1, 'name is required').max(200),
  description: z.string().max(2000).optional().nullable(),
  subjectIds:  z.array(z.string()).optional(),
  memberIds:   z.array(z.string()).optional(),
});

// ─── Quiz Assign ──────────────────────────────────────────────
export const AssignQuizSchema = z
  .object({
    groupIds:   z.array(z.string()).optional().default([]),
    studentIds: z.array(z.string()).optional().default([]),
    dueDate:    z.string().optional(),
  })
  .refine(
    (d) => (d.groupIds?.length ?? 0) + (d.studentIds?.length ?? 0) > 0,
    { message: 'Provide at least one groupId or studentId' },
  );

// ─── Blog Posts ───────────────────────────────────────────────
// slug is optional on create — the route derives it from the title when omitted.
const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const FaqItemSchema = z.object({
  q: z.string().min(1).max(300),
  a: z.string().min(1).max(2000),
});

export const CreatePostSchema = z.object({
  title:           z.string().min(1, 'Title is required').max(200),
  slug:            z.string().min(1).max(200).regex(slugRegex, 'Slug must be lowercase words separated by hyphens').optional(),
  excerpt:         z.string().max(500).optional().nullable(),
  content:         z.string().min(1, 'Content is required'),
  coverImage:      z.string().url().optional().or(z.literal('')).nullable(),
  metaTitle:       z.string().max(200).optional().nullable(),
  metaDescription: z.string().max(320).optional().nullable(),
  keywords:        z.string().max(500).optional().nullable(),
  tags:            z.array(z.string().max(50)).max(20).optional().default([]),
  faqs:            z.array(FaqItemSchema).max(20).optional().nullable(),
  status:          z.enum(['DRAFT', 'PUBLISHED']).optional().default('DRAFT'),
  authorName:      z.string().max(120).optional().nullable(),
});

// All fields optional on update; slug must still match the pattern if provided.
export const UpdatePostSchema = z.object({
  title:           z.string().min(1).max(200).optional(),
  slug:            z.string().min(1).max(200).regex(slugRegex, 'Slug must be lowercase words separated by hyphens').optional(),
  excerpt:         z.string().max(500).optional().nullable(),
  content:         z.string().min(1).optional(),
  coverImage:      z.string().url().optional().or(z.literal('')).nullable(),
  metaTitle:       z.string().max(200).optional().nullable(),
  metaDescription: z.string().max(320).optional().nullable(),
  keywords:        z.string().max(500).optional().nullable(),
  tags:            z.array(z.string().max(50)).max(20).optional(),
  faqs:            z.array(FaqItemSchema).max(20).optional().nullable(),
  status:          z.enum(['DRAFT', 'PUBLISHED']).optional(),
  authorName:      z.string().max(120).optional().nullable(),
});

// ─── Content-engine topics ────────────────────────────────────
// Used by the n8n workflow to report progress on a claimed topic.
export const UpdateTopicSchema = z.object({
  status:    z.enum(['QUEUED', 'DRAFTING', 'DRAFTED', 'PUBLISHED', 'ERROR']).optional(),
  postId:    z.string().optional().nullable(),
  lastError: z.string().max(2000).optional().nullable(),
  notes:     z.string().max(2000).optional().nullable(),
}).refine((d) => Object.keys(d).length > 0, { message: 'Provide at least one field to update' });

// ─── Quran Recitation ─────────────────────────────────────────

export const CreateRecitationSessionSchema = z.object({
  studentId:    z.string().min(1, 'studentId is required'),
  scheduledAt:  z.string().min(1, 'scheduledAt is required'),
  zoomSessionId: z.string().optional().nullable(),
  trackType:    z.enum(['RECITATION', 'HIFZ', 'REVISION']).optional().default('RECITATION'),
  overallNotes: z.string().max(5000).optional().nullable(),
});

export const UpdateRecitationSessionSchema = z.object({
  status:       z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  startedAt:    z.string().datetime().optional().nullable(),
  endedAt:      z.string().datetime().optional().nullable(),
  durationMins: z.number().int().min(0).max(480).optional().nullable(),
  overallNotes: z.string().max(5000).optional().nullable(),
  audioUrl:     z.string().optional().nullable(),
}).refine((d) => Object.keys(d).length > 0, { message: 'Provide at least one field to update' });

export const CreatePageAttemptSchema = z.object({
  pageNumber:   z.number().int().min(1).max(604),
  status:       z.enum(['INTRODUCED', 'PRACTICING', 'COMPLETED', 'NEEDS_REVIEW']),
  masteryScore: z.number().int().min(0).max(100).optional().nullable(),
  teacherNotes: z.string().max(5000).optional().nullable(),
  errors:       z.array(z.object({
    ruleId:     z.string().min(1),
    ayahNumber: z.number().int().min(1).optional().nullable(),
    wordNumber: z.number().int().min(1).optional().nullable(),
    severity:   z.enum(['MINOR', 'MODERATE', 'MAJOR']),
    note:       z.string().max(1000).optional().nullable(),
  })).optional().default([]),
});

export const UpdatePageAttemptSchema = z.object({
  status:       z.enum(['INTRODUCED', 'PRACTICING', 'COMPLETED', 'NEEDS_REVIEW']).optional(),
  masteryScore: z.number().int().min(0).max(100).optional().nullable(),
  teacherNotes: z.string().max(5000).optional().nullable(),
}).refine((d) => Object.keys(d).length > 0, { message: 'Provide at least one field to update' });

// ─── Payments (Stripe) ────────────────────────────────────────
const ALLOWED_CURRENCIES = ['cad', 'usd'] as const;

export const CreatePlanSchema = z.object({
  name:     z.string().min(1, 'Name is required').max(120),
  amount:   z.number().int('Amount must be in cents (integer)').positive('Amount must be positive'),
  currency: z.enum(ALLOWED_CURRENCIES),
  type:     z.enum(['ONE_TIME', 'SUBSCRIPTION']),
  interval: z.enum(['month', 'year']).optional(),
}).refine(
  (d) => d.type !== 'SUBSCRIPTION' || !!d.interval,
  { message: 'interval is required for a SUBSCRIPTION plan', path: ['interval'] },
);

export const UpdatePlanSchema = z.object({
  name:     z.string().min(1).max(120).optional(),
  amount:   z.number().int().positive().optional(),
  currency: z.enum(ALLOWED_CURRENCIES).optional(),
  isActive: z.boolean().optional(),
}).refine((d) => Object.keys(d).length > 0, { message: 'Provide at least one field to update' });

export const CreatePaymentSchema = z.object({
  studentId:   z.string().min(1, 'studentId is required'),
  planId:      z.string().optional(),
  amount:      z.number().int().positive().optional(),     // required when no planId
  currency:    z.enum(ALLOWED_CURRENCIES).optional(),      // required when no planId
  type:        z.enum(['ONE_TIME', 'SUBSCRIPTION']),
  endDate:     z.string().datetime().optional(),           // required for SUBSCRIPTION
  description: z.string().max(300).optional(),
})
  .refine(
    (d) => !!d.planId || (d.amount !== undefined && d.currency !== undefined),
    { message: 'Provide a planId, or both amount and currency', path: ['amount'] },
  )
  .refine(
    (d) => d.type !== 'SUBSCRIPTION' || !!d.endDate,
    { message: 'endDate is required for a SUBSCRIPTION', path: ['endDate'] },
  );
