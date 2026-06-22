/**
 * payment-webhook.logic.ts — PURE webhook state-machine.
 *
 * Given a payment's current status + the type of Stripe event, decide the new
 * status (or null = no change). No DB, no Stripe, no I/O — so it's trivially
 * unit-testable and protects the payment state machine from regressions.
 *
 * The webhook handler (payments.routes.ts) does the I/O (look up the Payment,
 * apply the result, audit-log, schedule cancel_at) and delegates the *decision*
 * here. Keep the two in sync.
 */

import type { PaymentStatus, PaymentType } from '@prisma/client';

/** Statuses that are final — no webhook should move a payment out of them. */
export const TERMINAL_STATUSES: PaymentStatus[] = ['ENDED', 'CANCELLED', 'EXPIRED', 'FAILED'];

/** The Stripe event types the handler acts on. */
export type WebhookEventType =
  | 'checkout.session.completed'
  | 'invoice.paid'
  | 'invoice.payment_failed'
  | 'customer.subscription.deleted'
  | 'checkout.session.expired'
  | 'payment_intent.payment_failed'
  | (string & {}); // any other type → no-op

export interface TransitionResult {
  /** New status to write, or null = no change (idempotent no-op). */
  nextStatus: PaymentStatus | null;
  /** Audit action label when a change happens (null when no change). */
  auditAction: string | null;
  /** Whether to set paidAt = now (only on PAID transitions). */
  setPaidAt: boolean;
}

const NO_CHANGE: TransitionResult = { nextStatus: null, auditAction: null, setPaidAt: false };

/**
 * Decide the next status for a payment given the current status + event type.
 *
 * `paymentType` only matters for documentation/symmetry; the rules are keyed on
 * status + event. All rules are **idempotent**: replaying an event that already
 * took effect (or arriving in a terminal state) returns NO_CHANGE.
 */
export function decideTransition(
  currentStatus: PaymentStatus,
  eventType: WebhookEventType,
  _paymentType?: PaymentType,
): TransitionResult {
  switch (eventType) {
    case 'checkout.session.completed':
      // The initial payment for a checkout link. Only a brand-new PENDING payment
      // should transition here — this event fires once, at first payment. Anything
      // already PAID/PAST_DUE/terminal is left untouched (idempotent + avoids a
      // stray/replayed event masking a renewal failure).
      if (currentStatus === 'PENDING') {
        return { nextStatus: 'PAID', auditAction: 'PAYMENT_PAID', setPaidAt: true };
      }
      return NO_CHANGE;

    case 'invoice.paid':
      // Subscription renewal succeeded → (re)activate. Only from PENDING or PAST_DUE.
      if (currentStatus === 'PENDING' || currentStatus === 'PAST_DUE') {
        return { nextStatus: 'PAID', auditAction: 'PAYMENT_RENEWED', setPaidAt: true };
      }
      return NO_CHANGE;

    case 'invoice.payment_failed':
      // Renewal charge failed → PAST_DUE. Only from an active PAID subscription.
      if (currentStatus === 'PAID') {
        return { nextStatus: 'PAST_DUE', auditAction: 'PAYMENT_PAST_DUE', setPaidAt: false };
      }
      return NO_CHANGE;

    case 'customer.subscription.deleted':
      // Subscription stopped. Any already-terminal payment stays as-is — an admin
      // early-cancel (CANCELLED) must win over ENDED, and a FAILED/EXPIRED row must
      // not be resurrected. Only a live (PAID/PAST_DUE) or PENDING sub → ENDED.
      if (TERMINAL_STATUSES.includes(currentStatus)) return NO_CHANGE;
      return { nextStatus: 'ENDED', auditAction: 'PAYMENT_ENDED', setPaidAt: false };

    case 'checkout.session.expired':
      // Unpaid checkout link expired → EXPIRED. Only from PENDING.
      if (currentStatus === 'PENDING') {
        return { nextStatus: 'EXPIRED', auditAction: 'PAYMENT_EXPIRED', setPaidAt: false };
      }
      return NO_CHANGE;

    case 'payment_intent.payment_failed':
      // One-time payment failed → FAILED. Only from PENDING.
      if (currentStatus === 'PENDING') {
        return { nextStatus: 'FAILED', auditAction: 'PAYMENT_FAILED', setPaidAt: false };
      }
      return NO_CHANGE;

    default:
      return NO_CHANGE;
  }
}
