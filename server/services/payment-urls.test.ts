import { describe, it, expect } from 'vitest';
import { checkoutReturnUrls } from './payment-urls.js';

describe('checkoutReturnUrls', () => {
  it('points BOTH urls at the student-facing /lms/my-payments page', () => {
    const { successUrl, cancelUrl } = checkoutReturnUrls('https://quranacademy.com');
    expect(successUrl).toBe('https://quranacademy.com/lms/my-payments?payment=success');
    expect(cancelUrl).toBe('https://quranacademy.com/lms/my-payments?payment=cancel');
  });

  it('never sends the student to the admin-only /lms/payments page', () => {
    // Regression guard: a student redirected to /lms/payments is bounced by
    // ProtectedRoute. The path must be /lms/my-payments, not /lms/payments.
    const { successUrl, cancelUrl } = checkoutReturnUrls('https://demo.quranacademy.com');
    for (const url of [successUrl, cancelUrl]) {
      expect(url).toContain('/lms/my-payments');
      expect(url).not.toMatch(/\/lms\/payments(\?|$)/); // admin path, with or without query
    }
  });

  it('tolerates a trailing slash in CLIENT_URL (no double slash)', () => {
    const { successUrl } = checkoutReturnUrls('http://localhost:3000/');
    expect(successUrl).toBe('http://localhost:3000/lms/my-payments?payment=success');
  });

  it('carries the correct payment query param on each url', () => {
    const { successUrl, cancelUrl } = checkoutReturnUrls('http://localhost:3000');
    expect(successUrl.endsWith('?payment=success')).toBe(true);
    expect(cancelUrl.endsWith('?payment=cancel')).toBe(true);
  });
});
