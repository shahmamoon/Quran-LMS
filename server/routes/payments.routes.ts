import { Router, type Request, type Response } from 'express';
import type Stripe from 'stripe';
import { Role, type PaymentStatus } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth.middleware.js';
import { successResponse, errorResponse } from '../utils/response.utils.js';
import { validate } from '../middleware/validate.middleware.js';
import { CreatePlanSchema, UpdatePlanSchema, CreatePaymentSchema } from '../schemas/validation.schemas.js';
import { logAudit } from '../utils/audit.utils.js';
import { sendPaymentLinkEmail } from '../services/email.service.js';
import {
  stripe, stripeEnabled, createCheckoutSession, cancelSubscription,
  scheduleSubscriptionCancel, constructWebhookEvent,
} from '../services/stripe.service.js';
import { decideTransition } from '../services/payment-webhook.logic.js';

const router = Router();

const studentSelect = { id: true, firstName: true, lastName: true, email: true };

// Guard helper — admin Stripe actions need a configured client.
function requireStripe(res: Response): boolean {
  if (!stripeEnabled()) {
    errorResponse(res, 'Payments are not configured', 503);
    return false;
  }
  return true;
}

// ─── GET /api/payments/status — feature flag for the frontend ──
router.get('/status', authenticate, requireRole(Role.ADMIN), (_req, res) => {
  successResponse(res, { available: stripeEnabled() });
});

// ─── GET /api/payments/me — a student's own payments ──────────
// Declared before /:id-style routes; mounted on the authenticated router.
router.get('/me', authenticate, async (req: AuthRequest, res) => {
  const payments = await prisma.payment.findMany({
    where: { studentId: req.user!.userId },
    include: { plan: true },
    orderBy: { createdAt: 'desc' },
  });
  successResponse(res, payments);
});

// ─── Plans ────────────────────────────────────────────────────
router.get('/plans', authenticate, requireRole(Role.ADMIN), async (_req, res) => {
  const plans = await prisma.plan.findMany({
    orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
  });
  successResponse(res, plans);
});

router.post('/plans', authenticate, requireRole(Role.ADMIN), validate(CreatePlanSchema), async (req: AuthRequest, res) => {
  const b = req.body as { name: string; amount: number; currency: string; type: 'ONE_TIME' | 'SUBSCRIPTION'; interval?: string };
  const plan = await prisma.plan.create({
    data: {
      name: b.name, amount: b.amount, currency: b.currency, type: b.type,
      interval: b.type === 'SUBSCRIPTION' ? (b.interval ?? 'month') : null,
    },
  });
  logAudit(req, 'CREATE', 'Plan', plan.id, { amount: plan.amount, currency: plan.currency, type: plan.type });
  successResponse(res, plan, 201);
});

router.patch('/plans/:id', authenticate, requireRole(Role.ADMIN), validate(UpdatePlanSchema), async (req: AuthRequest, res) => {
  const existing = await prisma.plan.findUnique({ where: { id: req.params.id } });
  if (!existing) { errorResponse(res, 'Plan not found', 404); return; }
  const b = req.body as Partial<{ name: string; amount: number; currency: string; isActive: boolean }>;
  const plan = await prisma.plan.update({ where: { id: req.params.id }, data: b });
  logAudit(req, 'UPDATE', 'Plan', plan.id, b as Record<string, unknown>);
  successResponse(res, plan);
});

// ─── GET /api/payments — admin sees all ───────────────────────
router.get('/', authenticate, requireRole(Role.ADMIN), async (req, res) => {
  const studentId = typeof req.query.studentId === 'string' ? req.query.studentId : undefined;
  const payments = await prisma.payment.findMany({
    where: { ...(studentId ? { studentId } : {}) },
    include: { student: { select: studentSelect }, plan: true },
    orderBy: { createdAt: 'desc' },
  });
  successResponse(res, payments);
});

