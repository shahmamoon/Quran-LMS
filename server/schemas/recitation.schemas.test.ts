import { describe, it, expect } from 'vitest';
import {
  CreateRecitationSessionSchema,
  UpdateRecitationSessionSchema,
  CreatePageAttemptSchema,
  UpdatePageAttemptSchema,
} from './validation.schemas.js';

// Pure Zod — no DB, no network. Guards that schema boundaries (page 1–604,
// mastery 0–100, required fields, enum values) stay correct as the code evolves.

describe('CreateRecitationSessionSchema', () => {
  const valid = { studentId: 'clxabc123', scheduledAt: '2026-06-15T10:00:00Z' };

  it('accepts minimal valid input', () => {
    expect(CreateRecitationSessionSchema.safeParse(valid).success).toBe(true);
  });

  it('defaults trackType to RECITATION when omitted', () => {
    const r = CreateRecitationSessionSchema.safeParse(valid);
    expect(r.success && r.data.trackType).toBe('RECITATION');
  });

  it('accepts all three trackType values', () => {
    for (const t of ['RECITATION', 'HIFZ', 'REVISION'] as const) {
      expect(CreateRecitationSessionSchema.safeParse({ ...valid, trackType: t }).success).toBe(true);
    }
  });

  it('rejects an invalid trackType', () => {
    expect(CreateRecitationSessionSchema.safeParse({ ...valid, trackType: 'MEMORISE' }).success).toBe(false);
  });

  it('rejects missing studentId', () => {
    expect(CreateRecitationSessionSchema.safeParse({ scheduledAt: valid.scheduledAt }).success).toBe(false);
  });

  it('rejects missing scheduledAt', () => {
    expect(CreateRecitationSessionSchema.safeParse({ studentId: valid.studentId }).success).toBe(false);
  });
});

describe('UpdateRecitationSessionSchema', () => {
  it('accepts a valid status update', () => {
    expect(UpdateRecitationSessionSchema.safeParse({ status: 'COMPLETED' }).success).toBe(true);
  });

  it('accepts all valid status values', () => {
    for (const s of ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const) {
      expect(UpdateRecitationSessionSchema.safeParse({ status: s }).success).toBe(true);
    }
  });

  it('rejects an invalid status', () => {
    expect(UpdateRecitationSessionSchema.safeParse({ status: 'BOGUS' }).success).toBe(false);
  });

  it('rejects an empty update (no fields)', () => {
    expect(UpdateRecitationSessionSchema.safeParse({}).success).toBe(false);
  });

  it('accepts durationMins 0 (session started and closed within same minute)', () => {
    expect(UpdateRecitationSessionSchema.safeParse({ durationMins: 0 }).success).toBe(true);
  });

  it('rejects durationMins > 480 (8 hours)', () => {
    expect(UpdateRecitationSessionSchema.safeParse({ durationMins: 481 }).success).toBe(false);
  });

  it('accepts durationMins at the boundary (480)', () => {
    expect(UpdateRecitationSessionSchema.safeParse({ durationMins: 480 }).success).toBe(true);
  });
});

describe('CreatePageAttemptSchema', () => {
  const valid = { pageNumber: 1, status: 'INTRODUCED' as const };

  it('accepts a minimal valid attempt', () => {
    expect(CreatePageAttemptSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts pageNumber at both boundaries (1 and 604)', () => {
    expect(CreatePageAttemptSchema.safeParse({ ...valid, pageNumber: 1 }).success).toBe(true);
    expect(CreatePageAttemptSchema.safeParse({ ...valid, pageNumber: 604 }).success).toBe(true);
  });

  it('rejects pageNumber 0 (below lower bound)', () => {
    expect(CreatePageAttemptSchema.safeParse({ ...valid, pageNumber: 0 }).success).toBe(false);
  });

  it('rejects pageNumber 605 (above upper bound)', () => {
    expect(CreatePageAttemptSchema.safeParse({ ...valid, pageNumber: 605 }).success).toBe(false);
  });

  it('rejects a non-integer pageNumber', () => {
    expect(CreatePageAttemptSchema.safeParse({ ...valid, pageNumber: 1.5 }).success).toBe(false);
  });

  it('accepts all four page status values', () => {
    for (const s of ['INTRODUCED', 'PRACTICING', 'COMPLETED', 'NEEDS_REVIEW'] as const) {
      expect(CreatePageAttemptSchema.safeParse({ ...valid, status: s }).success).toBe(true);
    }
  });

  it('rejects an invalid status', () => {
    expect(CreatePageAttemptSchema.safeParse({ ...valid, status: 'MASTERED' }).success).toBe(false);
  });

  it('accepts masteryScore at both boundaries (0 and 100)', () => {
    expect(CreatePageAttemptSchema.safeParse({ ...valid, masteryScore: 0 }).success).toBe(true);
    expect(CreatePageAttemptSchema.safeParse({ ...valid, masteryScore: 100 }).success).toBe(true);
  });

  it('rejects masteryScore below 0', () => {
    expect(CreatePageAttemptSchema.safeParse({ ...valid, masteryScore: -1 }).success).toBe(false);
  });

  it('rejects masteryScore above 100', () => {
    expect(CreatePageAttemptSchema.safeParse({ ...valid, masteryScore: 101 }).success).toBe(false);
  });

  it('accepts a valid error entry', () => {
    const r = CreatePageAttemptSchema.safeParse({
      ...valid,
      errors: [{ ruleId: 'IKHFA', severity: 'MAJOR', ayahNumber: 3 }],
    });
    expect(r.success).toBe(true);
  });

  it('rejects an error entry with missing ruleId', () => {
    const r = CreatePageAttemptSchema.safeParse({
      ...valid,
      errors: [{ severity: 'MAJOR' }],
    });
    expect(r.success).toBe(false);
  });

  it('rejects an error entry with invalid severity', () => {
    const r = CreatePageAttemptSchema.safeParse({
      ...valid,
      errors: [{ ruleId: 'IKHFA', severity: 'CATASTROPHIC' }],
    });
    expect(r.success).toBe(false);
  });

  it('defaults errors to empty array when omitted', () => {
    const r = CreatePageAttemptSchema.safeParse(valid);
    expect(r.success && r.data.errors).toEqual([]);
  });
});

describe('UpdatePageAttemptSchema', () => {
  it('accepts a valid status update', () => {
    expect(UpdatePageAttemptSchema.safeParse({ status: 'COMPLETED' }).success).toBe(true);
  });

  it('rejects an empty update (no fields)', () => {
    expect(UpdatePageAttemptSchema.safeParse({}).success).toBe(false);
  });

  it('rejects masteryScore out of bounds on update', () => {
    expect(UpdatePageAttemptSchema.safeParse({ masteryScore: -1 }).success).toBe(false);
    expect(UpdatePageAttemptSchema.safeParse({ masteryScore: 101 }).success).toBe(false);
  });

  it('accepts masteryScore null (clearing the score)', () => {
    expect(UpdatePageAttemptSchema.safeParse({ masteryScore: null }).success).toBe(true);
  });
});
