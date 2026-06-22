import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

// ── Transporter ───────────────────────────────────────────────────────────────
function createTransporter() {
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
    return null; // email not configured — log only
  }
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
}

async function sendMail(opts: { to: string; subject: string; html: string }) {
  const transporter = createTransporter();
  if (!transporter) {
    console.log(`📧 [EMAIL — not configured] To: ${opts.to} | Subject: ${opts.subject}`);
    return;
  }
  await transporter.sendMail({
    from: env.SMTP_FROM || `"Online Quran Academy" <${env.SMTP_USER}>`,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
  console.log(`📧 Email sent to ${opts.to}: ${opts.subject}`);
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const base = (body: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <style>
    body { font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; background:#f1f5f9; margin:0; padding:32px 16px; }
    .card { background:#fff; border-radius:12px; max-width:520px; margin:0 auto; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,.07); }
    .header { background:#0e91e9; padding:32px; text-align:center; }
    .header h1 { color:#fff; margin:0; font-size:22px; font-weight:700; }
    .header p { color:rgba(255,255,255,.8); margin:6px 0 0; font-size:14px; }
    .body { padding:32px; color:#334155; }
    .body p { margin:0 0 16px; font-size:15px; line-height:1.6; }
    .cred-box { background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:16px 20px; margin:20px 0; }
    .cred-box .row { display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #e2e8f0; font-size:14px; }
    .cred-box .row:last-child { border-bottom:none; }
    .cred-box .label { color:#64748b; font-weight:500; }
    .cred-box .value { color:#0f172a; font-weight:600; font-family:monospace; }
    .btn { display:inline-block; background:#0e91e9; color:#fff !important; text-decoration:none; padding:12px 28px; border-radius:8px; font-weight:600; font-size:14px; margin:8px 0; }
    .footer { background:#f8fafc; padding:16px 32px; text-align:center; color:#94a3b8; font-size:12px; border-top:1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>☪ Online Quran Academy</h1>
      <p>Quran Recitation Platform</p>
    </div>
    <div class="body">${body}</div>
    <div class="footer">This is an automated message — please do not reply.</div>
  </div>
</body>
</html>`;

// ── Email templates ───────────────────────────────────────────────────────────

export async function sendWelcomeEmail(opts: {
  to: string;
  firstName: string;
  role: string;
  password: string;
  loginUrl: string;
}) {
  const roleLabel = opts.role.charAt(0) + opts.role.slice(1).toLowerCase();
  await sendMail({
    to: opts.to,
    subject: `Welcome to Online Quran Academy — Your ${roleLabel} account is ready`,
    html: base(`
      <p>Hi <strong>${opts.firstName}</strong>,</p>
      <p>Your <strong>${roleLabel}</strong> account has been created. Here are your login credentials:</p>
      <div class="cred-box">
        <div class="row"><span class="label">Email</span><span class="value">${opts.to}</span></div>
        <div class="row"><span class="label">Password</span><span class="value">${opts.password}</span></div>
        <div class="row"><span class="label">Role</span><span class="value">${roleLabel}</span></div>
      </div>
      <p style="text-align:center">
        <a href="${opts.loginUrl}" class="btn">Log In Now</a>
      </p>
      <p style="color:#64748b;font-size:13px;">For security, please change your password after logging in for the first time.</p>
    `),
  });
}

/** Format minor units (cents) + currency code → "CA$200.00" style string. */
function formatMoney(amountCents: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amountCents / 100);
  } catch {
    return `${(amountCents / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

export async function sendPaymentLinkEmail(opts: {
  to: string;
  firstName: string;
  amount: number;       // minor units (cents)
  currency: string;
  paymentUrl: string;
  type: 'ONE_TIME' | 'SUBSCRIPTION';
  description?: string;
}) {
  const amountLabel = formatMoney(opts.amount, opts.currency);
  const typeLabel = opts.type === 'SUBSCRIPTION' ? 'Subscription' : 'One-time payment';
  await sendMail({
    to: opts.to,
    subject: 'Online Quran Academy — Your payment link',
    html: base(`
      <p>Hi <strong>${opts.firstName}</strong>,</p>
      <p>Here is your secure payment link. Click the button below to complete your payment.</p>
      <div class="cred-box">
        <div class="row"><span class="label">Amount</span><span class="value">${amountLabel}</span></div>
        <div class="row"><span class="label">Type</span><span class="value">${typeLabel}</span></div>
        ${opts.description ? `<div class="row"><span class="label">For</span><span class="value">${opts.description}</span></div>` : ''}
      </div>
      <p style="text-align:center">
        <a href="${opts.paymentUrl}" class="btn">Pay Now</a>
      </p>
      <p style="color:#64748b;font-size:13px;">Payments are processed securely by Stripe. Your card details are never stored by us.</p>
    `),
  });
}

export async function sendPasswordResetEmail(opts: {
  to: string;
  firstName: string;
  newPassword: string;
  loginUrl: string;
}) {
  await sendMail({
    to: opts.to,
    subject: 'Online Quran Academy — Your password has been reset',
    html: base(`
      <p>Hi <strong>${opts.firstName}</strong>,</p>
      <p>Your password has been reset by an administrator. Use the credentials below to log in:</p>
      <div class="cred-box">
        <div class="row"><span class="label">Email</span><span class="value">${opts.to}</span></div>
        <div class="row"><span class="label">New Password</span><span class="value">${opts.newPassword}</span></div>
      </div>
      <p style="text-align:center">
        <a href="${opts.loginUrl}" class="btn">Log In Now</a>
      </p>
      <p style="color:#64748b;font-size:13px;">Please change your password immediately after logging in.</p>
    `),
  });
}
