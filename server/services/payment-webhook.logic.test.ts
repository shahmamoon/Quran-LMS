import { describe, it, expect } from 'vitest';
import { decideTransition, TERMINAL_STATUSES } from './payment-webhook.logic.js';
import type { PaymentStatus } from '@prisma/client';

const ALL: PaymentStatus[] = ['PENDING', 'PAID', 'PAST_DUE', 'FAILED', 'EXPIRED', 'ENDED', 'CANCELLED'];

describe('payment webhook state machine — decideTransition', () => {
  // ── checkout.session.completed → PAID ───────────────────────────────────
  describe('checkout.session.completed', () => {
    it('PENDING → PAID (sets paidAt)', () => {
      const r = decideTransition('PENDING', 'checkout.session.completed');
      expect(r.nextStatus).toBe('PAID');
      expect(r.setPaidAt).toBe(true);
      expect(r.auditAction).toBe('PAYMENT_PAID');
    });

    it('is idempotent — already PAID → no change', () => {
      expect(decideTransition('PAID', 'checkout.session.completed').nextStatus).toBeNull();
    });

    it('never overrides a terminal state', () => {
      for (const s of TERMINAL_STATUSES) {
        expect(decideTransition(s, 'checkout.session.completed').nextStatus).toBeNull();
      }
    });

    it('does not reactivate from PAST_DUE (that is invoice.paid only)', () => {
      // A stray completed event shouldn't clobber a past-due subscription.
      expect(decideTransition('PAST_DUE', 'checkout.session.completed').nextStatus).toBeNull();
    });
  });

  // ── invoice.paid → PAID (renewals) ──────────────────────────────────────
  describe('invoice.paid (subscription renewal)', () => {
    it('PAST_DUE → PAID (a retry succeeded; reactivates)', () => {
      const r = decideTransition('PAST_DUE', 'invoice.paid');
      expect(r.nextStatus).toBe('PAID');
      expect(r.setPaidAt).toBe(true);
      expect(r.auditAction).toBe('PAYMENT_RENEWED');
    });

    it('PENDING → PAID', () => {
      expect(decideTransition('PENDING', 'invoice.paid').nextStatus).toBe('PAID');
    });

    it('already PAID → no change (idempotent renewal)', () => {
      expect(decideTransition('PAID', 'invoice.paid').nextStatus).toBeNull();
    });

    it('does not resurrect a terminal subscription', () => {
      for (const s of TERMINAL_STATUSES) {
        expect(decideTransition(s, 'invoice.paid').nextStatus).toBeNull();
      }
    });
  });

  // ── invoice.payment_failed → PAST_DUE ───────────────────────────────────
  describe('invoice.payment_failed (renewal charge failed)', () => {
    it('PAID → PAST_DUE (no paidAt change)', () => {
      const r = decideTransition('PAID', 'invoice.payment_failed');
      expect(r.nextStatus).toBe('PAST_DUE');
      expect(r.setPaidAt).toBe(false);
      expect(r.auditAction).toBe('PAYMENT_PAST_DUE');
    });

    it('already PAST_DUE → no change (repeated failure)', () => {
      expect(decideTransition('PAST_DUE', 'invoice.payment_failed').nextStatus).toBeNull();
    });

    it('does not affect a CANCELLED/ENDED subscription', () => {
      expect(decideTransition('CANCELLED', 'invoice.payment_failed').nextStatus).toBeNull();
      expect(decideTransition('ENDED', 'invoice.payment_failed').nextStatus).toBeNull();
    });
  });

  // ── customer.subscription.deleted → ENDED (unless CANCELLED) ─────────────
  describe('customer.subscription.deleted', () => {
    it('PAID → ENDED (reached end date / dunning exhausted)', () => {
      const r = decideTransition('PAID', 'customer.subscription.deleted');
      expect(r.nextStatus).toBe('ENDED');
      expect(r.auditAction).toBe('PAYMENT_ENDED');
    });

    it('PAST_DUE → ENDED', () => {
      expect(decideTransition('PAST_DUE', 'customer.subscription.deleted').nextStatus).toBe('ENDED');
    });

    it('CANCELLED stays CANCELLED (admin early-cancel wins over ENDED)', () => {
      // This is the critical reconciliation rule.
      expect(decideTransition('CANCELLED', 'customer.subscription.deleted').nextStatus).toBeNull();
    });

    it('already ENDED → no change (idempotent)', () => {
      expect(decideTransition('ENDED', 'customer.subscription.deleted').nextStatus).toBeNull();
    });
  });

  // ── checkout.session.expired → EXPIRED ──────────────────────────────────
  describe('checkout.session.expired', () => {
    it('PENDING → EXPIRED', () => {
      const r = decideTransition('PENDING', 'checkout.session.expired');
      expect(r.nextStatus).toBe('EXPIRED');
      expect(r.auditAction).toBe('PAYMENT_EXPIRED');
    });

    it('does NOT expire a paid payment (late expiry event)', () => {
      expect(decideTransition('PAID', 'checkout.session.expired').nextStatus).toBeNull();
    });
  });

  // ── payment_intent.payment_failed → FAILED (one-time) ───────────────────
  describe('payment_intent.payment_failed (one-time)', () => {
    it('PENDING → FAILED', () => {
      const r = decideTransition('PENDING', 'payment_intent.payment_failed');
      expect(r.nextStatus).toBe('FAILED');
      expect(r.auditAction).toBe('PAYMENT_FAILED');
    });

    it('does NOT fail an already-paid payment', () => {
      expect(decideTransition('PAID', 'payment_intent.payment_failed').nextStatus).toBeNull();
    });
  });

  // ── Unknown / unhandled events ──────────────────────────────────────────
  describe('unhandled event types', () => {
    it('returns no change for any unrelated event, in any status', () => {
      for (const s of ALL) {
        expect(decideTransition(s, 'charge.refunded').nextStatus).toBeNull();
        expect(decideTransition(s, 'customer.created').nextStatus).toBeNull();
        expect(decideTransition(s, 'random.event').nextStatus).toBeNull();
      }
    });
  });

  // ── Global invariants ───────────────────────────────────────────────────
  describe('invariants', () => {
    it('a terminal status is never moved by ANY event', () => {
      const events = [
        'checkout.session.completed', 'invoice.paid', 'invoice.payment_failed',
        'customer.subscription.deleted', 'checkout.session.expired', 'payment_intent.payment_failed',
      ] as const;
      for (const s of TERMINAL_STATUSES) {
        for (const e of events) {
          expect(decideTransition(s, e).nextStatus).toBeNull();
        }
      }
    });

    it('setPaidAt is true ONLY when transitioning to PAID', () => {
      const events = [
        'checkout.session.completed', 'invoice.paid', 'invoice.payment_failed',
        'customer.subscription.deleted', 'checkout.session.expired', 'payment_intent.payment_failed',
      ] as const;
      for (const s of ALL) {
        for (const e of events) {
          const r = decideTransition(s, e);
          if (r.setPaidAt) expect(r.nextStatus).toBe('PAID');
        }
      }
    });

    it('a non-null nextStatus always carries an audit action', () => {
      const events = [
        'checkout.session.completed', 'invoice.paid', 'invoice.payment_failed',
        'customer.subscription.deleted', 'checkout.session.expired', 'payment_intent.payment_failed',
      ] as const;
      for (const s of ALL) {
        for (const e of events) {
          const r = decideTransition(s, e);
          if (r.nextStatus) expect(r.auditAction).not.toBeNull();
        }
      }
    });
  });
});
