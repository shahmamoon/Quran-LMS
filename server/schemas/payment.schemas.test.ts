import { describe, it, expect } from 'vitest';
import {
  CreatePlanSchema,
  UpdatePlanSchema,
  CreatePaymentSchema,
} from './validation.schemas.js';

// These guard the admin payment/plan inputs so a future schema edit can't
// silently let through a bad amount, currency, or a subscription with no
// end date / interval. Pure Zod — no DB, no Stripe.

describe('CreatePlanSchema', () => {
  const valid = { name: 'Monthly Tutoring', amount: 5000, currency: 'cad', type: 'ONE_TIME' as const };

  it('accepts a valid one-time plan', () => {
    expect(CreatePlanSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts a subscription plan WITH an interval', () => {
    const r = CreatePlanSchema.safeParse({ ...valid, type: 'SUBSCRIPTION', interval: 'month' });
    expect(r.success).toBe(true);
  });

  it('rejects a SUBSCRIPTION plan with NO interval', () => {
    const r = CreatePlanSchema.safeParse({ ...valid, type: 'SUBSCRIPTION' });
    expect(r.success).toBe(false);
  });

  it('rejects a non-integer (float) amount — money is integer cents', () => {
    expect(CreatePlanSchema.safeParse({ ...valid, amount: 50.5 }).success).toBe(false);
  });

  it('rejects a zero or negative amount', () => {
    expect(CreatePlanSchema.safeParse({ ...valid, amount: 0 }).success).toBe(false);
    expect(CreatePlanSchema.safeParse({ ...valid, amount: -100 }).success).toBe(false);
  });

  it('rejects a currency outside the allowlist (cad/usd)', () => {
    expect(CreatePlanSchema.safeParse({ ...valid, currency: 'eur' }).success).toBe(false);
    expect(CreatePlanSchema.safeParse({ ...valid, currency: 'gbp' }).success).toBe(false);
  });

  it('accepts usd as well as cad', () => {
    expect(CreatePlanSchema.safeParse({ ...valid, currency: 'usd' }).success).toBe(true);
  });

  it('rejects an empty name', () => {
    expect(CreatePlanSchema.safeParse({ ...valid, name: '' }).success).toBe(false);
  });

  it('rejects an unknown plan type', () => {
    expect(CreatePlanSchema.safeParse({ ...valid, type: 'WEEKLY' }).success).toBe(false);
  });
});

describe('UpdatePlanSchema', () => {
  it('accepts a single-field update', () => {
    expect(UpdatePlanSchema.safeParse({ isActive: false }).success).toBe(true);
    expect(UpdatePlanSchema.safeParse({ amount: 7500 }).success).toBe(true);
  });

  it('rejects an empty update (must provide at least one field)', () => {
    expect(UpdatePlanSchema.safeParse({}).success).toBe(false);
  });

  it('still validates the fields it is given', () => {
    expect(UpdatePlanSchema.safeParse({ amount: -1 }).success).toBe(false);
    expect(UpdatePlanSchema.safeParse({ currency: 'eur' }).success).toBe(false);
  });
});

describe('CreatePaymentSchema', () => {
  const futureDate = '2027-01-01T00:00:00.000Z';

  it('accepts a one-time payment from a saved plan', () => {
    const r = CreatePaymentSchema.safeParse({ studentId: 'stu_1', planId: 'plan_1', type: 'ONE_TIME' });
    expect(r.success).toBe(true);
  });

  it('accepts a one-time payment with a custom amount + currency', () => {
    const r = CreatePaymentSchema.safeParse({
      studentId: 'stu_1', amount: 5000, currency: 'usd', type: 'ONE_TIME',
    });
    expect(r.success).toBe(true);
  });

  it('rejects a custom payment missing the currency', () => {
    const r = CreatePaymentSchema.safeParse({ studentId: 'stu_1', amount: 5000, type: 'ONE_TIME' });
    expect(r.success).toBe(false);
  });

  it('rejects a payment with neither planId nor amount', () => {
    const r = CreatePaymentSchema.safeParse({ studentId: 'stu_1', type: 'ONE_TIME' });
    expect(r.success).toBe(false);
  });

  it('accepts a SUBSCRIPTION with an endDate', () => {
    const r = CreatePaymentSchema.safeParse({
      studentId: 'stu_1', planId: 'plan_1', type: 'SUBSCRIPTION', endDate: futureDate,
    });
    expect(r.success).toBe(true);
  });

  it('rejects a SUBSCRIPTION with NO endDate', () => {
    const r = CreatePaymentSchema.safeParse({ studentId: 'stu_1', planId: 'plan_1', type: 'SUBSCRIPTION' });
    expect(r.success).toBe(false);
  });

  it('rejects a non-ISO endDate string', () => {
    const r = CreatePaymentSchema.safeParse({
      studentId: 'stu_1', planId: 'plan_1', type: 'SUBSCRIPTION', endDate: '2027-01-01',
    });
    expect(r.success).toBe(false);
  });

  it('rejects a missing studentId', () => {
    const r = CreatePaymentSchema.safeParse({ planId: 'plan_1', type: 'ONE_TIME' });
    expect(r.success).toBe(false);
  });

  it('rejects a custom amount that is a float or non-positive', () => {
    const base = { studentId: 'stu_1', currency: 'cad', type: 'ONE_TIME' as const };
    expect(CreatePaymentSchema.safeParse({ ...base, amount: 50.5 }).success).toBe(false);
    expect(CreatePaymentSchema.safeParse({ ...base, amount: 0 }).success).toBe(false);
  });

  it('rejects a currency outside the allowlist', () => {
    const r = CreatePaymentSchema.safeParse({
      studentId: 'stu_1', amount: 5000, currency: 'eur', type: 'ONE_TIME',
    });
    expect(r.success).toBe(false);
  });
});
