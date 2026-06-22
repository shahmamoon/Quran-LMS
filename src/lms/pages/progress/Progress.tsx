import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp, BookOpen, CheckCircle2, Users, Award, BarChart2,
  ChevronDown, Clock, GraduationCap, Search,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import { Card, CardBody, ProgressBar, Spinner, EmptyState, Badge, Avatar } from '../../components/ui';
import { fullName } from '../../lib/utils';
import type { Subject, Week, LessonProgress } from '../../types';

// ── Local types ────────────────────────────────────────────────
interface EnrolledStudent {
  user: { id: string; firstName: string; lastName: string; email: string; avatarUrl: string | null };
}
interface ProgressRecord { userId: string; lessonId: string; }

// ── Sub-component: one subject card for the teacher view ───────
function SubjectProgressCard({
  subject,
  students,
  progress,
}: {
  subject: Subject & { weeks: Week[] };
  students: EnrolledStudent[];
  progress: ProgressRecord[];
}) {
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const allLessons = subject.weeks.flatMap((w) => w.lessons);

  // Build per-student completed-lesson sets
  const progressByStudent = new Map<string, Set<string>>();
  progress.forEach((p) => {
    if (!progressByStudent.has(p.userId)) progressByStudent.set(p.userId, new Set());
    progressByStudent.get(p.userId)!.add(p.lessonId);
  });

  const avgPct = students.length === 0 || allLessons.length === 0
    ? 0
    : Math.round(
        students.reduce((sum, e) => {
          const done = progressByStudent.get(e.user.id)?.size ?? 0;
          return sum + (done / allLessons.length) * 100;
        }, 0) / students.length
      );

  const completedAll = students.filter(
    (e) => (progressByStudent.get(e.user.id)?.size ?? 0) >= allLessons.length && allLessons.length > 0
  ).length;

  const filtered = students.filter((e) =>
    search.trim() === '' ||
    `${e.user.firstName} ${e.user.lastName}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card>
      {/* Subject header */}
      <div className="px-6 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="w-3 h-3 rounded-full shrink-0" style={{ background: subject.color }} />
          <h2 className="font-semibold text-slate-800">{subject.title}</h2>
          {subject.grade && (
            <Badge variant="info" className="gap-1">
              <GraduationCap size={11} /> {subject.grade}
            </Badge>
          )}
          <div className="ml-auto flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1"><Users size={12} /> {students.length} student{students.length !== 1 ? 's' : ''}</span>
            <span className="flex items-center gap-1"><BarChart2 size={12} /> {avgPct}% avg</span>
            {completedAll > 0 && (
              <span className="flex items-center gap-1 text-green-600"><Award size={12} /> {completedAll} finished</span>
            )}
          </div>
        </div>

        {/* Subject-level progress bar */}
        <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${avgPct === 100 ? 'bg-green-500' : avgPct > 0 ? 'bg-brand-500' : 'bg-slate-200'}`}
            style={{ width: `${avgPct}%` }}
          />
        </div>
      </div>

      {/* Student list */}
      {students.length === 0 ? (
        <div className="px-6 py-5 text-sm text-slate-400">No students enrolled in this subject yet.</div>
      ) : (
        <>
          {/* Search inside this subject (only shown when ≥5 students) */}
          {students.length >= 5 && (
            <div className="px-6 py-3 border-b border-slate-50">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search student…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          <ul className="divide-y divide-slate-100">
            {filtered.map((enrollment) => {
              const s = enrollment.user;
              const studentDoneSet = progressByStudent.get(s.id) ?? new Set<string>();
              const done = studentDoneSet.size;
              const pct = allLessons.length > 0 ? Math.round((done / allLessons.length) * 100) : 0;
              const isExpanded = expandedStudent === s.id;

              return (
                <li key={s.id}>
                  {/* Student summary row */}
                  <button
                    className="w-full flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50 transition-colors text-left"
                    onClick={() => setExpandedStudent(isExpanded ? null : s.id)}
                  >
                    <Avatar src={s.avatarUrl} name={fullName(s)} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800">{fullName(s)}</p>
                      <p className="text-xs text-slate-400">{s.email}</p>
                    </div>

                    {/* Mini progress bar */}
                    <div className="w-28 hidden sm:block">
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${pct === 100 ? 'bg-green-500' : pct > 0 ? 'bg-brand-500' : 'bg-slate-200'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="text-right shrink-0 w-20">
                      <p className={`text-sm font-semibold ${pct === 100 ? 'text-green-600' : 'text-slate-700'}`}>{pct}%</p>
                      <p className="text-xs text-slate-400">{done}/{allLessons.length}</p>
                    </div>

                    {pct === 100 && <Award size={14} className="text-green-500 shrink-0" />}
                    <ChevronDown
                      size={14}
                      className={`text-slate-400 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {/* Expanded: week-by-week breakdown */}
                  {isExpanded && (
                    <div className="px-6 pb-4 pt-2 bg-slate-50 border-t border-slate-100 space-y-4">
                      {subject.weeks.map((week) => {
                        const weekDone = week.lessons.filter((l) => studentDoneSet.has(l.id)).length;
                        return (
                          <div key={week.id}>
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-semibold text-slate-600">{week.title}</p>
                              <span className={`text-xs font-medium ${weekDone === week.lessons.length ? 'text-green-600' : 'text-slate-400'}`}>
                                {weekDone}/{week.lessons.length}
                              </span>
                            </div>
                            <div className="space-y-1.5 ml-2">
                              {week.lessons.map((lesson) => {
                                const lessonDone = studentDoneSet.has(lesson.id);
                                return (
                                  <div key={lesson.id} className="flex items-center gap-2">
                                    {lessonDone
                                      ? <CheckCircle2 size={13} className="text-green-500 shrink-0" />
                                      : <div className="w-3 h-3 rounded-full border-2 border-slate-300 shrink-0" />
                                    }
                                    <span className={`text-xs ${lessonDone ? 'text-slate-500' : 'text-slate-400'}`}>
                                      {lesson.title}
                                    </span>
                                    {lesson.duration && (
                                      <span className="ml-auto text-xs text-slate-300 flex items-center gap-0.5 shrink-0">
                                        <Clock size={10} />{lesson.duration}m
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </li>
              );
            })}

            {filtered.length === 0 && (
              <li className="px-6 py-4 text-sm text-slate-400">No students match "{search}".</li>
            )}
          </ul>
        </>
      )}
    </Card>
  );
}

// ── Main page ──────────────────────────────────────────────────
export default function Progress() {
  const { user } = useAuthStore();
  const isStaff = user?.role === 'ADMIN' || user?.role === 'TEACHER';

  // ─── Shared: subjects list ────────────────────────────────────
  const { data: subjects = [], isLoading: loadingSubjects } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => api.get<{ data: Subject[] }>('/subjects').then((r) => r.data.data),
  });

  // ─── Student-only data ────────────────────────────────────────
  const { data: ownProgress = [], isLoading: loadingProgress } = useQuery({
    queryKey: ['lesson-progress', user?.id],
    queryFn: () =>
      api.get<{ data: LessonProgress[] }>(`/curriculum/progress/${user?.id}`).then((r) => r.data.data),
    enabled: !!user?.id && !isStaff,
  });

  const { data: studentSubjectDetails } = useQuery({
    queryKey: ['student-subject-details', subjects.map((s) => s.id).join(',')],
    queryFn: () =>
      Promise.all(subjects.map((s) =>
        api.get<{ data: Subject & { weeks: Week[] } }>(`/subjects/${s.id}`).then((r) => r.data.data)
      )),
    enabled: !isStaff && subjects.length > 0,
  });

  // ─── Staff-only data ──────────────────────────────────────────
  const { data: staffSubjectDetails = [], isLoading: loadingStaffDetails } = useQuery({
    queryKey: ['staff-subject-details', subjects.map((s) => s.id).join(',')],
    queryFn: () =>
      Promise.all(subjects.map((s) =>
        api.get<{ data: Subject & { weeks: Week[] } }>(`/subjects/${s.id}`).then((r) => r.data.data)
      )),
    enabled: isStaff && subjects.length > 0,
  });

  const { data: staffStudents = [] } = useQuery({
    queryKey: ['staff-subject-students', subjects.map((s) => s.id).join(',')],
    queryFn: () =>
      Promise.all(subjects.map((s) =>
        api
          .get<{ data: EnrolledStudent[] }>(`/curriculum/${s.id}/students`)
          .then((r) => ({ subjectId: s.id, students: r.data.data }))
      )),
    enabled: isStaff && subjects.length > 0,
  });

  const { data: staffProgress = [] } = useQuery({
    queryKey: ['staff-subject-progress', subjects.map((s) => s.id).join(',')],
    queryFn: () =>
      Promise.all(subjects.map((s) =>
        api
          .get<{ data: ProgressRecord[] }>(`/curriculum/${s.id}/progress`)
          .then((r) => ({ subjectId: s.id, progress: r.data.data }))
      )),
    enabled: isStaff && subjects.length > 0,
  });

  // ══════════════════════════════════════════════════════════════
  // TEACHER / ADMIN VIEW
  // ══════════════════════════════════════════════════════════════
  if (isStaff) {
    const isLoading = loadingSubjects || loadingStaffDetails;

    const studentsBySubject = new Map(staffStudents.map((s) => [s.subjectId, s.students]));
    const progressBySubject = new Map(staffProgress.map((p) => [p.subjectId, p.progress]));

    // Overall summary stats
    const allUniqueStudentIds = new Set(staffStudents.flatMap((s) => s.students.map((e) => e.user.id)));
    let totalPctSum = 0;
    let totalPctCount = 0;
    staffSubjectDetails.forEach((subject) => {
      const allLessons = subject.weeks.flatMap((w) => w.lessons);
      const students = studentsBySubject.get(subject.id) ?? [];
      const prog = progressBySubject.get(subject.id) ?? [];
      if (students.length === 0 || allLessons.length === 0) return;
      const doneByStudent = new Map<string, number>();
      prog.forEach((p) => doneByStudent.set(p.userId, (doneByStudent.get(p.userId) ?? 0) + 1));
      students.forEach((e) => {
        totalPctSum += ((doneByStudent.get(e.user.id) ?? 0) / allLessons.length) * 100;
        totalPctCount++;
      });
    });
    const avgCompletion = totalPctCount > 0 ? Math.round(totalPctSum / totalPctCount) : 0;

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Student Progress</h1>
          <p className="text-slate-500 text-sm mt-1">
            {user?.role === 'TEACHER' ? 'Your students across all assigned subjects' : 'All students across all subjects'}
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner className="w-10 h-10" /></div>
        ) : staffSubjectDetails.length === 0 ? (
          <EmptyState icon={<TrendingUp size={40} />} title="No courses yet" description="Courses you teach will appear here." />
        ) : (
          <>
            {/* Summary stat cards */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Courses',  value: staffSubjectDetails.length, icon: <BookOpen size={18} className="text-brand-500" />, bg: 'bg-brand-50' },
                { label: 'Total Students', value: allUniqueStudentIds.size, icon: <Users size={18} className="text-violet-500" />, bg: 'bg-violet-50' },
                { label: 'Avg Completion', value: `${avgCompletion}%`, icon: <BarChart2 size={18} className="text-green-500" />, bg: 'bg-green-50' },
              ].map((s) => (
                <Card key={s.label}>
                  <CardBody className="flex items-center gap-3 py-4">
                    <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>{s.icon}</div>
                    <div>
                      <p className="text-2xl font-bold text-slate-800">{s.value}</p>
                      <p className="text-xs text-slate-500">{s.label}</p>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>

            {/* Per-subject progress cards */}
            <div className="space-y-4">
              {staffSubjectDetails.map((subject) => (
                <SubjectProgressCard
                  key={subject.id}
                  subject={subject}
                  students={studentsBySubject.get(subject.id) ?? []}
                  progress={progressBySubject.get(subject.id) ?? []}
                />
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // STUDENT VIEW (unchanged)
  // ══════════════════════════════════════════════════════════════
  const completedIds = new Set(ownProgress.map((p) => p.lessonId));
  const isLoading = loadingSubjects || loadingProgress;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Progress</h1>
        <p className="text-slate-500 text-sm mt-1">Track your learning journey</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner className="w-10 h-10" /></div>
      ) : (studentSubjectDetails ?? []).length === 0 ? (
        <EmptyState icon={<TrendingUp size={40} />} title="No progress yet" description="Enroll in a subject to start tracking your progress." />
      ) : (
        <div className="space-y-4">
          {(studentSubjectDetails ?? []).map((subject) => {
            const allLessons = subject.weeks.flatMap((w) => w.lessons);
            const completedCount = allLessons.filter((l) => completedIds.has(l.id)).length;
            const pct = allLessons.length > 0 ? Math.round((completedCount / allLessons.length) * 100) : 0;

            return (
              <Card key={subject.id}>
                <div className="px-6 py-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ background: subject.color }} />
                    <h2 className="font-semibold text-slate-800">{subject.title}</h2>
                    <Badge variant={pct === 100 ? 'success' : 'default'}>{pct === 100 ? '✓ Complete' : `${pct}%`}</Badge>
                  </div>
                  <div className="mt-3">
                    <ProgressBar value={completedCount} max={allLessons.length || 1} label={`${completedCount} of ${allLessons.length} lessons`} />
                  </div>
                </div>
                <CardBody className="space-y-3">
                  {subject.weeks.map((week) => {
                    const weekCompleted = week.lessons.filter((l) => completedIds.has(l.id)).length;
                    return (
                      <div key={week.id} className="border border-slate-100 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-medium text-slate-700">{week.title}</h3>
                          <span className={`text-xs font-medium ${weekCompleted === week.lessons.length && week.lessons.length > 0 ? 'text-green-600' : 'text-slate-400'}`}>
                            {weekCompleted}/{week.lessons.length}
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {week.lessons.map((lesson) => {
                            const done = completedIds.has(lesson.id);
                            return (
                              <div key={lesson.id} className="flex items-center gap-2.5">
                                {done
                                  ? <CheckCircle2 size={14} className="text-green-500 shrink-0" />
                                  : <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 shrink-0" />
                                }
                                <span className={`text-xs ${done ? 'text-slate-400 line-through' : 'text-slate-600'}`}>{lesson.title}</span>
                                {lesson.duration && (
                                  <span className="text-xs text-slate-300 ml-auto">{lesson.duration}m</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
