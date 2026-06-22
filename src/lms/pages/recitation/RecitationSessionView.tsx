import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, BookOpen, AlertTriangle, CheckCircle2, RotateCcw,
  Clock, Plus, X, Save, BookMarked, Flag
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import { Button, Card, CardBody, Badge, Modal, Spinner, EmptyState } from '../../components/ui';
import { cn, fullName } from '../../lib/utils';
import { toast } from 'sonner';
import type {
  RecitationSession, QuranPage, PageProgress, TajweedRule,
  PageAttempt, PageStatus, ErrorSeverity
} from '../../types';
import MushaafGrid from './MushaafGrid';

// ── Status helpers ────────────────────────────────────────────────────────────

const PAGE_STATUS_CONFIG: Record<PageStatus, { label: string; color: string; icon: React.ReactNode }> = {
  INTRODUCED:   { label: 'Introduced',    color: 'bg-sky-100 text-sky-800 border-sky-300',       icon: <BookOpen size={12} /> },
  PRACTICING:   { label: 'Practicing',    color: 'bg-amber-100 text-amber-800 border-amber-300',  icon: <RotateCcw size={12} /> },
  COMPLETED:    { label: 'Completed',     color: 'bg-emerald-100 text-emerald-800 border-emerald-400', icon: <CheckCircle2 size={12} /> },
  NEEDS_REVIEW: { label: 'Needs Review',  color: 'bg-red-100 text-red-800 border-red-400',        icon: <Flag size={12} /> },
};

const SEVERITY_CONFIG: Record<ErrorSeverity, { label: string; color: string }> = {
  MINOR:    { label: 'Minor',    color: 'bg-yellow-50 text-yellow-700 border-yellow-300' },
  MODERATE: { label: 'Moderate', color: 'bg-orange-50 text-orange-700 border-orange-300' },
  MAJOR:    { label: 'Major',    color: 'bg-red-50 text-red-700 border-red-400' },
};

// ── Error entry form row ──────────────────────────────────────────────────────

interface ErrorEntry {
  ruleId: string;
  ayahNumber: string;
  severity: ErrorSeverity;
  note: string;
}

const emptyError = (): ErrorEntry => ({ ruleId: '', ayahNumber: '', severity: 'MODERATE', note: '' });

// ── Main component ────────────────────────────────────────────────────────────

