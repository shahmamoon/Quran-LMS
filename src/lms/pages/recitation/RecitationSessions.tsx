import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, BookOpen, Calendar, ChevronRight, User, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import { Button, Card, CardBody, Modal, Input, Select, Spinner, EmptyState } from '../../components/ui';
import { cn, fullName } from '../../lib/utils';
import { toast } from 'sonner';
import type { RecitationSession, User as UserType, ProgressSummary } from '../../types';

const STATUS_COLOR: Record<string, string> = {
  SCHEDULED:   'bg-blue-50 text-blue-700 border-blue-200',
  IN_PROGRESS: 'bg-emerald-50 text-emerald-700 border-emerald-300',
  COMPLETED:   'bg-slate-100 text-slate-600 border-slate-200',
  CANCELLED:   'bg-red-50 text-red-600 border-red-200',
};

// Mini progress bar showing juz coverage
function JuzProgress({ studentId }: { studentId: string }) {
  const { data } = useQuery({
    queryKey: ['recitation-summary', studentId],
    queryFn: () => api.get<{ data: ProgressSummary }>(`/recitation/progress/${studentId}/summary`).then(r => r.data.data),
    staleTime: 60_000,
  });

  if (!data) return <span className="text-xs text-slate-400">Loading…</span>;

  const completed = data.statusBreakdown.find(s => s.status === 'COMPLETED')?.count ?? 0;
  const total = 604;
  const pct = Math.round((completed / total) * 100);

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-500 tabular-nums">{completed}/604</span>
      {data.needsReview.length > 0 && (
        <span className="flex items-center gap-0.5 text-xs text-red-500">
          <AlertTriangle size={10} /> {data.needsReview.length}
        </span>
      )}
    </div>
  );
}

export default function RecitationSessions() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isStaff = user?.role === 'ADMIN' || user?.role === 'TEACHER';

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ studentId: '', scheduledAt: '', overallNotes: '' });
  const [statusFilter, setStatusFilter] = useState('');

  // ── Queries ────────────────────────────────────────────────────

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['recitation-sessions', statusFilter],
    queryFn: () => api.get<{ data: RecitationSession[] }>('/recitation/sessions', {
      params: statusFilter ? { status: statusFilter } : {},
    }).then(r => r.data.data),
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students-list'],
    queryFn: () => api.get<{ data: UserType[] }>('/users', { params: { role: 'STUDENT', limit: 200 } }).then(r => r.data.data),
    enabled: isStaff,
    staleTime: 60_000,
  });

  // ── Mutations ──────────────────────────────────────────────────

  const createMut = useMutation({
    mutationFn: (body: object) => api.post('/recitation/sessions', body).then(r => r.data.data),
    onSuccess: (session: RecitationSession) => {
      qc.invalidateQueries({ queryKey: ['recitation-sessions'] });
      setShowCreate(false);
      setForm({ studentId: '', scheduledAt: '', overallNotes: '' });
      toast.success('Session created');
      navigate(`/lms/recitation/${session.id}`);
    },
    onError: () => toast.error('Failed to create session'),
  });

  function handleCreate() {
    if (!form.studentId || !form.scheduledAt) {
      toast.error('Select a student and scheduled time');
      return;
    }
    createMut.mutate({
      studentId:    form.studentId,
      scheduledAt:  new Date(form.scheduledAt).toISOString(),
      overallNotes: form.overallNotes || null,
    });
  }

  // Group sessions by status for the summary row
  const counts = sessions.reduce<Record<string, number>>((acc, s) => {
    acc[s.status] = (acc[s.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quran Recitation</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {user?.role === 'STUDENT' ? 'Your recitation sessions' : 'Manage student recitation sessions'}
          </p>
        </div>
        {isStaff && (
          <Button onClick={() => setShowCreate(true)} icon={<Plus size={16} />}>
            New Session
          </Button>
        )}
      </div>

      {/* Stats bar */}
      {sessions.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(f => f === s ? '' : s)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                statusFilter === s
                  ? STATUS_COLOR[s] + ' font-semibold'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
              )}
            >
              {s.replace('_', ' ')}
              {counts[s] ? <span className="opacity-70">{counts[s]}</span> : null}
            </button>
          ))}
          {statusFilter && (
            <button onClick={() => setStatusFilter('')} className="text-xs text-slate-400 hover:text-slate-600 px-2">
              Clear filter
            </button>
          )}
        </div>
      )}

      {/* Session list */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : sessions.length === 0 ? (
        <EmptyState
          title="No sessions yet"
          description={isStaff ? 'Create a new session to start teaching.' : 'Your teacher will schedule sessions for you.'}
          action={isStaff ? <Button onClick={() => setShowCreate(true)} icon={<Plus size={16} />}>New Session</Button> : undefined}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {sessions.map(session => (
            <div key={session.id} onClick={() => navigate(`/lms/recitation/${session.id}`)} className="cursor-pointer">
            <Card
              className="hover:shadow-md transition-shadow"
            >
              <CardBody className="py-3.5">
                <div className="flex items-center gap-4 flex-wrap">
                  {/* Student avatar + name */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
                      <User size={16} className="text-brand-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 text-sm truncate">
                        {fullName(session.student)}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        Teacher: {fullName(session.teacher)}
                        {' · '}
                        {new Date(session.scheduledAt).toLocaleDateString('en-CA', {
                          weekday: 'short', month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Progress mini bar */}
                  <div className="w-36 hidden sm:block">
                    <JuzProgress studentId={session.studentId} />
                  </div>

                  {/* Attempts count */}
                  <div className="flex items-center gap-1 text-xs text-slate-500 shrink-0">
                    <BookOpen size={12} />
                    {session._count?.attempts ?? 0} pages
                  </div>

                  {/* Status badge */}
                  <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium shrink-0', STATUS_COLOR[session.status])}>
                    {session.status === 'IN_PROGRESS' && (
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mr-1" />
                    )}
                    {session.status.replace('_', ' ')}
                  </span>

                  <ChevronRight size={16} className="text-slate-300 shrink-0" />
                </div>
              </CardBody>
            </Card>
            </div>
          ))}
        </div>
      )}

      {/* Create session modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Recitation Session">
        <div className="flex flex-col gap-4">
          <Select
            label="Student"
            value={form.studentId}
            onChange={e => setForm(f => ({ ...f, studentId: e.target.value }))}
            options={[
              { value: '', label: 'Select a student…' },
              ...students.map(s => ({ value: s.id, label: `${fullName(s)} — ${s.email}` })),
            ]}
          />

          <Input
            label="Scheduled Date & Time"
            type="datetime-local"
            value={form.scheduledAt}
            onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))}
          />

          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Notes (optional)</label>
            <textarea
              rows={2}
              value={form.overallNotes}
              onChange={e => setForm(f => ({ ...f, overallNotes: e.target.value }))}
              placeholder="Any pre-session notes…"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} loading={createMut.isPending} icon={<Plus size={14} />}>
              Create & Open
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
