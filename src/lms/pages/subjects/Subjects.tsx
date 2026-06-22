import { Link } from 'react-router-dom';
import { BookOpen, UserCog, Check, Plus, Pencil, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import { Spinner, Modal, Button, Input } from '../../components/ui';

type CourseType = 'NOORANI_QAIDA' | 'QURAN_LEARNING' | 'ISLAMIC_LEARNING';

const COURSE_TYPE_LABELS: Record<CourseType, string> = {
  NOORANI_QAIDA:    'Noorani Qaida',
  QURAN_LEARNING:   'Quran Learning',
  ISLAMIC_LEARNING: 'Islamic Learning',
};

const COURSE_TYPE_COLORS: Record<CourseType, string> = {
  NOORANI_QAIDA:    'bg-emerald-100 text-emerald-700',
  QURAN_LEARNING:   'bg-blue-100 text-blue-700',
  ISLAMIC_LEARNING: 'bg-violet-100 text-violet-700',
};

interface Teacher { id: string; firstName: string; lastName: string; }
interface Subject {
  id: string;
  title: string;
  description: string | null;
  color: string | null;
  thumbnailUrl: string | null;
  courseType: CourseType | null;
  isPublished: boolean;
  teachers: { teacherId: string; teacher: Teacher }[];
}

const DEFAULT_COLOR = '#0e91e9';

export default function Subjects() {
  const { user } = useAuthStore();
  const isStudent = user?.role === 'STUDENT';
  const isAdmin = user?.role === 'ADMIN';
  const isStaff = isAdmin || user?.role === 'TEACHER';
  const qc = useQueryClient();

  // ── Assign teachers modal ──────────────────────────────────
  const [assignModal, setAssignModal] = useState<{ courseId: string; courseTitle: string } | null>(null);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);

  // ── Create / edit course modal ─────────────────────────────
  const [courseModal, setCourseModal] = useState<{ mode: 'create' } | { mode: 'edit'; subject: Subject } | null>(null);
  const [form, setForm] = useState({ title: '', description: '', color: DEFAULT_COLOR, courseType: '' as CourseType | '' });
  const [courseTeacherIds, setCourseTeacherIds] = useState<string[]>([]);

  // ── Type filter ────────────────────────────────────────────
  const [typeFilter, setTypeFilter] = useState<CourseType | ''>('');

  // ── Delete confirm ─────────────────────────────────────────
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // ── Queries ───────────────────────────────────────────────
  const { data: subjects = [], isLoading } = useQuery<Subject[]>({
    queryKey: ['subjects'],
    queryFn: () => api.get<{ data: Subject[] }>('/subjects').then(r => r.data.data),
  });

  const { data: teachers = [] } = useQuery<Teacher[]>({
    queryKey: ['teachers-list'],
    queryFn: () => api.get<{ data: Teacher[] }>('/users?role=TEACHER').then(r => r.data.data),
    enabled: isAdmin,
  });

  // ── Mutations ─────────────────────────────────────────────
  const assignMutation = useMutation({
    mutationFn: ({ courseId, teacherIds }: { courseId: string; teacherIds: string[] }) =>
      api.put(`/subjects/${courseId}`, { teacherIds }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subjects'] });
      toast.success('Teachers updated');
      setAssignModal(null);
    },
    onError: () => toast.error('Failed to update teachers'),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => api.post('/subjects', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subjects'] });
      toast.success('Course created');
      setCourseModal(null);
    },
    onError: () => toast.error('Failed to create course'),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof form }) => api.put(`/subjects/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subjects'] });
      toast.success('Course updated');
      setCourseModal(null);
    },
    onError: () => toast.error('Failed to update course'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/subjects/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subjects'] });
      toast.success('Course deleted');
      setDeleteId(null);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? 'Failed to delete course'),
  });

  // ── Handlers ──────────────────────────────────────────────
  const openAssignModal = (s: Subject) => {
    setSelectedTeacherIds(s.teachers.map(t => t.teacherId));
    setAssignModal({ courseId: s.id, courseTitle: s.title });
  };

  const toggleTeacher = (id: string) =>
    setSelectedTeacherIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const openCreate = () => {
    setForm({ title: '', description: '', color: DEFAULT_COLOR, courseType: '' });
    setCourseTeacherIds([]);
    setCourseModal({ mode: 'create' });
  };

  const openEdit = (s: Subject) => {
    setForm({ title: s.title, description: s.description ?? '', color: s.color ?? DEFAULT_COLOR, courseType: s.courseType ?? '' });
    setCourseTeacherIds(s.teachers.map(t => t.teacherId));
    setCourseModal({ mode: 'edit', subject: s });
  };

  const toggleCourseTeacher = (id: string) =>
    setCourseTeacherIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const submitCourse = () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    if (!form.courseType) { toast.error('Course type is required'); return; }
    if (courseModal?.mode === 'create' && courseTeacherIds.length === 0) {
      toast.error('Assign at least one teacher'); return;
    }
    const payload = { ...form, teacherIds: courseTeacherIds, courseType: form.courseType || null };
    if (courseModal?.mode === 'edit') {
      editMutation.mutate({ id: courseModal.subject.id, data: payload as typeof form });
    } else {
      createMutation.mutate(payload as typeof form);
    }
  };

  // Apply client-side type filter (server already filtered by role)
  const visibleCourses = typeFilter
    ? subjects.filter(s => s.courseType === typeFilter)
    : subjects;

  if (isLoading) return <div className="flex justify-center py-16"><Spinner /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Courses</h1>
          <p className="text-slate-500 text-sm mt-1">
            {isStudent ? 'Select a course to view your progress' : 'Manage courses and teacher assignments'}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={openCreate} size="sm">
            <Plus size={15} className="mr-1" />
            New Course
          </Button>
        )}
      </div>

      {/* ── Type filter pills ────────────────────────────── */}
      {subjects.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setTypeFilter('')}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              typeFilter === '' ? 'bg-slate-800 border-slate-800 text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            All
          </button>
          {(Object.keys(COURSE_TYPE_LABELS) as CourseType[]).map(ct => (
            <button
              key={ct}
              onClick={() => setTypeFilter(t => t === ct ? '' : ct)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                typeFilter === ct ? 'bg-slate-800 border-slate-800 text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {COURSE_TYPE_LABELS[ct]}
            </button>
          ))}
        </div>
      )}

      {visibleCourses.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <BookOpen size={40} className="mx-auto mb-3 text-slate-300" />
          <p className="font-medium">No courses yet</p>
          {isAdmin
            ? <p className="text-sm mt-1">Click "New Course" to add the first one.</p>
            : <p className="text-sm mt-1">You haven't been enrolled in any courses.</p>
          }
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 max-w-2xl">
          {visibleCourses.map((subject) => {
            const bg = subject.color ?? DEFAULT_COLOR;
            return (
              <div key={subject.id} className="flex flex-col gap-2">
                <Link
                  to={`/lms/subjects/${subject.id}`}
                  className="group relative overflow-hidden rounded-2xl shadow-md hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5"
                >
                  <div
                    className="p-6 flex flex-col gap-4 min-h-[180px]"
                    style={{ background: `linear-gradient(135deg, ${bg}cc, ${bg})` }}
                  >
                    <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                      <BookOpen size={32} className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">{subject.title}</h2>
                      {subject.courseType && (
                        <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-white/20 text-white/90">
                          {COURSE_TYPE_LABELS[subject.courseType]}
                        </span>
                      )}
                      {subject.description && (
                        <p className="text-sm text-white/80 mt-1 leading-snug">{subject.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-white/70 text-xs font-medium mt-auto">
                      Open course
                      <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Link>

                {isStaff && (
                  <div className="flex items-center justify-between px-1">
                    <div className="text-xs text-slate-500 truncate max-w-[60%]">
                      {subject.teachers.length === 0
                        ? <span className="text-amber-600 font-medium">No teacher assigned</span>
                        : subject.teachers.map(t => `${t.teacher.firstName} ${t.teacher.lastName}`).join(', ')
                      }
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => openAssignModal(subject)}
                            className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium"
                          >
                            <UserCog size={13} />
                            Assign
                          </button>
                          <button
                            onClick={() => openEdit(subject)}
                            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 font-medium"
                          >
                            <Pencil size={12} />
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteId(subject.id)}
                            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium"
                          >
                            <Trash2 size={12} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Assign Teachers modal ─────────────────────────── */}
      <Modal
        open={!!assignModal}
        onClose={() => setAssignModal(null)}
        title={`Assign Teachers — ${assignModal?.courseTitle}`}
      >
        <div className="space-y-4">
          {teachers.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">No teachers found. Add teachers from the Users page first.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {teachers.map(t => {
                const selected = selectedTeacherIds.includes(t.id);
                return (
                  <button
                    key={t.id}
                    onClick={() => toggleTeacher(t.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors ${
                      selected
                        ? 'border-brand-300 bg-brand-50 text-brand-800'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 ${selected ? 'bg-brand-600' : 'border border-slate-300'}`}>
                      {selected && <Check size={12} className="text-white" />}
                    </div>
                    <span className="text-sm font-medium">{t.firstName} {t.lastName}</span>
                  </button>
                );
              })}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setAssignModal(null)}>Cancel</Button>
            <Button
              size="sm"
              onClick={() => assignMutation.mutate({ courseId: assignModal!.courseId, teacherIds: selectedTeacherIds })}
              disabled={assignMutation.isPending}
            >
              {assignMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Create / Edit course modal ────────────────────── */}
      <Modal
        open={!!courseModal}
        onClose={() => setCourseModal(null)}
        title={courseModal?.mode === 'edit' ? 'Edit Course' : 'New Course'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title <span className="text-red-500">*</span></label>
            <Input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Quran with Tajweed"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Course Type <span className="text-red-500">*</span></label>
            <select
              value={form.courseType}
              onChange={e => setForm(f => ({ ...f, courseType: e.target.value as CourseType | '' }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Select a course type…</option>
              {(Object.entries(COURSE_TYPE_LABELS) as [CourseType, string][]).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Short description of this course…"
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Card colour</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.color}
                onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                className="h-9 w-16 rounded border border-slate-300 cursor-pointer"
              />
              <span className="text-xs text-slate-400">{form.color}</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Assign Teachers {courseModal?.mode === 'create' && <span className="text-red-500">*</span>}
            </label>
            {teachers.length === 0 ? (
              <p className="text-xs text-slate-400">No teachers found. Add teachers from the Users page first.</p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-2">
                {teachers.map(t => {
                  const selected = courseTeacherIds.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggleCourseTeacher(t.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg border text-left transition-colors ${
                        selected
                          ? 'border-brand-300 bg-brand-50 text-brand-800'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${selected ? 'bg-brand-600' : 'border border-slate-300'}`}>
                        {selected && <Check size={10} className="text-white" />}
                      </div>
                      <span className="text-sm">{t.firstName} {t.lastName}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setCourseModal(null)}>Cancel</Button>
            <Button
              size="sm"
              onClick={submitCourse}
              disabled={createMutation.isPending || editMutation.isPending}
            >
              {createMutation.isPending || editMutation.isPending ? 'Saving…' : courseModal?.mode === 'edit' ? 'Save Changes' : 'Create Course'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Delete confirm modal ──────────────────────────── */}
      <Modal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Delete Course"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Are you sure you want to delete this course? This cannot be undone.</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => deleteMutation.mutate(deleteId!)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
