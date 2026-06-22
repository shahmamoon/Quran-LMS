import { useState, useMemo, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  BookMarked, ChevronDown, Trash2, Clock,
  BookOpen, User, CheckCircle2, LayoutPanelLeft,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import { Spinner, Badge } from '../../components/ui';
import MushaafPanel from './MushaafPanel';

// ── Types ────────────────────────────────────────────────────────────────────

interface QuranPage {
  pageNumber: number;
  juzNumber: number;
  surahNumber: number;
  surahNameEn: string;
  surahNameAr: string;
  ayahStart: number;
  isStartOfSurah: boolean;
}

interface StudentProgress {
  id: string;
  studentId: string;
  lastTeacherId: string | null;
  currentPage: number;
  currentSurah: number | null;
  currentAyah: number | null;
  currentJuz: number | null;
  lessonStatus: LessonStatus;
  teacherNotes: string | null;
  nextLessonPage: number | null;
  nextLessonAyah: number | null;
  updatedAt: string;
  lastTeacher: { id: string; firstName: string; lastName: string } | null;
}

interface Bookmark {
  id: string;
  teacherId: string;
  studentId: string;
  pageNumber: number;
  surahNumber: number | null;
  ayahNumber: number | null;
  note: string | null;
  createdAt: string;
  teacher: { id: string; firstName: string; lastName: string };
}

interface RecitationAttempt {
  pageNumber: number;
  status: string;
  masteryScore: number | null;
}

interface HistorySession {
  id: string;
  scheduledAt: string;
  status: string;
  overallNotes: string | null;
  teacher: { id: string; firstName: string; lastName: string };
  attempts: RecitationAttempt[];
}

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

type LessonStatus = 'NOT_STARTED' | 'EXCELLENT' | 'COMPLETED' | 'REVISION' | 'WEAK';
type MobileTab = 'nav' | 'reader' | 'notes';

// ── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<LessonStatus, string> = {
  NOT_STARTED: 'Not started',
  EXCELLENT:   'Excellent',
  COMPLETED:   'Completed',
  REVISION:    'Revision needed',
  WEAK:        'Weak — needs work',
};

const STATUS_BADGE: Record<LessonStatus, 'default' | 'success' | 'info' | 'warning' | 'danger' | 'purple'> = {
  NOT_STARTED: 'default',
  EXCELLENT:   'success',
  COMPLETED:   'info',
  REVISION:    'warning',
  WEAK:        'danger',
};

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Component ────────────────────────────────────────────────────────────────