// ─── POST /api/payments — generate a payment link ─────────────
router.post('/', authenticate, requireRole(Role.ADMIN), validate(CreatePaymentSchema), async (req: AuthRequest, res) => {
  if (!requireStripe(res)) return;

  const b = req.body as {
    studentId: string; planId?: string; amount?: number; currency?: string;
    type: 'ONE_TIME' | 'SUBSCRIPTION'; endDate?: string; description?: string;
  };

  // Guard: target must be an active STUDENT.
  const student = await prisma.user.findUnique({ where: { id: b.studentId } });
  if (!student || student.role !== Role.STUDENT || student.status !== 'ACTIVE') {
    errorResponse(res, 'Target must be an active student', 422); return;
  }

  // Resolve amount/currency from plan or custom input.
  let amount: number; let currency: string; let planId: string | null = null;
  if (b.planId) {
    const plan = await prisma.plan.findUnique({ where: { id: b.planId } });
    if (!plan || !plan.isActive) { errorResponse(res, 'Plan not found or inactive', 422); return; }
    amount = plan.amount; currency = plan.currency; planId = plan.id;
  } else {
    amount = b.amount!; currency = b.currency!;
  }

  const description = b.description?.trim()
    || `${b.type === 'SUBSCRIPTION' ? 'Tutoring subscription' : 'Tutoring fee'} — ${student.firstName} ${student.lastName}`;

  try {
    // Create the Payment first (PENDING), then the Stripe session, then persist its ids.
    const payment = await prisma.payment.create({
      data: {
        studentId: student.id,
        planId,
        type: b.type,
        amount,
        currency,
        description,
        endDate: b.endDate ? new Date(b.endDate) : null,
        status: 'PENDING',
      },
    });

    const plan = planId ? await prisma.plan.findUnique({ where: { id: planId } }) : null;
    const session = await createCheckoutSession({ payment, plan, studentEmail: student.email, description });

    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: { stripeSessionId: session.id, checkoutUrl: session.url },
      include: { student: { select: studentSelect }, plan: true },
    });

    logAudit(req, 'CREATE', 'Payment', updated.id, { amount, currency, type: b.type, studentId: student.id });
    successResponse(res, updated, 201);
  } catch (err) {
    console.error('[POST /payments]', err);
    errorResponse(res, 'Failed to create payment link', 500);
  }
});

// ─── POST /api/payments/:id/email — email the link to the student ──
router.post('/:id/email', authenticate, requireRole(Role.ADMIN), async (req: AuthRequest, res) => {
  const payment = await prisma.payment.findUnique({
    where: { id: req.params.id },
    include: { student: { select: studentSelect } },
  });
  if (!payment) { errorResponse(res, 'Payment not found', 404); return; }
  if (!payment.checkoutUrl) { errorResponse(res, 'No payment link to send', 422); return; }

  try {
    await sendPaymentLinkEmail({
      to: payment.student.email,
      firstName: payment.student.firstName,
      amount: payment.amount,
      currency: payment.currency,
      paymentUrl: payment.checkoutUrl,
      type: payment.type,
      description: payment.description ?? undefined,
    });
    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: { emailedAt: new Date() },
      include: { student: { select: studentSelect }, plan: true },
    });
    logAudit(req, 'EMAIL', 'Payment', payment.id);
    successResponse(res, updated);
  } catch (err) {
    console.error('[POST /payments/:id/email]', err);
    errorResponse(res, 'Failed to send email', 500);
  }
});

// ─── POST /api/payments/:id/cancel — cancel a subscription early ──
router.post('/:id/cancel', authenticate, requireRole(Role.ADMIN), async (req: AuthRequest, res) => {
  if (!requireStripe(res)) return;
  const payment = await prisma.payment.findUnique({ where: { id: req.params.id } });
  if (!payment) { errorResponse(res, 'Payment not found', 404); return; }
  // Allow cancelling an active (PAID) or payment-failing (PAST_DUE) subscription.
  if (payment.type !== 'SUBSCRIPTION' || !payment.stripeSubscriptionId ||
      (payment.status !== 'PAID' && payment.status !== 'PAST_DUE')) {
    errorResponse(res, 'Only an active subscription can be cancelled', 422); return;
  }

  try {
    await cancelSubscription(payment.stripeSubscriptionId);
    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'CANCELLED' },
      include: { student: { select: studentSelect }, plan: true },
    });
    logAudit(req, 'CANCEL', 'Payment', payment.id);
    successResponse(res, updated);
  } catch (err) {
    console.error('[POST /payments/:id/cancel]', err);
    errorResponse(res, 'Failed to cancel subscription', 500);
  }
});

export default router;

