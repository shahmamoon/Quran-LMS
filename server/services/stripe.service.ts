import Stripe from 'stripe';
import { env } from '../config/env.js';
import type { Payment, Plan } from '@prisma/client';
import { checkoutReturnUrls } from './payment-urls.js';

/**
 * Module-level Stripe client — instantiated ONCE, guarded on env so the app
 * boots fine when STRIPE_SECRET_KEY is unset (feature flagged off). Mirrors the
 * DeepSeek aiClient pattern. Never recreate per request.
 */
export const stripe: Stripe | null = env.STRIPE_SECRET_KEY
  ? new Stripe(env.STRIPE_SECRET_KEY)
  : null;

export function stripeEnabled(): boolean {
  return stripe !== null;
}

interface CheckoutArgs {
  payment: Payment;
  plan: Plan | null;
  studentEmail: string;
  description: string;
}

/**
 * Create a Stripe Checkout Session for a Payment and return it. The returned
 * `url` is the link the admin shares; `id` is persisted as stripeSessionId.
 *
 * - ONE_TIME    → mode 'payment'
 * - SUBSCRIPTION → mode 'subscription' with recurring interval and
 *   subscription_data.cancel_at = the admin's end date (Stripe auto-cancels).
 *
 * success/cancel URLs point at /lms/my-payments (the student-facing payments
 * page) — NOT the admin-only /lms/payments page.
 */
export async function createCheckoutSession(args: CheckoutArgs): Promise<Stripe.Checkout.Session> {
  if (!stripe) throw new Error('Stripe is not configured');
  const { payment, plan, studentEmail, description } = args;

  const isSub = payment.type === 'SUBSCRIPTION';
  const interval = (plan?.interval as Stripe.PriceCreateParams.Recurring.Interval | undefined) ?? 'month';

  const { successUrl, cancelUrl } = checkoutReturnUrls(env.CLIENT_URL);

  const params: Stripe.Checkout.SessionCreateParams = {
    mode: isSub ? 'subscription' : 'payment',
    customer_email: studentEmail,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: payment.currency,
          unit_amount: payment.amount, // minor units (cents)
          product_data: { name: description },
          ...(isSub ? { recurring: { interval } } : {}),
        },
      },
    ],
    metadata: { paymentId: payment.id, studentId: payment.studentId },
    success_url: successUrl,
    cancel_url: cancelUrl,
  };

  if (isSub) {
    // Note: Checkout's subscription_data does NOT accept cancel_at. The admin's
    // end date is applied to the subscription itself by the webhook once it
    // exists (see scheduleSubscriptionCancel), via checkout.session.completed.
    params.subscription_data = {
      metadata: { paymentId: payment.id, studentId: payment.studentId },
    };
  }

  return stripe.checkout.sessions.create(params);
}

/**
 * Set a subscription to auto-cancel at a future date (unix seconds). Called by
 * the webhook after the subscription exists. Stripe stops charging at that time
 * and emits customer.subscription.deleted → we mark the Payment ENDED.
 */
export async function scheduleSubscriptionCancel(stripeSubscriptionId: string, endDate: Date): Promise<void> {
  if (!stripe) throw new Error('Stripe is not configured');
  await stripe.subscriptions.update(stripeSubscriptionId, {
    cancel_at: Math.floor(endDate.getTime() / 1000),
  });
}

/** Cancel a subscription immediately — stops all future charges (no refund). */
export async function cancelSubscription(stripeSubscriptionId: string): Promise<void> {
  if (!stripe) throw new Error('Stripe is not configured');
  await stripe.subscriptions.cancel(stripeSubscriptionId);
}

/** Verify + parse a webhook event from the raw request body. */
export function constructWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event {
  if (!stripe || !env.STRIPE_WEBHOOK_SECRET) {
    throw new Error('Stripe webhook is not configured');
  }
  return stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
}
