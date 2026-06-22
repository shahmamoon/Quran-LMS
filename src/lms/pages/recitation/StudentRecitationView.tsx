import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, Plus, BookMarked, Flag, Clock } from 'lucide-react';
import { api } from '../../lib/api';
import { Button, Card, CardBody, Spinner, EmptyState } from '../../components/ui';
import { cn, fullName } from '../../lib/utils';
import type { User, QuranPage, PageProgress, ProgressSummary, RecitationSession } from '../../types';
import MushaafGrid from './MushaafGrid';

export default function StudentRecitationView() {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const [selectedPage, setSelectedPage] = useState<QuranPage | null>(null);

  const { data: student } = useQuery({
    queryKey: ['user', studentId],
    queryFn: () => api.get<{ data: User }>(`/users/${studentId}`).then(r => r.data.data),
    enabled: !!studentId,
  });

  const { data: pages = [] } = useQuery({
    queryKey: ['quran-pages'],
    queryFn: () => api.get<{ data: QuranPage[] }>('/recitation/pages').then(r => r.data.data),
    staleTime: Infinity,
  });

  const { data: progress = [], isLoading } = useQuery({
    queryKey: ['recitation-progress', studentId],
    queryFn: () => api.get<{ data: PageProgress[] }>(`/recitation/progress/${studentId}`).then(r => r.data.data),
    enabled: !!studentId,
  });

  const { data: summary } = useQuery({
    queryKey: ['recitation-summary', studentId],
    queryFn: () => api.get<{ data: ProgressSummary }>(`/recitation/progress/${studentId}/summary`).then(r => r.data.data),
    enabled: !!studentId,
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['recitation-sessions', studentId],
    queryFn: () => api.get<{ data: RecitationSession[] }>('/recitation/sessions', { params: { studentId } }).then(r => r.data.data),
    enabled: !!studentId,
  });

  const { data: pageDetail } = useQuery({
    queryKey: ['page-history', studentId, selectedPage?.pageNumber],
    queryFn: () =>
      api.get<{ data: { page: QuranPage; attempts: any[] } }>(
        `/recitation/progress/${studentId}/page/${selectedPage!.pageNumber}`
      ).then(r => r.data.data),
    enabled: !!studentId && !!selectedPage,
  });

  if (isLoading || !student) return (
    <div className="flex items-center justify-center min-h-[400px]"><Spinner /></div>
  );

  const completed   = summary?.statusBreakdown.find(s => s.status === 'COMPLETED')?.count ?? 0;
  const needsReview = summary?.needsReview.length ?? 0;
  const pct         = Math.round((completed / 604) * 100);

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
          >
            <ChevronLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{fullName(student)}</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {student.grade ?? 'No grade'} · {student.email} ·{' '}
              <span className="text-emerald-600 font-medium">{completed}/604</span> pages completed ({pct}%)
            </p>
          </div>
        </div>
        <Link to="/lms/recitation">
          <Button size="sm" icon={<Plus size={14} />}>New Session</Button>
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Completed', value: completed, color: 'text-emerald-600' },
          { label: 'Pages Worked', value: summary?.totalPagesWorked ?? 0, color: 'text-slate-800' },
          { label: 'Sessions', value: sessions.length, color: 'text-slate-800' },
          { label: 'Needs Review', value: needsReview, color: needsReview > 0 ? 'text-red-600' : 'text-slate-400' },
        ].map(s => (
          <Card key={s.label}>
            <CardBody className="py-3">
              <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Top errors */}
      {summary && summary.topErrors.length > 0 && (
        <Card>
          <CardBody className="py-3.5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Most Common Errors</p>
            <div className="flex flex-wrap gap-2">
              {summary.topErrors.map(e => (
                <span key={e.rule.id} className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                  {e.rule.nameEn} ({e.rule.nameAr})
                  <span className="text-orange-400">×{e.count}</span>
                </span>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Grid + detail */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-5">
        <Card>
          <CardBody>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                <BookMarked size={16} className="text-brand-500" />
                604-Page Map
              </h2>
              {needsReview > 0 && (
                <span className="text-xs flex items-center gap-1 text-red-500">
                  <Flag size={11} /> {needsReview} flagged for review
                </span>
              )}
            </div>
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

        {/* Right panel: page detail or sessions */}
        <div className="flex flex-col gap-4">
          {selectedPage ? (
            <Card>
              <CardBody>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-slate-900">Page {selectedPage.pageNumber}</p>
                    <p className="text-sm text-slate-500">{selectedPage.surahNameEn} · Juz {selectedPage.juzNumber}</p>
                  </div>
                  <button onClick={() => setSelectedPage(null)} className="text-slate-400 hover:text-slate-600 text-lg leading-none">×</button>
                </div>
                {!pageDetail ? (
                  <Spinner />
                ) : pageDetail.attempts.length === 0 ? (
                  <p className="text-sm text-slate-400">No attempts on this page yet.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {pageDetail.attempts.map((attempt: any) => (
                      <div key={attempt.id} className="py-2 border-b border-slate-100 last:border-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs text-slate-600">
                            {new Date(attempt.createdAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
                            {' · '}{attempt.teacher?.firstName}
                          </p>
                          <div className="flex items-center gap-1.5">
                            {attempt.masteryScore != null && (
                              <span className="text-xs font-semibold text-slate-700">{attempt.masteryScore}%</span>
                            )}
                            <span className={cn(
                              'text-[10px] px-1.5 py-0.5 rounded-full border font-medium',
                              attempt.status === 'COMPLETED'    && 'bg-emerald-50 text-emerald-700 border-emerald-300',
                              attempt.status === 'NEEDS_REVIEW' && 'bg-red-50 text-red-700 border-red-300',
                              attempt.status === 'PRACTICING'   && 'bg-amber-50 text-amber-700 border-amber-300',
                              attempt.status === 'INTRODUCED'   && 'bg-sky-50 text-sky-700 border-sky-300',
                            )}>
                              {attempt.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                        {attempt.teacherNotes && (
                          <p className="text-xs text-slate-500 italic mb-1">"{attempt.teacherNotes}"</p>
                        )}
                        {attempt.errors.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {attempt.errors.map((e: any) => (
                              <span key={e.id} className={cn(
                                'text-[10px] px-1.5 py-0.5 rounded border',
                                e.severity === 'MAJOR'    && 'bg-red-50 text-red-600 border-red-200',
                                e.severity === 'MODERATE' && 'bg-orange-50 text-orange-600 border-orange-200',
                                e.severity === 'MINOR'    && 'bg-yellow-50 text-yellow-600 border-yellow-200',
                              )}>
                                {e.rule.nameEn}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          ) : null}

          {/* Recent sessions */}
          <Card>
            <CardBody>
              <h3 className="font-semibold text-slate-800 text-sm mb-3 flex items-center gap-2">
                <Clock size={14} className="text-slate-400" />
                Sessions ({sessions.length})
              </h3>
              {sessions.length === 0 ? (
                <p className="text-xs text-slate-400">No sessions yet.</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {sessions.slice(0, 8).map(s => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between gap-2 py-1.5 border-b border-slate-100 last:border-0 cursor-pointer hover:bg-slate-50 -mx-2 px-2 rounded"
                      onClick={() => navigate(`/lms/recitation/${s.id}`)}
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-700 truncate">
                          {new Date(s.scheduledAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                        <p className="text-[10px] text-slate-400">{s._count?.attempts ?? 0} pages</p>
                      </div>
                      <span className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded-full border font-medium shrink-0',
                        s.status === 'COMPLETED'   && 'bg-slate-100 text-slate-600 border-slate-200',
                        s.status === 'SCHEDULED'   && 'bg-blue-50 text-blue-700 border-blue-200',
                        s.status === 'IN_PROGRESS' && 'bg-emerald-50 text-emerald-700 border-emerald-300',
                        s.status === 'CANCELLED'   && 'bg-red-50 text-red-600 border-red-200',
                      )}>
                        {s.status.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                  {sessions.length > 8 && (
                    <Link to="/lms/recitation" className="text-xs text-brand-500 hover:text-brand-600 mt-1">
                      View all {sessions.length} sessions →
                    </Link>
                  )}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
