import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  WandSparkles, ChevronDown, ChevronRight, RefreshCw,
  BookOpen, ClipboardList, HelpCircle, CheckCircle2,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, CardBody, CardHeader, Select, Input, Textarea, Spinner } from '../../components/ui';

// ─── Types ────────────────────────────────────────────────────
interface GeneratedLesson {
  title: string;
  description: string;
  type: 'TEXT' | 'QUIZ' | 'ASSIGNMENT';
  durationMinutes: number;
}

interface GeneratedWeek {
  weekNumber: number;
  title: string;
  lessons: GeneratedLesson[];
}

interface GeneratedCurriculum {
  subjectTitle: string;
  weeks: GeneratedWeek[];
}

interface TeacherOverview {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

// ─── Constants ────────────────────────────────────────────────
const GRADES = [
  'Kindergarten',
  ...Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`),
];

const SUBJECTS = [
  'Mathematics',
  'Science',
  'English Language Arts',
  'History & Social Studies',
  'ICT / Computer Science',
  'Art',
  'Physical Education',
];

const PRESET_COLORS = ['#0e91e9', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

const LESSON_TYPE_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  TEXT:       { label: 'Lesson',     icon: <BookOpen size={12} />,      color: 'bg-blue-50 text-blue-600' },
  QUIZ:       { label: 'Quiz',       icon: <HelpCircle size={12} />,    color: 'bg-amber-50 text-amber-600' },
  ASSIGNMENT: { label: 'Assignment', icon: <ClipboardList size={12} />, color: 'bg-purple-50 text-purple-600' },
};

// ─── Step indicator ───────────────────────────────────────────
function StepBadge({ n, active, done }: { n: number; active: boolean; done: boolean }) {
  return (
    <div className={`flex items-center justify-center w-7 h-7 rounded-full text-sm font-semibold shrink-0 ${
      done    ? 'bg-emerald-500 text-white' :
      active  ? 'bg-brand-500 text-white'  :
                'bg-slate-200 text-slate-400'
    }`}>
      {done ? <CheckCircle2 size={14} /> : n}
    </div>
  );
}

// ─── Week accordion ───────────────────────────────────────────
function WeekAccordion({ week }: { week: GeneratedWeek }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        <span className="font-medium text-slate-700 text-sm">
          Week {week.weekNumber} — {week.title}
        </span>
        <span className="flex items-center gap-2 text-slate-400 text-xs shrink-0">
          <span>{week.lessons.length} lesson{week.lessons.length !== 1 ? 's' : ''}</span>
          {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </span>
      </button>
      {open && (
        <ul className="divide-y divide-slate-100">
          {week.lessons.map((lesson, li) => {
            const meta = LESSON_TYPE_META[lesson.type] ?? LESSON_TYPE_META.TEXT;
            return (
              <li key={li} className="px-4 py-3 flex items-start gap-3">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0 mt-0.5 ${meta.color}`}>
                  {meta.icon}{meta.label}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800">{lesson.title}</p>
                  {lesson.description && (
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{lesson.description}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-1">{lesson.durationMinutes} min</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────
export default function CurriculumGenerator() {
  const navigate = useNavigate();

  // Step 1 state
  const [grade, setGrade]               = useState(GRADES[6]); // Grade 6 default
  const [subject, setSubject]           = useState(SUBJECTS[0]);
  const [numWeeks, setNumWeeks]         = useState(8);
  const [lessonsPerWeek, setLessonsPerWeek] = useState(3);

  // Step 2 state
  const [curriculum, setCurriculum]     = useState<GeneratedCurriculum | null>(null);
  const [generating, setGenerating]     = useState(false);
  const [genError, setGenError]         = useState('');

  // Step 3 state
  const [subjectTitle, setSubjectTitle] = useState('');
  const [description, setDescription]  = useState('');
  const [color, setColor]               = useState(PRESET_COLORS[0]);
  const [teacherId, setTeacherId]       = useState('');
  const [creating, setCreating]         = useState(false);
  const [createError, setCreateError]   = useState('');

  // Derived step
  const step = curriculum ? (creating || createError ? 3 : 3) : (generating ? 1 : 1);
  const showStep2 = !!curriculum || generating;
  const showStep3 = !!curriculum && !generating;

  // Fetch teachers for dropdown
  const { data: teachers = [] } = useQuery<TeacherOverview[]>({
    queryKey: ['teachers-overview'],
    queryFn: async () => {
      const res = await api.get<{ data: TeacherOverview[] }>('/users/teachers/overview');
      return res.data.data;
    },
  });

  // Generate curriculum
  async function handleGenerate() {
    setGenerating(true);
    setGenError('');
    setCurriculum(null);
    try {
      const res = await api.post<{ data: GeneratedCurriculum }>('/curriculum-generator/generate', {
        grade,
        subject,
        numWeeks,
        lessonsPerWeek,
      });
      const data = res.data.data;
      setCurriculum(data);
      setSubjectTitle(data.subjectTitle || `${grade} ${subject}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setGenError(msg ?? 'Failed to generate curriculum. Please try again.');
    } finally {
      setGenerating(false);
    }
  }

  // Create subject in DB
  async function handleCreate() {
    if (!curriculum) return;
    if (!subjectTitle.trim()) { setCreateError('Subject title is required'); return; }
    setCreating(true);
    setCreateError('');
    try {
      const res = await api.post<{ data: { subjectId: string } }>('/curriculum-generator/create', {
        title: subjectTitle.trim(),
        description: description.trim() || undefined,
        color,
        teacherId: teacherId || undefined,
        grade, // the grade selected in step 1 (e.g. "Grade 6")
        weeks: curriculum.weeks,
      });
      navigate(`/lms/subjects/${res.data.data.subjectId}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setCreateError(msg ?? 'Failed to create subject. Please try again.');
      setCreating(false);
    }
  }

  return (
    <div className="min-h-full bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center shadow-sm shadow-brand-500/30">
            <WandSparkles size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">AI Curriculum Generator</h1>
            <p className="text-sm text-slate-500">Generate a complete, progressive subject curriculum powered by AI</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">

        {/* ── Step 1 — Configure ── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <StepBadge n={1} active={!curriculum} done={!!curriculum} />
              <div>
                <p className="font-semibold text-slate-800">Configure Curriculum</p>
                <p className="text-xs text-slate-500">Select grade, subject, and structure</p>
              </div>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Grade Level"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                options={GRADES.map((g) => ({ value: g, label: g }))}
                disabled={generating || creating}
              />
              <Select
                label="Course"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                options={SUBJECTS.map((s) => ({ value: s, label: s }))}
                disabled={generating || creating}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-slate-700">Number of Weeks</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={numWeeks}
                  onChange={(e) => setNumWeeks(Math.max(1, Math.min(20, Number(e.target.value))))}
                  disabled={generating || creating}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-500 disabled:opacity-50 disabled:bg-slate-50 transition-colors"
                />
                <span className="text-xs text-slate-500">1–20 weeks</span>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-slate-700">Lessons per Week</label>
                <input
                  type="number"
                  min={1}
                  max={7}
                  value={lessonsPerWeek}
                  onChange={(e) => setLessonsPerWeek(Math.max(1, Math.min(7, Number(e.target.value))))}
                  disabled={generating || creating}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-500 disabled:opacity-50 disabled:bg-slate-50 transition-colors"
                />
                <span className="text-xs text-slate-500">1–7 lessons</span>
              </div>
            </div>

            {genError && (
              <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 text-sm">
                {genError}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={handleGenerate}
                loading={generating}
                icon={<WandSparkles size={15} />}
                disabled={generating || creating}
              >
                {generating ? 'Generating…' : curriculum ? 'Regenerate' : 'Generate Curriculum'}
              </Button>
              {curriculum && !generating && (
                <Button
                  variant="outline"
                  onClick={handleGenerate}
                  icon={<RefreshCw size={14} />}
                  disabled={creating}
                >
                  Regenerate
                </Button>
              )}
            </div>
          </CardBody>
        </Card>

        {/* ── Step 2 — Preview ── */}
        {(showStep2) && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <StepBadge n={2} active={generating || (!!curriculum && !creating)} done={false} />
                <div>
                  <p className="font-semibold text-slate-800">Preview Curriculum</p>
                  <p className="text-xs text-slate-500">
                    {generating
                      ? 'AI is generating your curriculum…'
                      : `${curriculum?.weeks.length} weeks · ${curriculum?.weeks.reduce((s, w) => s + w.lessons.length, 0)} lessons total`}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardBody>
              {generating ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <Spinner className="w-8 h-8" />
                  <p className="text-sm text-slate-500">
                    Designing {numWeeks}-week {subject} curriculum for {grade}…
                  </p>
                </div>
              ) : curriculum ? (
                <div className="space-y-2">
                  {curriculum.weeks.map((week) => (
                    <WeekAccordion key={week.weekNumber} week={week} />
                  ))}
                </div>
              ) : null}
            </CardBody>
          </Card>
        )}

        {/* ── Step 3 — Subject Setup ── */}
        {showStep3 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <StepBadge n={3} active={!creating} done={false} />
                <div>
                  <p className="font-semibold text-slate-800">Course Setup</p>
                  <p className="text-xs text-slate-500">Configure the course before saving to the database</p>
                </div>
              </div>
            </CardHeader>
            <CardBody className="space-y-5">
              <Input
                label="Course Title"
                value={subjectTitle}
                onChange={(e) => setSubjectTitle(e.target.value)}
                placeholder="e.g. Grade 6 Mathematics"
                disabled={creating}
              />

              <Textarea
                label="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of what students will learn in this subject…"
                rows={3}
                disabled={creating}
              />

              {/* Color picker */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-slate-700">Subject Color</label>
                <div className="flex items-center gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      disabled={creating}
                      className={`w-7 h-7 rounded-full transition-all ${
                        color === c ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                  {/* Current color preview */}
                  <div
                    className="ml-2 px-3 py-1 rounded-full text-white text-xs font-medium"
                    style={{ backgroundColor: color }}
                  >
                    {subjectTitle || 'Subject'}
                  </div>
                </div>
              </div>

              {/* Teacher assignment */}
              {teachers.length > 0 && (
                <Select
                  label="Assign Teacher (optional)"
                  value={teacherId}
                  onChange={(e) => setTeacherId(e.target.value)}
                  options={[
                    { value: '', label: '— No teacher yet —' },
                    ...teachers.map((t) => ({
                      value: t.id,
                      label: `${t.firstName} ${t.lastName}`,
                    })),
                  ]}
                  disabled={creating}
                />
              )}

              {createError && (
                <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg px-4 py-3 text-sm">
                  {createError}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <Button
                  onClick={handleCreate}
                  loading={creating}
                  icon={<CheckCircle2 size={15} />}
                  disabled={creating}
                  size="lg"
                >
                  {creating ? 'Creating Subject…' : 'Create Subject'}
                </Button>
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