export default function QuranReader() {
  const { studentId: paramStudentId } = useParams<{ studentId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const isStaff   = user?.role === 'ADMIN' || user?.role === 'TEACHER';
  const isStudent = user?.role === 'STUDENT';

  // For students, always use own ID; for staff use URL param or picker
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    isStudent ? (user?.id ?? '') : (paramStudentId ?? ''),
  );
  const [currentPage, setCurrentPage]   = useState(1);
  const [pageInputVal, setPageInputVal] = useState('1');
  const [activeTab, setActiveTab]       = useState<MobileTab>('reader');

  // Progress form state (staff only)
  const [progressForm, setProgressForm] = useState({
    lessonStatus:   'NOT_STARTED' as LessonStatus,
    teacherNotes:   '',
    nextLessonPage: '',
    nextLessonAyah: '',
  });

  // Bookmark form
  const [bookmarkNote, setBookmarkNote] = useState('');
  const [showBookmarkForm, setShowBookmarkForm] = useState(false);

  // Sync URL param → selected student when navigating directly to /lms/quran-reader/:studentId
  useEffect(() => {
    if (paramStudentId && paramStudentId !== selectedStudentId) {
      setSelectedStudentId(paramStudentId);
    }
  }, [paramStudentId]);

  // ── Queries ────────────────────────────────────────────────────────────────

  // All 604 pages (reference data — never changes)
  const { data: pages = [] } = useQuery<QuranPage[]>({
    queryKey: ['quran-pages'],
    queryFn: () => api.get<{ data: QuranPage[] }>('/recitation/pages').then(r => r.data.data),
    staleTime: Infinity,
  });

  // Students list for staff picker
  const { data: students = [] } = useQuery<Student[]>({
    queryKey: ['students-active'],
    queryFn: () =>
      api.get<{ data: Student[] }>('/users?role=STUDENT&isActive=true').then(r => r.data.data),
    enabled: isStaff,
  });

  // Student progress
  const { data: progress, isLoading: progressLoading } = useQuery<StudentProgress | null>({
    queryKey: ['quran-progress', selectedStudentId],
    queryFn: () =>
      api.get<{ data: StudentProgress | null }>(`/quran-reader/progress/${selectedStudentId}`)
        .then(r => r.data.data),
    enabled: !!selectedStudentId,
  });

  // Bookmarks
  const { data: bookmarks = [] } = useQuery<Bookmark[]>({
    queryKey: ['quran-bookmarks', selectedStudentId],
    queryFn: () =>
      api.get<{ data: Bookmark[] }>(`/quran-reader/bookmarks/${selectedStudentId}`)
        .then(r => r.data.data),
    enabled: !!selectedStudentId,
  });

  // Lesson history
  const { data: history = [] } = useQuery<HistorySession[]>({
    queryKey: ['quran-history', selectedStudentId],
    queryFn: () =>
      api.get<{ data: HistorySession[] }>(`/quran-reader/history/${selectedStudentId}`)
        .then(r => r.data.data),
    enabled: !!selectedStudentId,
  });

  // ── Mutations ──────────────────────────────────────────────────────────────

  const updateProgressMutation = useMutation({
    mutationFn: (data: object) =>
      api.put(`/quran-reader/progress/${selectedStudentId}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quran-progress', selectedStudentId] });
      toast.success('Progress updated');
    },
    onError: () => toast.error('Failed to update progress'),
  });

  const saveBookmarkMutation = useMutation({
    mutationFn: (data: object) => api.post('/quran-reader/bookmarks', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quran-bookmarks', selectedStudentId] });
      toast.success('Bookmark saved');
      setBookmarkNote('');
      setShowBookmarkForm(false);
    },
    onError: () => toast.error('Failed to save bookmark'),
  });

  const deleteBookmarkMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/quran-reader/bookmarks/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quran-bookmarks', selectedStudentId] });
      toast.success('Bookmark removed');
    },
    onError: () => toast.error('Failed to remove bookmark'),
  });

  // ── Derived data ───────────────────────────────────────────────────────────

  // Unique surah list derived from pages (first occurrence of each surahNumber)
  const surahs = useMemo(() => {
    const seen = new Set<number>();
    return pages
      .filter(p => { if (seen.has(p.surahNumber)) return false; seen.add(p.surahNumber); return true; })
      .sort((a, b) => a.surahNumber - b.surahNumber);
  }, [pages]);

  // First page of each juz
  const juzPages = useMemo(() => {
    const map = new Map<number, number>();
    for (const p of pages) {
      if (!map.has(p.juzNumber)) map.set(p.juzNumber, p.pageNumber);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a - b);
  }, [pages]);

  // Current page's surah info
  const currentPageInfo = useMemo(
    () => pages.find(p => p.pageNumber === currentPage) ?? null,
    [pages, currentPage],
  );

  // Sync progress form when student changes
  useEffect(() => {
    if (progress) {
      setProgressForm({
        lessonStatus:   progress.lessonStatus,
        teacherNotes:   progress.teacherNotes ?? '',
        nextLessonPage: progress.nextLessonPage?.toString() ?? '',
        nextLessonAyah: progress.nextLessonAyah?.toString() ?? '',
      });
      setCurrentPage(progress.currentPage);
      setPageInputVal(progress.currentPage.toString());
    } else {
      setProgressForm({ lessonStatus: 'NOT_STARTED', teacherNotes: '', nextLessonPage: '', nextLessonAyah: '' });
      setCurrentPage(1);
      setPageInputVal('1');
    }
  }, [progress]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handlePageInput(val: string) {
    setPageInputVal(val);
    const n = parseInt(val, 10);
    if (!isNaN(n) && n >= 1 && n <= 604) {
      setCurrentPage(n);
    }
  }

  function handleSurahSelect(surahNumber: number) {
    const page = surahs.find(s => s.surahNumber === surahNumber);
    if (page) { setCurrentPage(page.pageNumber); setPageInputVal(page.pageNumber.toString()); }
  }

  function handleJuzSelect(juz: number) {
    const pageNum = juzPages.find(([j]) => j === juz)?.[1];
    if (pageNum) { setCurrentPage(pageNum); setPageInputVal(pageNum.toString()); }
  }

  function handleStudentChange(id: string) {
    setSelectedStudentId(id);
    setCurrentPage(1);
    setPageInputVal('1');
    if (isStaff) navigate(`/lms/quran-reader/${id}`, { replace: true });
  }

  function submitProgress() {
    if (!selectedStudentId) return;
    updateProgressMutation.mutate({
      currentPage,
      currentSurah:   currentPageInfo?.surahNumber   ?? null,
      currentJuz:     currentPageInfo?.juzNumber     ?? null,
      currentAyah:    currentPageInfo?.ayahStart     ?? null,
      lessonStatus:   progressForm.lessonStatus,
      teacherNotes:   progressForm.teacherNotes || null,
      nextLessonPage: progressForm.nextLessonPage ? parseInt(progressForm.nextLessonPage, 10) : null,
      nextLessonAyah: progressForm.nextLessonAyah ? parseInt(progressForm.nextLessonAyah, 10) : null,
    });
  }

  function submitBookmark() {
    if (!selectedStudentId) return;
    saveBookmarkMutation.mutate({
      studentId:   selectedStudentId,
      pageNumber:  currentPage,
      surahNumber: currentPageInfo?.surahNumber ?? null,
      ayahNumber:  null,
      note:        bookmarkNote || null,
    });
  }

  const selectedStudent = students.find(s => s.id === selectedStudentId);

  // ── Sub-panels ──────────────────────────────────────────────────────────────

  const NavPanel = (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto h-full">

      {/* Student selector — staff only */}
      {isStaff && (
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
            Student
          </label>
          <select
            value={selectedStudentId}
            onChange={e => handleStudentChange(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">— Select student —</option>
            {students.map(s => (
              <option key={s.id} value={s.id}>
                {s.firstName} {s.lastName}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Navigation selectors */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
          Go to Page
        </label>
        <input
          type="number"
          min={1}
          max={604}
          value={pageInputVal}
          onChange={e => handlePageInput(e.target.value)}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          placeholder="1–604"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
          Go to Surah
        </label>
        <select
          value={currentPageInfo?.surahNumber ?? ''}
          onChange={e => handleSurahSelect(parseInt(e.target.value, 10))}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">— Select surah —</option>
          {surahs.map(s => (
            <option key={s.surahNumber} value={s.surahNumber}>
              {s.surahNumber}. {s.surahNameEn} — {s.surahNameAr}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
          Go to Para / Juz
        </label>
        <select
          value={currentPageInfo?.juzNumber ?? ''}
          onChange={e => handleJuzSelect(parseInt(e.target.value, 10))}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">— Select juz —</option>
          {juzPages.map(([juz, pg]) => (
            <option key={juz} value={juz}>
              Para {juz} (starts p.{pg})
            </option>
          ))}
        </select>
      </div>

      {/* Current page info card */}
      {currentPageInfo && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-sm space-y-1">
          <div className="font-semibold text-amber-900">Page {currentPageInfo.pageNumber}</div>
          <div className="text-amber-700">
            Surah {currentPageInfo.surahNumber} · {currentPageInfo.surahNameEn}
          </div>
          <div className="text-amber-700 text-xs">
            {currentPageInfo.surahNameAr} · Juz {currentPageInfo.juzNumber}
          </div>
          <div className="text-amber-600 text-xs">
            Starts at ayah {currentPageInfo.ayahStart}
            {currentPageInfo.isStartOfSurah && ' (new surah)'}
          </div>
        </div>
      )}

      {/* Student current lesson card */}
      {selectedStudentId && !progressLoading && progress && (
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            <User size={12} /> Last lesson
          </div>
          <div className="text-sm space-y-1">
            <div>
              <span className="text-slate-500">Page: </span>
              <button
                onClick={() => { setCurrentPage(progress.currentPage); setPageInputVal(progress.currentPage.toString()); }}
                className="font-bold text-brand-600 hover:underline"
              >
                {progress.currentPage}
              </button>
            </div>
            {progress.currentSurah && (
              <div>
                <span className="text-slate-500">Surah: </span>
                <span className="font-medium">{progress.currentSurah}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 mt-1">
              <Badge variant={STATUS_BADGE[progress.lessonStatus]}>
                {STATUS_LABELS[progress.lessonStatus]}
              </Badge>
            </div>
            {progress.nextLessonPage && (
              <div className="text-xs text-slate-500">
                Next lesson: page{' '}
                <button
                  onClick={() => { setCurrentPage(progress.nextLessonPage!); setPageInputVal(progress.nextLessonPage!.toString()); }}
                  className="font-bold text-emerald-600 hover:underline"
                >
                  {progress.nextLessonPage}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const NotesPanel = (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto h-full">

      {/* Progress update form — staff only */}
      {isStaff && selectedStudentId && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
            <CheckCircle2 size={12} /> Update Lesson
          </h3>

          <div>
            <label className="block text-xs text-slate-600 mb-1">Lesson Status</label>
            <select
              value={progressForm.lessonStatus}
              onChange={e => setProgressForm(f => ({ ...f, lessonStatus: e.target.value as LessonStatus }))}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {(Object.keys(STATUS_LABELS) as LessonStatus[]).map(k => (
                <option key={k} value={k}>{STATUS_LABELS[k]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-600 mb-1">Teacher Notes</label>
            <textarea
              value={progressForm.teacherNotes}
              onChange={e => setProgressForm(f => ({ ...f, teacherNotes: e.target.value }))}
              rows={3}
              placeholder="Notes about this lesson…"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-slate-600 mb-1">Next Lesson Page</label>
              <input
                type="number"
                min={1}
                max={604}
                value={progressForm.nextLessonPage}
                onChange={e => setProgressForm(f => ({ ...f, nextLessonPage: e.target.value }))}
                placeholder="page #"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">Next Lesson Ayah</label>
              <input
                type="number"
                min={1}
                value={progressForm.nextLessonAyah}
                onChange={e => setProgressForm(f => ({ ...f, nextLessonAyah: e.target.value }))}
                placeholder="ayah #"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <button
            onClick={submitProgress}
            disabled={updateProgressMutation.isPending || !selectedStudentId}
            className="w-full rounded-lg bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium py-2 transition-colors"
          >
            {updateProgressMutation.isPending ? 'Saving…' : 'Save Progress'}
          </button>
        </div>
      )}

      {/* Bookmarks */}
      {selectedStudentId && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
              <BookMarked size={12} /> Bookmarks
            </h3>
            {isStaff && (
              <button
                onClick={() => setShowBookmarkForm(v => !v)}
                className="text-xs text-brand-600 hover:text-brand-800 font-medium"
              >
                + Add
              </button>
            )}
          </div>

          {showBookmarkForm && isStaff && (
            <div className="rounded-lg border border-brand-200 bg-brand-50 p-3 space-y-2">
              <div className="text-xs text-brand-700 font-medium">
                Bookmark page {currentPage}
                {currentPageInfo ? ` · ${currentPageInfo.surahNameEn}` : ''}
              </div>
              <textarea
                value={bookmarkNote}
                onChange={e => setBookmarkNote(e.target.value)}
                rows={2}
                placeholder="Optional note…"
                className="w-full rounded border border-brand-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-400 resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={submitBookmark}
                  disabled={saveBookmarkMutation.isPending}
                  className="flex-1 rounded bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium py-1.5 transition-colors disabled:bg-brand-300"
                >
                  {saveBookmarkMutation.isPending ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={() => setShowBookmarkForm(false)}
                  className="flex-1 rounded bg-white border border-slate-200 text-slate-600 text-xs font-medium py-1.5 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {bookmarks.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-2">No bookmarks yet</p>
          ) : (
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {bookmarks.map(bm => (
                <div
                  key={bm.id}
                  className="flex items-start gap-2 p-2 rounded-lg border border-slate-100 hover:border-slate-200 bg-white group"
                >
                  <button
                    onClick={() => { setCurrentPage(bm.pageNumber); setPageInputVal(bm.pageNumber.toString()); }}
                    className="flex-1 text-left"
                  >
                    <div className="text-xs font-semibold text-brand-700">Page {bm.pageNumber}</div>
                    {bm.note && <div className="text-xs text-slate-500 mt-0.5">{bm.note}</div>}
                    <div className="text-xs text-slate-400 mt-0.5">by {bm.teacher.firstName}</div>
                  </button>
                  {isStaff && (
                    <button
                      onClick={() => deleteBookmarkMutation.mutate(bm.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition-all"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lesson history */}
      {selectedStudentId && history.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
            <Clock size={12} /> Lesson History
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {history.map(session => (
              <div key={session.id} className="rounded-lg border border-slate-100 bg-white p-2.5 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-slate-700">{fmt(session.scheduledAt)}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
                    session.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                    session.status === 'CANCELLED' ? 'bg-red-100 text-red-600' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {session.status}
                  </span>
                </div>
                <div className="text-slate-500 mb-1">
                  Teacher: {session.teacher.firstName} {session.teacher.lastName}
                </div>
                {session.attempts.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {session.attempts.map((a, i) => (
                      <button
                        key={i}
                        onClick={() => { setCurrentPage(a.pageNumber); setPageInputVal(a.pageNumber.toString()); }}
                        className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                          a.status === 'COMPLETED'    ? 'bg-emerald-100 text-emerald-700' :
                          a.status === 'NEEDS_REVIEW' ? 'bg-red-100 text-red-600' :
                          a.status === 'PRACTICING'   ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-600'
                        }`}
                        title={`Page ${a.pageNumber} · ${a.status}${a.masteryScore != null ? ` · ${a.masteryScore}%` : ''}`}
                      >
                        p.{a.pageNumber}
                      </button>
                    ))}
                  </div>
                )}
                {session.overallNotes && (
                  <div className="mt-1 text-slate-500 italic">{session.overallNotes}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No student selected */}
      {!selectedStudentId && isStaff && (
        <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400 text-sm">
          <User size={32} className="text-slate-300" />
          <p>Select a student to view and update lesson progress</p>
        </div>
      )}
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  if (pages.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 4rem)' }}>
      {/* ── Page header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white shrink-0">
        <div className="flex items-center gap-2">
          <BookOpen size={18} className="text-amber-600" />
          <h1 className="text-lg font-bold text-slate-900">Quran Reader</h1>
          {selectedStudent && (
            <span className="text-sm text-slate-500">
              — {selectedStudent.firstName} {selectedStudent.lastName}
            </span>
          )}
          {isStudent && user && (
            <span className="text-sm text-slate-500">— My Progress</span>
          )}
        </div>
        {progress && (
          <Badge variant={STATUS_BADGE[progress.lessonStatus]}>
            {STATUS_LABELS[progress.lessonStatus]}
          </Badge>
        )}
      </div>

      {/* ── Desktop 3-panel layout ── */}
      <div className="hidden lg:grid flex-1 min-h-0" style={{ gridTemplateColumns: '260px 1fr 300px' }}>
        {/* Left: Navigation */}
        <div className="border-r border-slate-200 bg-white overflow-hidden flex flex-col">
          {NavPanel}
        </div>

        {/* Center: Mushaf */}
        <div className="overflow-hidden flex flex-col bg-slate-100">
          {selectedStudentId || isStudent ? (
            <MushaafPanel
              key={selectedStudentId || 'student'}
              pageNumber={currentPage}
              onNavigate={page => { setCurrentPage(page); setPageInputVal(page.toString()); }}
              allowHighlight={isStaff}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
              <LayoutPanelLeft size={40} className="text-slate-300" />
              <p className="text-sm">Select a student to begin</p>
            </div>
          )}
        </div>

        {/* Right: Notes & Progress */}
        <div className="border-l border-slate-200 bg-white overflow-hidden flex flex-col">
          {NotesPanel}
        </div>
      </div>

      {/* ── Mobile layout ── */}
      <div className="lg:hidden flex flex-col flex-1 min-h-0">
        {/* Content area */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {activeTab === 'nav' && (
            <div className="h-full bg-white overflow-y-auto">{NavPanel}</div>
          )}
          {activeTab === 'reader' && (
            <div className="h-full">
              {selectedStudentId || isStudent ? (
                <MushaafPanel
                  key={selectedStudentId || 'student'}
                  pageNumber={currentPage}
                  onNavigate={page => { setCurrentPage(page); setPageInputVal(page.toString()); }}
                  allowHighlight={isStaff}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
                  <BookOpen size={32} className="text-slate-300" />
                  <p className="text-sm">Select a student in the Nav tab</p>
                </div>
              )}
            </div>
          )}
          {activeTab === 'notes' && (
            <div className="h-full bg-white overflow-y-auto">{NotesPanel}</div>
          )}
        </div>

        {/* Tab bar */}
        <div className="flex border-t border-slate-200 bg-white shrink-0">
          {([
            { tab: 'nav',    label: 'Navigate', icon: <ChevronDown size={16} /> },
            { tab: 'reader', label: 'Mushaf',   icon: <BookOpen size={16} /> },
            { tab: 'notes',  label: 'Notes',    icon: <BookMarked size={16} /> },
          ] as { tab: MobileTab; label: string; icon: React.ReactNode }[]).map(({ tab, label, icon }) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors ${
                activeTab === tab
                  ? 'text-brand-600 border-t-2 border-brand-500 -mt-[2px]'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
