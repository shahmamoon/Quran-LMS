import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Users, BookOpen, TrendingUp, AlertTriangle, CheckCircle2,
  Flag, RotateCcw, ChevronRight, Search,
} from 'lucide-react';
import { api } from '../../lib/api';
import { Card, CardBody, CardHeader, Spinner, EmptyState, ProgressBar } from '../../components/ui';
import { cn, fullName } from '../../lib/utils';
import type { User, ProgressSummary } from '../../types';

// Per-student row in the analytics table
function StudentRow({ student, onClick }: { student: User; onClick: () => void }) {
  const { data: summary } = useQuery({
    queryKey: ['recitation-summary', student.id],
    queryFn: () =>
      api
        .get<{ data: ProgressSummary }>(`/recitation/progress/${student.id}/summary`)
        .then(r => r.data.data),
    staleTime: 60_000,
  });

  const completed    = summary?.statusBreakdown.find(s => s.status === 'COMPLETED')?.count ?? 0;
  const needsReview  = summary?.needsReview.length ?? 0;
  const totalWorked  = summary?.totalPagesWorked ?? 0;
  const topError     = summary?.topErrors[0];
  const pct          = Math.round((completed / 604) * 100);

  return (
    <div
      className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors cursor-pointer border-b border-slate-100 last:border-0"
      onClick={onClick}
    >
      {/* Student name */}
      <div className="min-w-0 w-40 shrink-0">
        <p className="text-sm font-medium text-slate-800 truncate">{fullName(student)}</p>
        <p className="text-xs text-slate-400 truncate">{student.grade ?? 'No grade'}</p>
      </div>

      {/* Progress bar */}
      <div className="flex-1 min-w-0 hidden sm:block">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs tabular-nums text-slate-500 shrink-0">{completed}/604</span>
        </div>
      </div>

      {/* Pages worked */}
      <div className="w-20 text-center shrink-0 hidden md:block">
        <p className="text-sm font-semibold text-slate-700">{totalWorked}</p>
        <p className="text-[10px] text-slate-400">worked</p>
      </div>

      {/* Needs review */}
      <div className="w-16 text-center shrink-0">
        {needsReview > 0 ? (
          <span className="inline-flex items-center gap-0.5 text-xs text-red-600 font-medium">
            <Flag size={10} /> {needsReview}
          </span>
        ) : (
          <span className="text-xs text-slate-300">—</span>
        )}
      </div>

      {/* Top error */}
      <div className="w-28 shrink-0 hidden lg:block">
        {topError ? (
          <span className="text-xs bg-orange-50 text-orange-700 border border-orange-200 px-1.5 py-0.5 rounded truncate block text-center">
            {topError.rule.nameEn}
          </span>
        ) : (
          <span className="text-xs text-slate-300 text-center block">—</span>
        )}
      </div>

      <ChevronRight size={14} className="text-slate-300 shrink-0" />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function RecitationAnalytics() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['students-active'],
    queryFn: () =>
      api
        .get<{ data: User[] }>('/users', { params: { role: 'STUDENT', limit: 500 } })
        .then(r => r.data.data.filter(u => u.status === 'ACTIVE')),
    staleTime: 60_000,
  });

  const filtered = students.filter(s =>
    search.trim() === '' ||
    fullName(s).toLowerCase().includes(search.toLowerCase()) ||
    (s.email ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Recitation Analytics</h1>
        <p className="text-sm text-slate-500 mt-0.5">Overview of all students' Quran recitation progress</p>
      </div>

      {/* Platform stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardBody className="py-3">
            <p className="text-2xl font-bold text-slate-800">{students.length}</p>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1"><Users size={11} /> Active students</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <p className="text-2xl font-bold text-slate-800">604</p>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1"><BookOpen size={11} /> Total pages</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <p className="text-2xl font-bold text-emerald-600">
              <span className="text-sm font-normal text-slate-400 mr-1">per student avg</span>
            </p>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1"><TrendingUp size={11} /> In progress</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="py-3">
            <p className="text-2xl font-bold text-amber-600">30</p>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1"><BookOpen size={11} /> Juz total</p>
          </CardBody>
        </Card>
      </div>

      {/* Student table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="font-semibold text-slate-800">Student Progress</h2>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search students…"
                className="pl-7 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300 w-48"
              />
            </div>
          </div>
          {/* Column headers */}
          <div className="flex items-center gap-4 px-0 mt-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            <span className="w-40 shrink-0">Student</span>
            <span className="flex-1 hidden sm:block">Pages Completed</span>
            <span className="w-20 text-center hidden md:block">Worked</span>
            <span className="w-16 text-center">Review</span>
            <span className="w-28 text-center hidden lg:block">Top Error</span>
            <span className="w-4" />
          </div>
        </CardHeader>

        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : filtered.length === 0 ? (
          <EmptyState title="No students found" description={search ? 'Try a different search.' : 'No active students yet.'} />
        ) : (
          <div>
            {filtered.map(student => (
              <StudentRow
                key={student.id}
                student={student}
                onClick={() => navigate(`/lms/recitation/student/${student.id}`)}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
