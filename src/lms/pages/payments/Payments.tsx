import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, CreditCard, Copy, Mail, Check, XCircle, Link2 } from 'lucide-react';
import { api } from '../../lib/api';
import {
  Button, Card, CardBody, Badge, Modal, Input, Select, Spinner, EmptyState,
} from '../../components/ui';
import { fullName } from '../../lib/utils';
import type { Payment, Plan, PaymentStatus, PaymentType, User } from '../../types';
import { toast } from 'sonner';

const CURRENCIES = [
  { value: 'cad', label: 'CAD ($)' },
  { value: 'usd', label: 'USD ($)' },
];

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

function fmtDate(d: string | null) {
  return d ? new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(d)) : '—';
}

// ── Generate-link modal form ──────────────────────────────────
interface LinkForm {
  studentId: string;
  mode: 'plan' | 'custom';
  planId: string;
  amount: string;     // dollars as typed; converted to cents on submit
  currency: string;
  type: PaymentType;
  endDate: string;    // yyyy-mm-dd
  description: string;
}
const defaultForm: LinkForm = {
  studentId: '', mode: 'custom', planId: '', amount: '', currency: 'cad',
  type: 'ONE_TIME', endDate: '', description: '',
};

export default function Payments() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'payments' | 'plans'>('payments');
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [form, setForm] = useState<LinkForm>(defaultForm);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [planForm, setPlanForm] = useState({ name: '', amount: '', currency: 'cad', type: 'ONE_TIME' as PaymentType, interval: 'month' });

  // Feature flag — is Stripe configured?
  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ['payments-status'],
    queryFn: () => api.get<{ data: { available: boolean } }>('/payments/status').then((r) => r.data.data),
  });
  const available = status?.available ?? false;

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['payments'],
    queryFn: () => api.get<{ data: Payment[] }>('/payments').then((r) => r.data.data),
    enabled: available,
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.get<{ data: Plan[] }>('/payments/plans').then((r) => r.data.data),
    enabled: available,
  });

  const { data: students = [] } = useQuery({
    queryKey: ['users', 'STUDENT', ''],
    queryFn: () => api.get<{ data: User[] }>('/users?role=STUDENT&limit=200').then((r) => r.data.data),
    enabled: available,
  });

  const createMutation = useMutation({
    mutationFn: (f: LinkForm) => {
      const body: Record<string, unknown> = {
        studentId: f.studentId,
        type: f.type,
        description: f.description || undefined,
      };
      if (f.mode === 'plan') {
        body.planId = f.planId;
      } else {
        body.amount = Math.round(parseFloat(f.amount) * 100);
        body.currency = f.currency;
      }
      if (f.type === 'SUBSCRIPTION' && f.endDate) {
        body.endDate = new Date(f.endDate + 'T23:59:59').toISOString();
      }
      return api.post<{ data: Payment }>('/payments', body).then((r) => r.data.data);
    },
    onSuccess: (payment) => {
      qc.invalidateQueries({ queryKey: ['payments'] });
      setGeneratedUrl(payment.checkoutUrl);
      toast.success('Payment link generated');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Failed to generate link');
    },
  });

  const emailMutation = useMutation({
    mutationFn: (id: string) => api.post(`/payments/${id}/email`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payments'] }); toast.success('Link emailed to student'); },
    onError: () => toast.error('Failed to send email'),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => api.post(`/payments/${id}/cancel`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['payments'] }); toast.success('Subscription cancelled'); },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Failed to cancel');
    },
  });

  const createPlanMutation = useMutation({
    mutationFn: () => api.post('/payments/plans', {
      name: planForm.name,
      amount: Math.round(parseFloat(planForm.amount) * 100),
      currency: planForm.currency,
      type: planForm.type,
      interval: planForm.type === 'SUBSCRIPTION' ? planForm.interval : undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plans'] });
      setShowPlanModal(false);
      setPlanForm({ name: '', amount: '', currency: 'cad', type: 'ONE_TIME', interval: 'month' });
      toast.success('Plan created');
    },
    onError: () => toast.error('Failed to create plan'),
  });

  const togglePlanMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(`/payments/plans/${id}`, { isActive }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['plans'] }); },
  });

  function copy(url: string | null) {
    if (!url) return;
    navigator.clipboard.writeText(url);
    toast.success('Link copied');
  }

  function openLinkModal() {
    setForm(defaultForm);
    setGeneratedUrl(null);
    setShowLinkModal(true);
  }

  function submitLink(e: React.FormEvent) {
    e.preventDefault();
    if (!form.studentId) { toast.error('Select a student'); return; }
    if (form.mode === 'plan' && !form.planId) { toast.error('Select a plan'); return; }
    if (form.mode === 'custom' && (!form.amount || parseFloat(form.amount) <= 0)) { toast.error('Enter a valid amount'); return; }
    if (form.type === 'SUBSCRIPTION' && !form.endDate) { toast.error('Set an end date for the subscription'); return; }
    createMutation.mutate(form);
  }

  // ── Feature not configured ──────────────────────────────────
  if (statusLoading) {
    return <div className="flex justify-center py-20"><Spinner className="w-10 h-10" /></div>;
  }
  if (!available) {
    return (
      <div className="max-w-2xl mx-auto mt-16 text-center space-y-4">
        <div className="w-16 h-16 bg-brand-100 rounded-2xl flex items-center justify-center mx-auto">
          <CreditCard size={32} className="text-brand-500" />
        </div>
        <h2 className="text-xl font-semibold text-slate-800">Payments not configured</h2>
        <p className="text-slate-500 text-sm">
          Add <code className="bg-slate-100 px-1.5 py-0.5 rounded text-brand-700">STRIPE_SECRET_KEY</code> and
          {' '}<code className="bg-slate-100 px-1.5 py-0.5 rounded text-brand-700">STRIPE_WEBHOOK_SECRET</code> to
          your environment (Doppler) to enable payments.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payments</h1>
          <p className="text-slate-500 text-sm mt-1">Generate and track student payment links</p>
        </div>
        {tab === 'payments'
          ? <Button onClick={openLinkModal} icon={<Plus size={16} />}>Generate Link</Button>
          : <Button onClick={() => setShowPlanModal(true)} icon={<Plus size={16} />}>New Plan</Button>}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {(['payments', 'plans'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px capitalize ${
              tab === t ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Payments tab ─────────────────────────────────────── */}
      {tab === 'payments' && (
        isLoading ? (
          <div className="flex justify-center py-16"><Spinner className="w-10 h-10" /></div>
        ) : payments.length === 0 ? (
          <EmptyState icon={<CreditCard size={40} />} title="No payments yet"
            description="Generate your first payment link."
            action={<Button onClick={openLinkModal} icon={<Plus size={16} />}>Generate Link</Button>} />
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-400 uppercase tracking-wide border-b border-slate-100">
                    <th className="px-5 py-3 font-medium">Student</th>
                    <th className="px-5 py-3 font-medium">Amount</th>
                    <th className="px-5 py-3 font-medium">Type</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium">Paid</th>
                    <th className="px-5 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {payments.map((p) => {
                    const canCancel = p.type === 'SUBSCRIPTION' && (p.status === 'PAID' || p.status === 'PAST_DUE');
                    return (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-5 py-3">
                          <p className="font-medium text-slate-800">{p.student ? fullName(p.student) : '—'}</p>
                          <p className="text-xs text-slate-400">{p.student?.email}</p>
                        </td>
                        <td className="px-5 py-3 font-medium text-slate-700">{money(p.amount, p.currency)}</td>
                        <td className="px-5 py-3 text-slate-500">{p.type === 'SUBSCRIPTION' ? 'Subscription' : 'One-time'}</td>
                        <td className="px-5 py-3"><Badge variant={statusVariant[p.status] ?? 'default'}>{p.status}</Badge></td>
                        <td className="px-5 py-3 text-slate-500">{fmtDate(p.paidAt)}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            <button onClick={() => copy(p.checkoutUrl)} disabled={!p.checkoutUrl}
                              className="p-1.5 text-slate-400 hover:text-brand-600 disabled:opacity-30" title="Copy link">
                              <Copy size={15} />
                            </button>
                            <button onClick={() => emailMutation.mutate(p.id)} disabled={!p.checkoutUrl || emailMutation.isPending}
                              className="p-1.5 text-slate-400 hover:text-brand-600 disabled:opacity-30"
                              title={p.emailedAt ? 'Emailed — resend' : 'Email link to student'}>
                              {p.emailedAt ? <Check size={15} className="text-green-500" /> : <Mail size={15} />}
                            </button>
                            {canCancel && (
                              <button
                                onClick={() => { if (confirm('Cancel this subscription? Future charges stop immediately.')) cancelMutation.mutate(p.id); }}
                                disabled={cancelMutation.isPending}
                                className="p-1.5 text-slate-400 hover:text-red-500 disabled:opacity-30" title="Cancel subscription">
                                <XCircle size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )
      )}

      {/* ── Plans tab ────────────────────────────────────────── */}
      {tab === 'plans' && (
        plans.length === 0 ? (
          <EmptyState icon={<CreditCard size={40} />} title="No plans yet"
            description="Create reusable plans to pick from when generating links."
            action={<Button onClick={() => setShowPlanModal(true)} icon={<Plus size={16} />}>New Plan</Button>} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((pl) => (
              <Card key={pl.id} className={pl.isActive ? '' : 'opacity-60'}>
                <CardBody className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-slate-800">{pl.name}</h3>
                    <Badge variant={pl.isActive ? 'success' : 'default'}>{pl.isActive ? 'Active' : 'Inactive'}</Badge>
                  </div>
                  <p className="text-2xl font-bold text-slate-900">{money(pl.amount, pl.currency)}</p>
                  <p className="text-xs text-slate-500">
                    {pl.type === 'SUBSCRIPTION' ? `Subscription · per ${pl.interval}` : 'One-time'}
                  </p>
                  <Button variant="outline" size="sm" className="w-full mt-2"
                    onClick={() => togglePlanMutation.mutate({ id: pl.id, isActive: !pl.isActive })}>
                    {pl.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                </CardBody>
              </Card>
            ))}
          </div>
        )
      )}

      {/* ── Generate Link Modal ──────────────────────────────── */}
      <Modal open={showLinkModal} onClose={() => setShowLinkModal(false)} title="Generate Payment Link">
        {generatedUrl ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
              <Check size={16} /> Link generated
            </div>
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <Link2 size={14} className="text-slate-400 shrink-0" />
              <span className="text-xs text-slate-600 truncate flex-1">{generatedUrl}</span>
              <button onClick={() => copy(generatedUrl)} className="text-slate-400 hover:text-brand-600 shrink-0"><Copy size={14} /></button>
            </div>
            <p className="text-xs text-slate-500">Review the link, then email it from the payments table, or copy it to share manually.</p>
            <Button onClick={() => setShowLinkModal(false)} className="w-full">Done</Button>
          </div>
        ) : (
          <form onSubmit={submitLink} className="space-y-4">
            <Select
              label="Student"
              value={form.studentId}
              onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))}
              options={[{ value: '', label: 'Select student…' }, ...students.map((s) => ({ value: s.id, label: `${fullName(s)} (${s.email})` }))]}
            />

            {/* Amount source toggle */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Amount</label>
              <div className="flex gap-2 mb-3">
                {(['custom', 'plan'] as const).map((m) => (
                  <button key={m} type="button"
                    onClick={() => setForm((f) => ({ ...f, mode: m }))}
                    className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors capitalize ${
                      form.mode === m ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-600 border-slate-300 hover:border-brand-400'
                    }`}>
                    {m === 'custom' ? 'Custom amount' : 'Use a plan'}
                  </button>
                ))}
              </div>

              {form.mode === 'plan' ? (
                <Select
                  value={form.planId}
                  onChange={(e) => {
                    const pl = plans.find((p) => p.id === e.target.value);
                    setForm((f) => ({ ...f, planId: e.target.value, type: pl?.type ?? f.type }));
                  }}
                  options={[
                    { value: '', label: 'Select plan…' },
                    ...plans.filter((p) => p.isActive).map((p) => ({ value: p.id, label: `${p.name} — ${money(p.amount, p.currency)}${p.type === 'SUBSCRIPTION' ? `/${p.interval}` : ''}` })),
                  ]}
                />
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Input type="number" step="0.01" min="0" placeholder="Amount" value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
                  <Select value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))} options={CURRENCIES} />
                </div>
              )}
            </div>

            {/* Type (custom mode only; plan dictates type otherwise) */}
            {form.mode === 'custom' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Payment type</label>
                <div className="flex gap-2">
                  {(['ONE_TIME', 'SUBSCRIPTION'] as const).map((t) => (
                    <button key={t} type="button"
                      onClick={() => setForm((f) => ({ ...f, type: t }))}
                      className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors ${
                        form.type === t ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-600 border-slate-300 hover:border-brand-400'
                      }`}>
                      {t === 'ONE_TIME' ? 'One-time' : 'Subscription'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* End date — subscriptions only */}
            {form.type === 'SUBSCRIPTION' && (
              <Input
                label="Subscription end date"
                type="date"
                min={new Date().toISOString().slice(0, 10)}
                value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                required
              />
            )}

            <Input label="Description (optional)" value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="e.g. June tutoring fees" />

            <div className="flex gap-3 pt-1">
              <Button type="button" variant="secondary" onClick={() => setShowLinkModal(false)} className="flex-1">Cancel</Button>
              <Button type="submit" loading={createMutation.isPending} className="flex-1">Generate</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── New Plan Modal ───────────────────────────────────── */}
      <Modal open={showPlanModal} onClose={() => setShowPlanModal(false)} title="New Plan">
        <form onSubmit={(e) => { e.preventDefault(); if (!planForm.name || !planForm.amount) { toast.error('Name and amount required'); return; } createPlanMutation.mutate(); }} className="space-y-4">
          <Input label="Plan name" value={planForm.name} onChange={(e) => setPlanForm((f) => ({ ...f, name: e.target.value }))} required placeholder="e.g. Monthly Tutoring" />
          <div className="grid grid-cols-2 gap-2">
            <Input label="Amount" type="number" step="0.01" min="0" value={planForm.amount} onChange={(e) => setPlanForm((f) => ({ ...f, amount: e.target.value }))} required />
            <Select label="Currency" value={planForm.currency} onChange={(e) => setPlanForm((f) => ({ ...f, currency: e.target.value }))} options={CURRENCIES} />
          </div>
          <Select label="Type" value={planForm.type} onChange={(e) => setPlanForm((f) => ({ ...f, type: e.target.value as PaymentType }))}
            options={[{ value: 'ONE_TIME', label: 'One-time' }, { value: 'SUBSCRIPTION', label: 'Subscription' }]} />
          {planForm.type === 'SUBSCRIPTION' && (
            <Select label="Billing interval" value={planForm.interval} onChange={(e) => setPlanForm((f) => ({ ...f, interval: e.target.value }))}
              options={[{ value: 'month', label: 'Monthly' }, { value: 'year', label: 'Yearly' }]} />
          )}
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={() => setShowPlanModal(false)} className="flex-1">Cancel</Button>
            <Button type="submit" loading={createPlanMutation.isPending} className="flex-1">Create Plan</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