// ─── Webhook handler ──────────────────────────────────────────
// Mounted in server/index.ts with express.raw BEFORE express.json so req.body
// is the raw Buffer needed for signature verification. Idempotent: every branch
// looks up the Payment by a Stripe id and no-ops if already in a terminal state.
export async function stripeWebhookHandler(req: Request, res: Response): Promise<void> {
  if (!stripe) { res.status(503).json({ error: 'Stripe not configured' }); return; }

  const signature = req.headers['stripe-signature'];
  if (!signature || typeof signature !== 'string') {
    res.status(400).json({ error: 'Missing stripe-signature' }); return;
  }

  let event: Stripe.Event;
  try {
    event = constructWebhookEvent(req.body as Buffer, signature);
  } catch (err) {
    console.error('[stripe webhook] signature verification failed:', (err as Error).message);
    res.status(400).json({ error: 'Invalid signature' }); return;
  }

  // Audit-log a webhook-driven status change. No req.user (Stripe is the actor),
  // so write directly with a 'stripe-webhook' marker. Fire-and-forget like logAudit.
  const auditWebhook = (paymentId: string, action: string, from: PaymentStatus) => {
    prisma.auditLog.create({
      data: {
        userId: null,
        action,
        resource: 'Payment',
        resourceId: paymentId,
        metadata: { via: 'stripe-webhook', eventType: event.type, from },
      },
    }).catch((e) => console.error('[stripe webhook] audit log failed:', e));
  };

  // Locate the Payment this event refers to, by whichever Stripe id the event carries.
  async function findPaymentForEvent(): Promise<{ id: string; status: PaymentStatus } | null> {
    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object;
        return prisma.payment.findFirst({
          where: { OR: [{ stripeSessionId: s.id }, { id: s.metadata?.paymentId ?? '' }] },
          select: { id: true, status: true },
        });
      }
      case 'checkout.session.expired': {
        const s = event.data.object;
        return prisma.payment.findFirst({ where: { stripeSessionId: s.id }, select: { id: true, status: true } });
      }
      case 'invoice.paid':
      case 'invoice.payment_failed': {
        const inv = event.data.object as { subscription?: string | null };
        const subId = typeof inv.subscription === 'string' ? inv.subscription : null;
        return subId
          ? prisma.payment.findFirst({ where: { stripeSubscriptionId: subId }, select: { id: true, status: true } })
          : null;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as { id: string };
        return prisma.payment.findFirst({ where: { stripeSubscriptionId: sub.id }, select: { id: true, status: true } });
      }
      case 'payment_intent.payment_failed': {
        const pi = event.data.object as { id: string };
        return prisma.payment.findFirst({ where: { stripePaymentIntentId: pi.id }, select: { id: true, status: true } });
      }
      default:
        return null;
    }
  }

  try {
    const payment = await findPaymentForEvent();
    if (payment) {
      const decision = decideTransition(payment.status, event.type);
      if (decision.nextStatus) {
        // On the initial checkout completion, also persist the Stripe ids.
        const extra: Record<string, unknown> = {};
        if (event.type === 'checkout.session.completed') {
          const s = event.data.object;
          extra.stripeSessionId = s.id;
          extra.stripeCustomerId = typeof s.customer === 'string' ? s.customer : null;
          extra.stripeSubscriptionId = typeof s.subscription === 'string' ? s.subscription : null;
          extra.stripePaymentIntentId = typeof s.payment_intent === 'string' ? s.payment_intent : null;
        }
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: decision.nextStatus,
            ...(decision.setPaidAt ? { paidAt: new Date() } : {}),
            ...extra,
          },
        });
        if (decision.auditAction) auditWebhook(payment.id, decision.auditAction, payment.status);

        // After a subscription's first payment, if an admin end date was set,
        // schedule Stripe to auto-cancel at that date (Checkout can't set it).
        if (event.type === 'checkout.session.completed') {
          const s = event.data.object;
          const subscriptionId = typeof s.subscription === 'string' ? s.subscription : null;
          if (subscriptionId) {
            const full = await prisma.payment.findUnique({
              where: { id: payment.id },
              select: { type: true, endDate: true },
            });
            if (full?.type === 'SUBSCRIPTION' && full.endDate) {
              try {
                await scheduleSubscriptionCancel(subscriptionId, full.endDate);
              } catch (e) {
                console.error('[stripe webhook] failed to schedule cancel_at:', e);
              }
            }
          }
        }
      }
    }
    res.json({ received: true });
  } catch (err) {
    console.error('[stripe webhook] handler error:', err);
    // Return 200 anyway for unknown-id cases to avoid infinite retries; only
    // a true processing failure should 500. We log and 200 to be safe here.
    res.json({ received: true });
  }
}
