import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import { Card, CardBody, Badge, Spinner, EmptyState } from '../../components/ui';
import type { Payment, PaymentStatus } from '../../types';

const statusVariant: Record<PaymentStatus, 'info' | 'success' | 'default' | 'danger' | 'warning'> = {
  PENDING: 'warning', PAID: 'success', PAST_DUE: 'danger', FAILED: 'danger', EXPIRED: 'default', ENDED: 'default', CANCELLED: 'danger',
};

function money(amountCents: number, currency: string) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(amountCents / 100);
  } catch {
    return `${(amountCents / 100).toFixed(2)} ${currency.toUpperCase()}`;
  }
}

/** Student-facing payments page — a top-level view of the student's own payments. */
export default function MyPayments() {
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['my-payments'],
    queryFn: () => api.get<{ data: Payment[] }>('/payments/me').then((r) => r.data.data),
  });

  // Handle the redirect back from Stripe Checkout (success_url / cancel_url).
  useEffect(() => {
    const p = searchParams.get('payment');
    if (p === 'success') {
      toast.success('Payment successful — your status will update shortly.');
      qc.invalidateQueries({ queryKey: ['my-payments'] });
      setSearchParams({}, { replace: true });
    } else if (p === 'cancel') {
      toast('Payment cancelled.');
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, qc, setSearchParams]);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Payments</h1>
        <p className="text-slate-500 text-sm mt-1">Your tuition payments and subscriptions</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : payments.length === 0 ? (
        <EmptyState
          icon={<CreditCard size={28} />}
          title="No payments yet"
          description="When your tutor sends you a payment link, it will appear here."
        />
      ) : (
        <Card>
          <CardBody>
            <div className="divide-y divide-slate-100">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800">{money(p.amount, p.currency)}</p>
                    <p className="text-xs text-slate-400">
                      {p.type === 'SUBSCRIPTION' ? 'Subscription' : 'One-time'}
                      {p.description ? ` · ${p.description}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {p.status === 'PENDING' && p.checkoutUrl && (
                      <a href={p.checkoutUrl} target="_blank" rel="noreferrer"
                        className="text-xs font-semibold text-brand-600 hover:underline">Pay now</a>
                    )}
                    <Badge variant={statusVariant[p.status] ?? 'default'}>{p.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
