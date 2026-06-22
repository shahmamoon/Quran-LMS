import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  BookMarked, CheckCircle2, RotateCcw, Flag, BookOpen,
  AlertTriangle, ChevronRight, Clock, TrendingUp,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import { Card, CardBody, CardHeader, Spinner, EmptyState, ProgressBar } from '../../components/ui';
import { cn } from '../../lib/utils';
import type {
  PageProgress, ProgressSummary, RecitationSession, QuranPage, PageStatus,
} from '../../types';
import MushaafGrid from './MushaafGrid';

const STATUS_COLOR: Record<PageStatus, string> = {
  INTRODUCED:   'bg-sky-100 text-sky-700 border-sky-300',
  PRACTICING:   'bg-amber-100 text-amber-700 border-amber-300',
  COMPLETED:    'bg-emerald-100 text-emerald-700 border-emerald-400',
  NEEDS_REVIEW: 'bg-red-100 text-red-700 border-red-400',
};

const STATUS_ICON: Record<PageStatus, React.ReactNode> = {
  INTRODUCED:   <BookOpen size={12} />,
  PRACTICING:   <RotateCcw size={12} />,
  COMPLETED:    <CheckCircle2 size={12} />,
  NEEDS_REVIEW: <Flag size={12} />,
};

// ── Page detail drawer (shown when student taps a page) ──────────────────────
function PageDrawer({
  page,
  progress,
  onClose,
}: {
  page: QuranPage;
  progress: PageProgress | undefined;
  onClose: () => void;
}) {
  const { user } = useAuthStore();

  const { data } = useQuery({
    queryKey: ['page-history', user?.id, page.pageNumber],
    queryFn: () =>
      api
        .get<{ data: { page: QuranPage; attempts: any[] } }>(
          `/recitation/progress/${user!.id}/page/${page.pageNumber}`,
        )
        .then(r => r.data.data),
    enabled: !!user,
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Page info */}
      <div className="flex items-start justify-between">
        <div>
          <p className="font-bold text-slate-900 text-lg">Page {page.pageNumber}</p>
          <p className="text-sm text-slate-500">
            {page.surahNameEn} ({page.surahNameAr})
            {page.isStartOfSurah ? ' — beginning of Surah' : ` · from Ayah ${page.ayahStart}`}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">Juz {page.juzNumber}</p>
        </div>
        {progress?.currentStatus && (
          <span className={cn('inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border', STATUS_COLOR[progress.currentStatus])}>
            {STATUS_ICON[progress.currentStatus]}
            {progress.currentStatus.replace('_', ' ')}
          </span>
        )}
      </div>

      {/* Stats */}
      {progress && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-50 rounded-lg p-2.5 text-center">
            <p className="text-lg font-bold text-slate-800">{progress.attemptCount}</p>
            <p className="text-[10px] text-slate-500">Sessions</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-2.5 text-center">
            <p className="text-lg font-bold text-slate-800">
              {progress.masteryScore != null ? `${progress.masteryScore}%` : '—'}
            </p>
            <p className="text-[10px] text-slate-500">Mastery</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-2.5 text-center">
            <p className={cn('text-lg font-bold', progress.majorErrorCount > 0 ? 'text-red-600' : 'text-slate-800')}>
              {progress.majorErrorCount}
            </p>
            <p className="text-[10px] text-slate-500">Major Errors</p>
          </div>
        </div>
      )}

      {/* History */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Session History</p>
        {!data ? (
          <Spinner />
        ) : data.attempts.length === 0 ? (
          <p className="text-sm text-slate-400">This page hasn't been taught yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {data.attempts.map((attempt: any) => (
              <div key={attempt.id} className="flex items-start justify-between gap-2 py-2 border-b border-slate-100 last:border-0">
                <div className="min-w-0">
                  <p className="text-xs text-slate-600">
                    {new Date(attempt.createdAt).toLocaleDateString('en-CA', {
                      weekday: 'short', month: 'short', day: 'numeric',
                    })}
                    {' · '}Teacher: {attempt.teacher?.firstName} {attempt.teacher?.lastName}
                  </p>
                  {attempt.teacherNotes && (
                    <p className="text-xs text-slate-500 mt-0.5 italic">"{attempt.teacherNotes}"</p>
                  )}
                  {attempt.errors.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {attempt.errors.map((e: any) => (
                        <span
                          key={e.id}
                          className={cn(
                            'text-[10px] px-1.5 py-0.5 rounded border',
                            e.severity === 'MAJOR'    && 'bg-red-50 text-red-600 border-red-300',
                            e.severity === 'MODERATE' && 'bg-orange-50 text-orange-600 border-orange-300',
                            e.severity === 'MINOR'    && 'bg-yellow-50 text-yellow-600 border-yellow-300',
                          )}
                        >
                          {e.rule.nameEn}
                          {e.ayahNumber ? ` (Ayah ${e.ayahNumber})` : ''}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {attempt.masteryScore != null && (
                    <span className="text-xs font-semibold text-slate-700">{attempt.masteryScore}%</span>
                  )}
                  <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border font-medium', STATUS_COLOR[attempt.status as PageStatus])}>
                    {attempt.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function MyQuranProgress() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [selectedPage, setSelectedPage] = useState<QuranPage | null>(null);
  const [activeTab, setActiveTab] = useState<'map' | 'sessions' | 'review'>('map');

  const { data: pages = [] } = useQuery({
    queryKey: ['quran-pages'],
    queryFn: () => api.get<{ data: QuranPage[] }>('/recitation/pages').then(r => r.data.data),
    staleTime: Infinity,
  });

  const { data: progress = [], isLoading: loadingProgress } = useQuery({
    queryKey: ['recitation-progress', user?.id],
    queryFn: () =>
      api.get<{ data: PageProgress[] }>(`/recitation/progress/${user!.id}`).then(r => r.data.data),
    enabled: !!user,
  });

  const { data: summary } = useQuery({
    queryKey: ['recitation-summary', user?.id],
    queryFn: () =>
      api.get<{ data: ProgressSummary }>(`/recitation/progress/${user!.id}/summary`).then(r => r.data.data),
    enabled: !!user,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['recitation-sessions'],
    queryFn: () =>
      api.get<{ data: RecitationSession[] }>('/recitation/sessions').then(r => r.data.data),
    enabled: !!user,
  });

  const progressMap = new Map(progress.map(p => [p.pageNumber, p]));
  const completed   = summary?.statusBreakdown.find(s => s.status === 'COMPLETED')?.count ?? 0;
  const worked      = summary?.totalPagesWorked ?? 0;
  const pct         = Math.round((completed / 604) * 100);

  if (loadingProgress) return (
    <div className="flex items-center justify-center min-h-[400px]"><Spinner /></div>
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Quran Progress</h1>
        <p className="text-sm text-slate-500 mt-0.5">Track your recitation journey across all 604 pages</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardBody className="py-3">
            <p className="text-2xl font-bold text-emerald-600">{completed}</p>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
              <CheckCircle2 size={11} /> Completed pages
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <p className="text-2xl font-bold text-slate-800">{worked}</p>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
              <BookOpen size={11} /> Pages worked
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <p className="text-2xl font-bold text-amber-600">{sessions.length}</p>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
              <Clock size={11} /> Sessions
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <p className={cn('text-2xl font-bold', (summary?.needsReview.length ?? 0) > 0 ? 'text-red-600' : 'text-slate-400')}>
              {summary?.needsReview.length ?? 0}
            </p>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
              <Flag size={11} /> Needs review
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Overall progress bar */}
      <Card>
        <CardBody className="py-3.5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
              <TrendingUp size={14} className="text-brand-500" /> Overall Completion
            </span>
            <span className="text-sm font-bold text-slate-800">{pct}% — {completed}/604 pages</span>
          </div>
          <ProgressBar value={completed} max={604} />
          {/* Juz mini bars */}
          {summary && summary.juzBreakdown.length > 0 && (
            <div className="mt-3">
              <p className="text-[10px] text-slate-400 mb-1.5 uppercase font-semibold tracking-wider">Progress by Juz</p>
              <div className="flex gap-0.5 h-4 rounded overflow-hidden">
                {Array.from({ length: 30 }, (_, i) => i + 1).map(juz => {
                  const juzData = summary.juzBreakdown.find(j => j.juzNumber === juz);
                  const pagesInJuz = juz < 30 ? 20 : 24; // approx
                  const pct = juzData ? Math.min(100, Math.round((juzData.pagesWorked / pagesInJuz) * 100)) : 0;
                  return (
                    <div
                      key={juz}
                      className="flex-1 bg-slate-100 relative"
                      title={`Juz ${juz}: ${juzData?.pagesWorked ?? 0} pages`}
                    >
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-brand-400 transition-all"
                        style={{ height: `${pct}%` }}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-[9px] text-slate-400 mt-0.5">
                <span>Juz 1</span><span>Juz 30</span>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {(['map', 'sessions', 'review'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors capitalize',
              activeTab === tab
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            {tab === 'review' ? `Needs Review${summary?.needsReview.length ? ` (${summary.needsReview.length})` : ''}` : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'map' && (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">
          <Card>
            <CardBody>
              <MushaafGrid
                pages={pages}
                progress={progress}
                selectedPage={selectedPage?.pageNumber ?? null}
                onPageClick={setSelectedPage}
                highlightReview
                showPageViewer
              />
            </CardBody>
          </Card>

          {/* Page detail panel */}
          <Card>
            <CardBody>
              {!selectedPage ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <BookMarked size={32} className="text-slate-200" />
                  <p className="text-sm text-slate-400">Tap any page to see your progress on it</p>
                </div>
              ) : (
                <PageDrawer
                  page={selectedPage}
                  progress={progressMap.get(selectedPage.pageNumber)}
                  onClose={() => setSelectedPage(null)}
                />
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {activeTab === 'sessions' && (
        <div className="flex flex-col gap-2">
          {sessions.length === 0 ? (
            <EmptyState title="No sessions yet" description="Your teacher will schedule recitation sessions for you." />
          ) : (
            sessions.map(session => (
              <div
                key={session.id}
                className="cursor-pointer"
                onClick={() => navigate(`/lms/recitation/${session.id}`)}
              >
                <Card className="hover:shadow-md transition-shadow">
                  <CardBody className="py-3">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800">
                          {new Date(session.scheduledAt).toLocaleDateString('en-CA', {
                            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                          })}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Teacher: {session.teacher.firstName} {session.teacher.lastName}
                          {session.durationMins ? ` · ${session.durationMins} min` : ''}
                          {' · '}{session._count?.attempts ?? 0} pages covered
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={cn(
                          'text-xs px-2 py-0.5 rounded-full border font-medium',
                          session.status === 'COMPLETED'   && 'bg-slate-100 text-slate-600 border-slate-200',
                          session.status === 'SCHEDULED'   && 'bg-blue-50 text-blue-700 border-blue-200',
                          session.status === 'IN_PROGRESS' && 'bg-emerald-50 text-emerald-700 border-emerald-300',
                          session.status === 'CANCELLED'   && 'bg-red-50 text-red-600 border-red-200',
                        )}>
                          {session.status.replace('_', ' ')}
                        </span>
                        <ChevronRight size={14} className="text-slate-300" />
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'review' && (
        <div>
          {!summary || summary.needsReview.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 size={32} />}
              title="Nothing needs review"
              description="Your teacher will flag pages that need more practice."
            />
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-slate-500 mb-1">
                These pages were flagged by your teacher. Tap to see details.
              </p>
              {summary.needsReview.map(item => {
                const page = pages.find(p => p.pageNumber === item.pageNumber);
                return (
                  <div
                    key={item.pageNumber}
                    className="cursor-pointer"
                    onClick={() => { setSelectedPage(page ?? null); setActiveTab('map'); }}
                  >
                    <Card className="hover:shadow-md transition-shadow border-red-200">
                      <CardBody className="py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center text-sm font-bold text-red-600">
                              {item.pageNumber}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-800">{item.surahNameEn}</p>
                              <p className="text-xs text-slate-400">
                                Last taught: {new Date(item.lastTaughtAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 text-red-500 text-xs font-medium">
                            <Flag size={13} /> Needs Review
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
