import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { BookOpen, ChevronDown, ChevronRight, Plus, Check, Pencil, Trash2, PlayCircle, FileText, Users, UserPlus, X, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import { Spinner, Button, Modal, Input, Badge } from '../../components/ui';

interface Lesson {
  id: string;
  title: string;
  type: 'TEXT' | 'VIDEO' | 'QUIZ' | 'ASSIGNMENT';
  content: string | null;
  videoUrl: string | null;
  duration: number | null;
  isPublished: boolean;
  order: number;
}

interface Week {
  id: string;
  title: string;
  description: string | null;
  order: number;
  lessons: Lesson[];
}

interface SubjectTeacherEntry {
  teacherId: string;
  teacher: { id: string; firstName: string; lastName: string; email: string };
}

interface Subject {
  id: string;
  title: string;
  description: string | null;
  color: string | null;
  teachers: SubjectTeacherEntry[];
}

interface Progress { lessonId: string }

type EnrollmentStatus = 'ACTIVE' | 'COMPLETED' | 'DROPPED';
const STATUS_BADGE: Record<EnrollmentStatus, string> = {
  ACTIVE:    'success',
  COMPLETED: 'info',
  DROPPED:   'default',
};
const STATUS_LABEL: Record<EnrollmentStatus, string> = {
  ACTIVE:    'Active',
  COMPLETED: 'Completed',
  DROPPED:   'Dropped',
};

interface Enrollment {
  userId:      string;
  subjectId:   string;
  status:      EnrollmentStatus;
  enrolledAt:  string;
  completedAt: string | null;
  user:        { id: string; firstName: string; lastName: string; email: string; avatarUrl: string | null; grade: string | null };
  teacher:     { id: string; firstName: string; lastName: string } | null;
  enrolledBy:  { id: string; firstName: string; lastName: string } | null;
}

interface StudentOption { id: string; firstName: string; lastName: string; email: string; }

export default function GenericSubjectDetail() {
  const { id: subjectId } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const isStaff = user?.role === 'ADMIN' || user?.role === 'TEACHER';
  const qc = useQueryClient();

  const [openWeeks, setOpenWeeks] = useState<Set<string>>(new Set());
  const [weekModal, setWeekModal] = useState<{ mode: 'create' } | { mode: 'edit'; week: Week } | null>(null);
  const [weekForm, setWeekForm] = useState({ title: '', description: '' });
  const [lessonModal, setLessonModal] = useState<{ weekId: string } | { mode: 'edit'; lesson: Lesson; weekId: string } | null>(null);
  const [lessonForm, setLessonForm] = useState({ title: '', type: 'TEXT' as Lesson['type'], content: '', videoUrl: '' });
  const [deleteWeekId, setDeleteWeekId] = useState<string | null>(null);
  const [deleteLessonId, setDeleteLessonId] = useState<string | null>(null);
  const [viewLesson, setViewLesson] = useState<Lesson | null>(null);

  // ── Enrollment state ───────────────────────────────────────
  const [enrollModal, setEnrollModal] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentSearch, setStudentSearch] = useState('');

  // ── Queries ────────────────────────────────────────────────
  const { data: subject, isLoading: subjectLoading } = useQuery<Subject>({
    queryKey: ['subject', subjectId],
    queryFn: () => api.get<{ data: Subject }>(`/subjects/${subjectId}`).then(r => r.data.data),
    enabled: !!subjectId,
  });

  const { data: weeks = [], isLoading: weeksLoading } = useQuery<Week[]>({
    queryKey: ['curriculum-weeks', subjectId],
    queryFn: () => api.get<{ data: Week[] }>(`/curriculum/${subjectId}/weeks`).then(r => r.data.data),
    enabled: !!subjectId,
  });

  const { data: progress = [] } = useQuery<Progress[]>({
    queryKey: ['curriculum-progress', user?.id],
    queryFn: () => api.get<{ data: Progress[] }>(`/curriculum/progress/${user?.id}`).then(r => r.data.data),
    enabled: !!user?.id,
  });

  const { data: enrollments = [] } = useQuery<Enrollment[]>({
    queryKey: ['subject-enrollments', subjectId],
    queryFn: () => api.get<{ data: Enrollment[] }>(`/subjects/${subjectId}/enrollments`).then(r => r.data.data),
    enabled: !!subjectId && isStaff,
  });

  const { data: allStudents = [] } = useQuery<StudentOption[]>({
    queryKey: ['students-active'],
    queryFn: () => api.get<{ data: StudentOption[] }>('/users?role=STUDENT&isActive=true').then(r => r.data.data),
    enabled: isStaff,
  });

  const completedIds = new Set(progress.map(p => p.lessonId));
  const totalLessons = weeks.reduce((n, w) => n + w.lessons.length, 0);
  const completedCount = weeks.reduce((n, w) => n + w.lessons.filter(l => completedIds.has(l.id)).length, 0);

  // ── Mutations ──────────────────────────────────────────────
  const createWeekMutation = useMutation({
    mutationFn: (data: typeof weekForm) => api.post(`/curriculum/${subjectId}/weeks`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['curriculum-weeks', subjectId] }); toast.success('Week added'); setWeekModal(null); },
    onError: () => toast.error('Failed to add week'),
  });

  const editWeekMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof weekForm }) => api.put(`/curriculum/weeks/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['curriculum-weeks', subjectId] }); toast.success('Week updated'); setWeekModal(null); },
    onError: () => toast.error('Failed to update week'),
  });

  const deleteWeekMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/curriculum/weeks/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['curriculum-weeks', subjectId] }); toast.success('Week deleted'); setDeleteWeekId(null); },
    onError: () => toast.error('Failed to delete week'),
  });

  const createLessonMutation = useMutation({
    mutationFn: ({ weekId, data }: { weekId: string; data: typeof lessonForm }) => api.post(`/curriculum/weeks/${weekId}/lessons`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['curriculum-weeks', subjectId] }); toast.success('Lesson added'); setLessonModal(null); },
    onError: () => toast.error('Failed to add lesson'),
  });

  const editLessonMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof lessonForm }) => api.put(`/curriculum/lessons/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['curriculum-weeks', subjectId] }); toast.success('Lesson updated'); setLessonModal(null); },
    onError: () => toast.error('Failed to update lesson'),
  });

  const deleteLessonMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/curriculum/lessons/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['curriculum-weeks', subjectId] }); toast.success('Lesson deleted'); setDeleteLessonId(null); },
    onError: () => toast.error('Failed to delete lesson'),
  });

  const toggleCompleteMutation = useMutation({
    mutationFn: ({ lessonId, done }: { lessonId: string; done: boolean }) =>
      done
        ? api.delete(`/curriculum/lessons/${lessonId}/complete`)
        : api.post(`/curriculum/lessons/${lessonId}/complete`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['curriculum-progress', user?.id] }),
    onError: () => toast.error('Failed to update progress'),
  });

  const enrollMutation = useMutation({
    mutationFn: (studentIds: string[]) =>
      Promise.all(studentIds.map(id => api.post(`/subjects/${subjectId}/enroll`, { userId: id }))),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subject-enrollments', subjectId] });
      toast.success(`${selectedStudentIds.length} student(s) enrolled`);
      setEnrollModal(false);
      setSelectedStudentIds([]);
    },
    onError: () => toast.error('Failed to enroll students'),
  });

  const unenrollMutation = useMutation({
    mutationFn: (studentId: string) => api.delete(`/subjects/${subjectId}/enroll/${studentId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subject-enrollments', subjectId] });
      toast.success('Student removed');
    },
    onError: () => toast.error('Failed to remove student'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ studentId, status }: { studentId: string; status: EnrollmentStatus }) =>
      api.patch(`/subjects/${subjectId}/enroll/${studentId}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subject-enrollments', subjectId] }),
    onError: () => toast.error('Failed to update status'),
  });

  const removeTeacherMutation = useMutation({
    mutationFn: (teacherId: string) => api.delete(`/subjects/${subjectId}/teachers/${teacherId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subject', subjectId] });
      toast.success('Teacher removed');
    },
    onError: () => toast.error('Failed to remove teacher'),
  });

  // ── Helpers ────────────────────────────────────────────────
  const toggleWeek = (id: string) =>
    setOpenWeeks(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const openCreateWeek = () => { setWeekForm({ title: '', description: '' }); setWeekModal({ mode: 'create' }); };
  const openEditWeek = (w: Week) => { setWeekForm({ title: w.title, description: w.description ?? '' }); setWeekModal({ mode: 'edit', week: w }); };
  const submitWeek = () => {
    if (!weekForm.title.trim()) { toast.error('Title required'); return; }
    if (weekModal?.mode === 'edit') editWeekMutation.mutate({ id: weekModal.week.id, data: weekForm });
    else createWeekMutation.mutate(weekForm);
  };

  const openCreateLesson = (weekId: string) => { setLessonForm({ title: '', type: 'TEXT', content: '', videoUrl: '' }); setLessonModal({ weekId }); };
  const openEditLesson = (l: Lesson, weekId: string) => { setLessonForm({ title: l.title, type: l.type, content: l.content ?? '', videoUrl: l.videoUrl ?? '' }); setLessonModal({ mode: 'edit', lesson: l, weekId }); };
  const submitLesson = () => {
    if (!lessonForm.title.trim()) { toast.error('Title required'); return; }
    if (lessonModal && 'mode' in lessonModal && lessonModal.mode === 'edit') {
      editLessonMutation.mutate({ id: lessonModal.lesson.id, data: lessonForm });
    } else if (lessonModal) {
      createLessonMutation.mutate({ weekId: lessonModal.weekId, data: lessonForm });
    }
  };

  const lessonIcon = (type: Lesson['type']) => {
    if (type === 'VIDEO') return <PlayCircle size={14} className="text-blue-500" />;
    return <FileText size={14} className="text-slate-400" />;
  };

  if (subjectLoading || weeksLoading) return <div className="flex justify-center py-16"><Spinner /></div>;
  if (!subject) return <div className="flex items-center justify-center min-h-[300px] text-slate-400 text-sm">Course not found.</div>;

  const accentColor = subject.color ?? '#0e91e9';

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="rounded-2xl p-6 text-white" style={{ background: `linear-gradient(135deg, ${accentColor}cc, ${accentColor})` }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{subject.title}</h1>
            {subject.description && <p className="mt-1 text-white/80 text-sm">{subject.description}</p>}
          </div>
          {totalLessons > 0 && (
            <div className="text-right shrink-0">
              <div className="text-2xl font-bold">{completedCount}/{totalLessons}</div>
              <div className="text-xs text-white/70">lessons done</div>
            </div>
          )}
        </div>
        {totalLessons > 0 && (
          <div className="mt-4 h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all" style={{ width: `${(completedCount / totalLessons) * 100}%` }} />
          </div>
        )}
      </div>

      {/* Weeks */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-700">Curriculum</h2>
          {isStaff && (
            <Button size="sm" variant="outline" onClick={openCreateWeek}>
              <Plus size={14} className="mr-1" /> Add Week
            </Button>
          )}
        </div>

        {weeks.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl text-slate-400">
            <BookOpen size={32} className="mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-medium">No curriculum yet</p>
            {isStaff && <p className="text-xs mt-1">Click "Add Week" to build the curriculum.</p>}
          </div>
        ) : (
          weeks.map(week => {
            const isOpen = openWeeks.has(week.id);
            const weekDone = week.lessons.filter(l => completedIds.has(l.id)).length;
            return (
              <div key={week.id} className="border border-slate-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleWeek(week.id)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    {isOpen ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                    <span className="font-medium text-slate-800">{week.title}</span>
                    {week.description && <span className="text-xs text-slate-400 hidden sm:inline">— {week.description}</span>}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-slate-400">{weekDone}/{week.lessons.length} done</span>
                    {isStaff && (
                      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                        <button onClick={() => openEditWeek(week)} className="p-1 text-slate-400 hover:text-slate-600 rounded">
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => setDeleteWeekId(week.id)} className="p-1 text-slate-400 hover:text-red-500 rounded">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                </button>

                {isOpen && (
                  <div className="divide-y divide-slate-100">
                    {week.lessons.length === 0 && (
                      <p className="px-4 py-3 text-xs text-slate-400 italic">No lessons yet.</p>
                    )}
                    {week.lessons.map(lesson => {
                      const done = completedIds.has(lesson.id);
                      return (
                        <div key={lesson.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                          <button
                            onClick={() => toggleCompleteMutation.mutate({ lessonId: lesson.id, done })}
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                              done ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 hover:border-emerald-400'
                            }`}
                          >
                            {done && <Check size={11} className="text-white" />}
                          </button>
                          <button
                            onClick={() => setViewLesson(lesson)}
                            className="flex items-center gap-2 flex-1 text-left min-w-0"
                          >
                            {lessonIcon(lesson.type)}
                            <span className={`text-sm truncate ${done ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                              {lesson.title}
                            </span>
                            {lesson.duration && <span className="text-xs text-slate-400 shrink-0">{lesson.duration}m</span>}
                          </button>
                          {isStaff && (
                            <div className="flex gap-1 shrink-0">
                              <button onClick={() => openEditLesson(lesson, week.id)} className="p-1 text-slate-400 hover:text-slate-600 rounded">
                                <Pencil size={12} />
                              </button>
                              <button onClick={() => setDeleteLessonId(lesson.id)} className="p-1 text-slate-400 hover:text-red-500 rounded">
                                <Trash2 size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {isStaff && (
                      <button
                        onClick={() => { setOpenWeeks(prev => new Set(prev).add(week.id)); openCreateLesson(week.id); }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                      >
                        <Plus size={13} /> Add lesson
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ── Assigned Teachers section (Admin only) ──────────── */}
      {user?.role === 'ADMIN' && (
        <div className="space-y-3">
          <h2 className="font-semibold text-slate-700 flex items-center gap-2">
            <GraduationCap size={16} className="text-slate-400" />
            Assigned Teachers
            {subject.teachers.length > 0 && (
              <span className="text-xs font-normal text-slate-400">({subject.teachers.length})</span>
            )}
          </h2>
          {subject.teachers.length === 0 ? (
            <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl text-slate-400">
              <p className="text-sm">No teachers assigned</p>
              <p className="text-xs mt-1">Assign teachers via the Edit button on the Courses page.</p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
              {subject.teachers.map(st => (
                <div key={st.teacherId} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-xs font-semibold text-purple-700 shrink-0">
                    {st.teacher.firstName[0]}{st.teacher.lastName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">{st.teacher.firstName} {st.teacher.lastName}</p>
                    <p className="text-xs text-slate-400">{st.teacher.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm(`Remove ${st.teacher.firstName} ${st.teacher.lastName} from this course?`))
                        removeTeacherMutation.mutate(st.teacherId);
                    }}
                    className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
                    title="Remove teacher"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Students section (staff only) ───────────────────── */}
      {isStaff && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-700 flex items-center gap-2">
              <Users size={16} className="text-slate-400" />
              Students
              {enrollments.length > 0 && (
                <span className="text-xs font-normal text-slate-400">({enrollments.length})</span>
              )}
            </h2>
            <Button size="sm" variant="outline" onClick={() => { setSelectedStudentIds([]); setStudentSearch(''); setEnrollModal(true); }}>
              <UserPlus size={14} className="mr-1" /> Enroll Student
            </Button>
          </div>

          {enrollments.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl text-slate-400">
              <Users size={28} className="mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-medium">No students enrolled</p>
              <p className="text-xs mt-1">Click "Enroll Student" to add students to this course.</p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
              {enrollments.map(e => (
                <div key={e.userId} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0 text-xs font-semibold text-slate-600">
                    {e.user.firstName[0]}{e.user.lastName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {e.user.firstName} {e.user.lastName}
                    </p>
                    <p className="text-xs text-slate-400 truncate">{e.user.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={STATUS_BADGE[e.status] as any}>{STATUS_LABEL[e.status]}</Badge>
                    <select
                      value={e.status}
                      onChange={ev => updateStatusMutation.mutate({ studentId: e.userId, status: ev.target.value as EnrollmentStatus })}
                      className="text-xs border border-slate-200 rounded px-1.5 py-0.5 text-slate-600 focus:outline-none"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="DROPPED">Dropped</option>
                    </select>
                    <button
                      onClick={() => { if (confirm(`Remove ${e.user.firstName} ${e.user.lastName} from this course?`)) unenrollMutation.mutate(e.userId); }}
                      className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors"
                      title="Remove student"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Enroll student modal ─────────────────────────────── */}
      <Modal open={enrollModal} onClose={() => setEnrollModal(false)} title="Enroll Students">
        <div className="space-y-3">
          <Input
            value={studentSearch}
            onChange={e => setStudentSearch(e.target.value)}
            placeholder="Search by name or email…"
          />
          <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
            {allStudents
              .filter(s => {
                const alreadyEnrolled = enrollments.some(e => e.userId === s.id && e.status === 'ACTIVE');
                const q = studentSearch.toLowerCase();
                const matchesSearch = !q || `${s.firstName} ${s.lastName} ${s.email}`.toLowerCase().includes(q);
                return !alreadyEnrolled && matchesSearch;
              })
              .map(s => {
                const selected = selectedStudentIds.includes(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedStudentIds(prev =>
                      prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id]
                    )}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                      selected ? 'bg-brand-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                      selected ? 'bg-brand-600 border-brand-600' : 'border-slate-300'
                    }`}>
                      {selected && <Check size={10} className="text-white" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800">{s.firstName} {s.lastName}</p>
                      <p className="text-xs text-slate-400 truncate">{s.email}</p>
                    </div>
                  </button>
                );
              })}
            {allStudents.filter(s => !enrollments.some(e => e.userId === s.id && e.status === 'ACTIVE')).length === 0 && (
              <p className="px-3 py-4 text-sm text-slate-400 text-center">All active students are already enrolled.</p>
            )}
          </div>
          {selectedStudentIds.length > 0 && (
            <p className="text-xs text-slate-500">{selectedStudentIds.length} student(s) selected</p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => setEnrollModal(false)}>Cancel</Button>
            <Button
              size="sm"
              onClick={() => enrollMutation.mutate(selectedStudentIds)}
              disabled={selectedStudentIds.length === 0 || enrollMutation.isPending}
            >
              {enrollMutation.isPending ? 'Enrolling…' : `Enroll ${selectedStudentIds.length > 0 ? `(${selectedStudentIds.length})` : ''}`}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Week modal ───────────────────────────────────────── */}
      <Modal open={!!weekModal} onClose={() => setWeekModal(null)} title={weekModal?.mode === 'edit' ? 'Edit Week' : 'Add Week'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title <span className="text-red-500">*</span></label>
            <Input value={weekForm.title} onChange={e => setWeekForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Week 1: Introduction" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <Input value={weekForm.description} onChange={e => setWeekForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional summary" />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => setWeekModal(null)}>Cancel</Button>
            <Button size="sm" onClick={submitWeek} disabled={createWeekMutation.isPending || editWeekMutation.isPending}>
              {createWeekMutation.isPending || editWeekMutation.isPending ? 'Saving…' : weekModal?.mode === 'edit' ? 'Save' : 'Add Week'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Lesson modal ─────────────────────────────────────── */}
      <Modal open={!!lessonModal} onClose={() => setLessonModal(null)} title={lessonModal && 'mode' in lessonModal && lessonModal.mode === 'edit' ? 'Edit Lesson' : 'Add Lesson'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title <span className="text-red-500">*</span></label>
            <Input value={lessonForm.title} onChange={e => setLessonForm(f => ({ ...f, title: e.target.value }))} placeholder="Lesson title" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
            <select
              value={lessonForm.type}
              onChange={e => setLessonForm(f => ({ ...f, type: e.target.value as Lesson['type'] }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="TEXT">Text</option>
              <option value="VIDEO">Video</option>
              <option value="QUIZ">Quiz</option>
              <option value="ASSIGNMENT">Assignment</option>
            </select>
          </div>
          {lessonForm.type === 'VIDEO' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Video URL</label>
              <Input value={lessonForm.videoUrl} onChange={e => setLessonForm(f => ({ ...f, videoUrl: e.target.value }))} placeholder="https://..." />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Content</label>
            <textarea
              value={lessonForm.content}
              onChange={e => setLessonForm(f => ({ ...f, content: e.target.value }))}
              rows={4}
              placeholder="Lesson content…"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => setLessonModal(null)}>Cancel</Button>
            <Button size="sm" onClick={submitLesson} disabled={createLessonMutation.isPending || editLessonMutation.isPending}>
              {createLessonMutation.isPending || editLessonMutation.isPending ? 'Saving…' : lessonModal && 'mode' in lessonModal && lessonModal.mode === 'edit' ? 'Save' : 'Add Lesson'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Lesson viewer ────────────────────────────────────── */}
      <Modal open={!!viewLesson} onClose={() => setViewLesson(null)} title={viewLesson?.title ?? ''}>
        <div className="space-y-3">
          {viewLesson?.videoUrl && (
            <div className="aspect-video rounded-lg overflow-hidden bg-black">
              <iframe src={viewLesson.videoUrl} className="w-full h-full" allowFullScreen title={viewLesson.title} />
            </div>
          )}
          {viewLesson?.content ? (
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{viewLesson.content}</p>
          ) : (
            <p className="text-sm text-slate-400 italic">No content yet.</p>
          )}
        </div>
      </Modal>

      {/* ── Delete week confirm ──────────────────────────────── */}
      <Modal open={!!deleteWeekId} onClose={() => setDeleteWeekId(null)} title="Delete Week">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">This will delete the week and all its lessons. Cannot be undone.</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteWeekId(null)}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={() => deleteWeekMutation.mutate(deleteWeekId!)} disabled={deleteWeekMutation.isPending}>
              {deleteWeekMutation.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Delete lesson confirm ────────────────────────────── */}
      <Modal open={!!deleteLessonId} onClose={() => setDeleteLessonId(null)} title="Delete Lesson">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Delete this lesson? Cannot be undone.</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteLessonId(null)}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={() => deleteLessonMutation.mutate(deleteLessonId!)} disabled={deleteLessonMutation.isPending}>
              {deleteLessonMutation.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