export default function RecitationSessionView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuthStore();

  const [selectedPage, setSelectedPage] = useState<QuranPage | null>(null);
  const [attemptForm, setAttemptForm] = useState({
    status: 'INTRODUCED' as PageStatus,
    masteryScore: '70',
    teacherNotes: '',
  });
  const [errors, setErrors] = useState<ErrorEntry[]>([]);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [overallNotes, setOverallNotes] = useState('');

  // ── Queries ────────────────────────────────────────────────────

  const { data: session, isLoading: loadingSession } = useQuery({
    queryKey: ['recitation-session', id],
    queryFn: () => api.get<{ data: RecitationSession }>(`/recitation/sessions/${id}`).then(r => r.data.data),
    enabled: !!id,
  });

  const { data: pages = [], isError: pagesError } = useQuery({
    queryKey: ['quran-pages'],
    queryFn: () => api.get<{ data: QuranPage[] }>('/recitation/pages').then(r => r.data.data),
    staleTime: Infinity,
  });

  const { data: rules = [] } = useQuery({
    queryKey: ['tajweed-rules'],
    queryFn: () => api.get<{ data: TajweedRule[] }>('/recitation/rules').then(r => r.data.data),
    staleTime: Infinity,
  });

  const { data: progress = [] } = useQuery({
    queryKey: ['recitation-progress', session?.studentId],
    queryFn: () => api.get<{ data: PageProgress[] }>(`/recitation/progress/${session!.studentId}`).then(r => r.data.data),
    enabled: !!session?.studentId,
  });

  // Current session attempts (live, not from MV)
  const sessionAttempts: PageAttempt[] = session?.attempts ?? [];

  // ── Mutations ──────────────────────────────────────────────────

  const logAttemptMut = useMutation({
    mutationFn: (body: object) => api.post(`/recitation/sessions/${id}/attempts`, body).then(r => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recitation-session', id] });
      qc.invalidateQueries({ queryKey: ['recitation-progress', session?.studentId] });
      setSelectedPage(null);
      setErrors([]);
      setAttemptForm({ status: 'INTRODUCED', masteryScore: '70', teacherNotes: '' });
      toast.success('Page logged');
    },
    onError: () => toast.error('Failed to log page attempt'),
  });

  const startSessionMut = useMutation({
    mutationFn: () => api.patch(`/recitation/sessions/${id}`, { status: 'IN_PROGRESS', startedAt: new Date().toISOString() }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['recitation-session', id] }); toast.success('Session started'); },
  });

  const closeSessionMut = useMutation({
    mutationFn: () => api.patch(`/recitation/sessions/${id}`, {
      status: 'COMPLETED',
      endedAt: new Date().toISOString(),
      durationMins: session?.startedAt
        ? Math.round((Date.now() - new Date(session.startedAt).getTime()) / 60000)
        : null,
      overallNotes: overallNotes || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recitation-session', id] });
      qc.invalidateQueries({ queryKey: ['recitation-progress', session?.studentId] });
      setShowCloseConfirm(false);
      toast.success('Session closed and progress saved');
    },
    onError: () => toast.error('Failed to close session'),
  });

  // ── Helpers ────────────────────────────────────────────────────

  function addError() { setErrors(e => [...e, emptyError()]); }
  function removeError(i: number) { setErrors(e => e.filter((_, idx) => idx !== i)); }
  function updateError(i: number, patch: Partial<ErrorEntry>) {
    setErrors(e => e.map((err, idx) => idx === i ? { ...err, ...patch } : err));
  }

  function submitAttempt() {
    if (!selectedPage) return;
    const score = parseInt(attemptForm.masteryScore);
    logAttemptMut.mutate({
      pageNumber:   selectedPage.pageNumber,
      status:       attemptForm.status,
      masteryScore: isNaN(score) ? null : Math.min(100, Math.max(0, score)),
      teacherNotes: attemptForm.teacherNotes || null,
      errors: errors
        .filter(e => e.ruleId)
        .map(e => ({
          ruleId:     e.ruleId,
          ayahNumber: e.ayahNumber ? parseInt(e.ayahNumber) : null,
          severity:   e.severity,
          note:       e.note || null,
        })),
    });
  }

  // Pages worked this session
  const sessionPageNums = new Set(sessionAttempts.map(a => a.pageNumber));

  // ── Render ─────────────────────────────────────────────────────

  if (loadingSession) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Spinner />
    </div>
  );

  if (!session) return (
    <EmptyState title="Session not found" description="This session doesn't exist or you don't have access." />
  );

  const isActive = session.status === 'IN_PROGRESS';
  const isClosed = session.status === 'COMPLETED' || session.status === 'CANCELLED';
  const canEdit = !isClosed && (user?.role === 'ADMIN' || user?.id === session.teacherId);

  const groupedRules = rules.reduce<Record<string, TajweedRule[]>>((acc, rule) => {
    acc[rule.category] = [...(acc[rule.category] ?? []), rule];
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-5 max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/lms/recitation')}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              {fullName(session.student)} — Recitation Session
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {new Date(session.scheduledAt).toLocaleDateString('en-CA', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
              {' · '}Teacher: {fullName(session.teacher)}
              {session.durationMins && ` · ${session.durationMins} min`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border',
            session.status === 'SCHEDULED'   && 'bg-blue-50 text-blue-700 border-blue-200',
            session.status === 'IN_PROGRESS' && 'bg-emerald-50 text-emerald-700 border-emerald-300',
            session.status === 'COMPLETED'   && 'bg-slate-100 text-slate-600 border-slate-200',
            session.status === 'CANCELLED'   && 'bg-red-50 text-red-600 border-red-200',
          )}>
            {session.status === 'IN_PROGRESS' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
            {session.status.replace('_', ' ')}
          </span>
          {canEdit && session.status === 'SCHEDULED' && (
            <Button size="sm" onClick={() => startSessionMut.mutate()} loading={startSessionMut.isPending}>
              Start Session
            </Button>
          )}
          {canEdit && isActive && (
            <Button size="sm" variant="danger" onClick={() => setShowCloseConfirm(true)}>
              Close Session
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5">
        {/* Left: Mushaf grid */}
        <Card>
          <CardBody>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                <BookMarked size={16} className="text-brand-500" />
                Quran — 604 Pages
              </h2>
              <span className="text-xs text-slate-400">
                {sessionPageNums.size} page{sessionPageNums.size !== 1 ? 's' : ''} this session
                {' · '}
                {progress.filter(p => p.currentStatus === 'COMPLETED').length} completed total
              </span>
            </div>
            {pagesError ? (
              <p className="text-sm text-red-500 py-8 text-center">
                Failed to load Quran pages. Ensure Quran data is seeded (<code>pnpm db:seed:quran</code>).
              </p>
            ) : (
              <MushaafGrid
                pages={pages}
                progress={progress}
                selectedPage={selectedPage?.pageNumber ?? null}
                onPageClick={page => { if (canEdit && isActive) setSelectedPage(page); }}
                highlightReview
                showPageViewer
                allowHighlight={canEdit}
              />
            )}
            {!isActive && !isClosed && (
              <p className="text-sm text-slate-400 mt-4 text-center">Start the session to log page attempts.</p>
            )}
          </CardBody>
        </Card>

        {/* Right: page panel + session log */}
        <div className="flex flex-col gap-4">
          {/* Page attempt panel */}
          {canEdit && isActive && (
            <Card>
              <CardBody>
                {!selectedPage ? (
                  <div className="flex flex-col items-center gap-2 py-6 text-center">
                    <BookOpen size={28} className="text-slate-300" />
                    <p className="text-sm text-slate-500">Tap a page on the grid to log it</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {/* Page header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">Page {selectedPage.pageNumber}</p>
                        <p className="text-sm text-slate-500">
                          {selectedPage.surahNameEn}
                          {selectedPage.isStartOfSurah ? ' (start)' : ` · from ayah ${selectedPage.ayahStart}`}
                          {' · Juz '}{selectedPage.juzNumber}
                        </p>
                        {/* prior status badge */}
                        {(() => {
                          const prior = progress.find(p => p.pageNumber === selectedPage.pageNumber);
                          return prior?.currentStatus ? (
                            <span className={cn('inline-flex items-center gap-1 mt-1 text-xs px-2 py-0.5 rounded-full border',
                              PAGE_STATUS_CONFIG[prior.currentStatus].color)}>
                              {PAGE_STATUS_CONFIG[prior.currentStatus].icon}
                              Previously: {PAGE_STATUS_CONFIG[prior.currentStatus].label}
                              {prior.masteryScore != null && ` (${prior.masteryScore}%)`}
                            </span>
                          ) : null;
                        })()}
                      </div>
                      <button onClick={() => setSelectedPage(null)} className="text-slate-400 hover:text-slate-600">
                        <X size={16} />
                      </button>
                    </div>

                    {/* Status */}
                    <div>
                      <label className="text-xs font-medium text-slate-600 mb-1.5 block">Status after this session</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(['INTRODUCED', 'PRACTICING', 'COMPLETED', 'NEEDS_REVIEW'] as PageStatus[]).map(s => (
                          <button
                            key={s}
                            onClick={() => setAttemptForm(f => ({ ...f, status: s }))}
                            className={cn(
                              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all',
                              attemptForm.status === s
                                ? PAGE_STATUS_CONFIG[s].color + ' font-semibold'
                                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                            )}
                          >
                            {PAGE_STATUS_CONFIG[s].icon}
                            {PAGE_STATUS_CONFIG[s].label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Mastery score */}
                    <div>
                      <label className="text-xs font-medium text-slate-600 mb-1.5 block flex items-center justify-between">
                        Mastery Score
                        <span className="text-slate-400 font-normal">0–100</span>
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="range" min={0} max={100} step={5}
                          value={attemptForm.masteryScore}
                          onChange={e => setAttemptForm(f => ({ ...f, masteryScore: e.target.value }))}
                          className="flex-1 accent-brand-500"
                        />
                        <span className="w-10 text-center text-sm font-semibold text-slate-700">
                          {attemptForm.masteryScore}%
                        </span>
                      </div>
                    </div>

                    {/* Teacher notes */}
                    <div>
                      <label className="text-xs font-medium text-slate-600 mb-1.5 block">Notes</label>
                      <textarea
                        rows={2}
                        value={attemptForm.teacherNotes}
                        onChange={e => setAttemptForm(f => ({ ...f, teacherNotes: e.target.value }))}
                        placeholder="General notes on this page…"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none"
                      />
                    </div>

                    {/* Tajweed errors */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-medium text-slate-600 flex items-center gap-1">
                          <AlertTriangle size={12} className="text-amber-500" />
                          Tajweed Errors
                        </label>
                        <button onClick={addError} className="text-xs text-brand-500 hover:text-brand-600 flex items-center gap-1 font-medium">
                          <Plus size={12} /> Add error
                        </button>
                      </div>
                      {errors.length === 0 && (
                        <p className="text-xs text-slate-400">No errors logged — tap "Add error" to record one.</p>
                      )}
                      <div className="flex flex-col gap-2">
                        {errors.map((err, i) => (
                          <div key={i} className="relative bg-slate-50 rounded-lg p-2.5 border border-slate-200">
                            <button
                              onClick={() => removeError(i)}
                              className="absolute top-2 right-2 text-slate-400 hover:text-red-500"
                            >
                              <X size={12} />
                            </button>
                            <div className="grid grid-cols-2 gap-2 mb-2">
                              {/* Rule selector */}
                              <div className="col-span-2">
                                <select
                                  value={err.ruleId}
                                  onChange={e => updateError(i, { ruleId: e.target.value })}
                                  className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-300"
                                >
                                  <option value="">— Select rule —</option>
                                  {Object.entries(groupedRules).map(([cat, catRules]) => (
                                    <optgroup key={cat} label={cat.replace(/_/g, ' ')}>
                                      {catRules.map(r => (
                                        <option key={r.id} value={r.id}>{r.nameEn} ({r.nameAr})</option>
                                      ))}
                                    </optgroup>
                                  ))}
                                </select>
                              </div>
                              {/* Severity */}
                              <select
                                value={err.severity}
                                onChange={e => updateError(i, { severity: e.target.value as ErrorSeverity })}
                                className="rounded border border-slate-300 px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-300"
                              >
                                <option value="MINOR">Minor</option>
                                <option value="MODERATE">Moderate</option>
                                <option value="MAJOR">Major</option>
                              </select>
                              {/* Ayah number */}
                              <input
                                type="number" min={1} placeholder="Ayah #"
                                value={err.ayahNumber}
                                onChange={e => updateError(i, { ayahNumber: e.target.value })}
                                className="rounded border border-slate-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-300"
                              />
                            </div>
                            <input
                              type="text" placeholder="Optional note on this error"
                              value={err.note}
                              onChange={e => updateError(i, { note: e.target.value })}
                              className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-300"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <Button onClick={submitAttempt} loading={logAttemptMut.isPending} icon={<Save size={14} />}>
                      Log Page {selectedPage.pageNumber}
                    </Button>
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          {/* Session log — pages worked this session */}
          <Card>
            <CardBody>
              <h3 className="font-semibold text-slate-800 text-sm mb-3 flex items-center gap-2">
                <Clock size={14} className="text-slate-400" />
                This Session ({sessionAttempts.length} pages)
              </h3>
              {sessionAttempts.length === 0 ? (
                <p className="text-xs text-slate-400">No pages logged yet.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {sessionAttempts.map(attempt => {
                    const cfg = PAGE_STATUS_CONFIG[attempt.status];
                    return (
                      <div key={attempt.id} className="flex items-center justify-between gap-2 py-1.5 border-b border-slate-100 last:border-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-mono font-semibold text-slate-600 shrink-0 w-8 text-right">
                            p.{attempt.pageNumber}
                          </span>
                          <span className="text-xs text-slate-500 truncate">
                            {attempt.page?.surahNameEn}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {attempt.errors.length > 0 && (
                            <span className="text-[10px] text-red-500 flex items-center gap-0.5">
                              <AlertTriangle size={10} />
                              {attempt.errors.length}
                            </span>
                          )}
                          {attempt.masteryScore != null && (
                            <span className="text-[10px] text-slate-500">{attempt.masteryScore}%</span>
                          )}
                          <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border font-medium', cfg.color)}>
                            {cfg.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Close session modal */}
      <Modal
        open={showCloseConfirm}
        onClose={() => setShowCloseConfirm(false)}
        title="Close Session"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-600">
            This will mark the session as completed and save progress to the student's Quran map.
          </p>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1.5 block">Overall session notes (optional)</label>
            <textarea
              rows={3}
              value={overallNotes}
              onChange={e => setOverallNotes(e.target.value)}
              placeholder="Any notes for the next teacher or for the student…"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-300 resize-none"
            />
          </div>
          {sessionAttempts.length === 0 && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200 text-sm text-amber-700">
              <AlertTriangle size={15} className="shrink-0 mt-0.5" />
              No pages were logged. Are you sure you want to close?
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setShowCloseConfirm(false)}>Cancel</Button>
            <Button variant="danger" onClick={() => closeSessionMut.mutate()} loading={closeSessionMut.isPending}>
              Close Session
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
