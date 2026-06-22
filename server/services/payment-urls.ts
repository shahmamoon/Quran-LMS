/**
 * payment-urls.ts — PURE helper for the Stripe Checkout return URLs.
 *
 * Extracted so it can be unit-tested without the Stripe client: these URLs MUST
 * point at the student-facing /lms/my-payments page (where the post-checkout
 * toast + status refetch live), NOT the admin-only /lms/payments page — a
 * student redirected there would be bounced by ProtectedRoute.
 */

export interface CheckoutReturnUrls {
  successUrl: string;
  cancelUrl: string;
}

/** Build the success/cancel URLs Stripe redirects the student back to. */
export function checkoutReturnUrls(clientUrl: string): CheckoutReturnUrls {
  const base = clientUrl.replace(/\/$/, ''); // tolerate a trailing slash in CLIENT_URL
  return {
    successUrl: `${base}/lms/my-payments?payment=success`,
    cancelUrl: `${base}/lms/my-payments?payment=cancel`,
  };
}
