/**
 * QaidaReader — 3-panel Noorani Qaida page-by-page teaching interface.
 *
 * Desktop layout:
 *   [Left: Navigation + Student selector] [Center: Page viewer] [Right: Notes & progress]
 *
 * Mobile layout:
 *   Tab bar — Nav | Reader | Notes
 *
 * Route: /lms/noorani-qaida  (all roles, student sees own progress only)
 * Route: /lms/noorani-qaida/:studentId  (ADMIN/TEACHER only — view a specific student)
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  BookMarked, Trash2, Clock, BookOpen, User,
  CheckCircle2, LayoutPanelLeft, ChevronLeft, ChevronRight,
  RefreshCw, AlertCircle,
} from 'lucide-react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import { Spinner, Badge } from '../../components/ui';
import QaidaPanel from './QaidaPanel';
import type {
  QaidaBook, QaidaStudentProgress, QaidaBookmark,
  QaidaLessonNote, QaidaLessonHistory,
} from '../../types';

// ── Local types ──────────────────────────────────────────────────────────────

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

type QaidaProgressStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'REVISION_REQUIRED';
type MobileTab = 'nav' | 'reader' | 'notes';

// ── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<QaidaProgressStatus, string> = {
  NOT_STARTED:       'Not started',
  IN_PROGRESS:       'In progress',
  COMPLETED:         'Completed',
  REVISION_REQUIRED: 'Revision required',
};

const STATUS_BADGE: Record<QaidaProgressStatus, 'default' | 'success' | 'info' | 'warning' | 'danger' | 'purple'> = {
  NOT_STARTED:       'default',
  IN_PROGRESS:       'info',
  COMPLETED:         'success',
  REVISION_REQUIRED: 'warning',
};

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Component ────────────────────────────────────────────────────────────────

export default function QaidaReader() {
  const { studentId: paramStudentId } = useParams<{ studentId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const isStaff   = user?.role === 'ADMIN' || user?.role === 'TEACHER';
  const isStudent = user?.role === 'STUDENT';

  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    isStudent ? (user?.id ?? '') : (paramStudentId ?? ''),
  );
  const [selectedBookId, setSelectedBookId] = useState<string>('');
  const [currentPage, setCurrentPage]       = useState(1);
  const [pageInputVal, setPageInputVal]     = useState('1');
  const [activeTab, setActiveTab]           = useState<MobileTab>('reader');

  // Progress form (staff only)
  const [progressForm, setProgressForm] = useState({
    status:           'IN_PROGRESS' as QaidaProgressStatus,
    teacherNotes:     '',
    nextPage:         '',
    revisionRequired: false,
  });

  // Lesson note form
  const [noteForm, setNoteForm]             = useState({ note: '', nextPage: '', revisionRequired: false });
  const [showNoteForm, setShowNoteForm]     = useState(false);

  // Bookmark form
  const [bookmarkNote, setBookmarkNote]         = useState('');
  const [showBookmarkForm, setShowBookmarkForm] = useState(false);

  // Sync URL param → selected student
  useEffect(() => {
    if (paramStudentId && paramStudentId !== selectedStudentId) {
      setSelectedStudentId(paramStudentId);
    }
  }, [paramStudentId]);

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: books = [], isLoading: booksLoading } = useQuery<QaidaBook[]>({
    queryKey: ['qaida-books'],
    queryFn: () => api.get<{ data: QaidaBook[] }>('/qaida/books').then(r => r.data.data),
    staleTime: Infinity,
  });

  // Auto-select first book
  useEffect(() => {
    if (books.length > 0 && !selectedBookId) {
      setSelectedBookId(books[0].id);
    }
  }, [books]);

  const { data: students = [] } = useQuery<Student[]>({
    queryKey: ['students-active'],
    queryFn: () => api.get<{ data: Student[] }>('/users?role=STUDENT&isActive=true').then(r => r.data.data),
    enabled: isStaff,
  });

  const { data: progress, isLoading: progressLoading } = useQuery<QaidaStudentProgress | null>({
    queryKey: ['qaida-progress', selectedStudentId, selectedBookId],
    queryFn: () =>
      api.get<{ data: QaidaStudentProgress | null }>(`/qaida/progress/${selectedStudentId}/${selectedBookId}`)
        .then(r => r.data.data),
    enabled: !!selectedStudentId && !!selectedBookId,
  });

  const { data: bookmarks = [] } = useQuery<QaidaBookmark[]>({
    queryKey: ['qaida-bookmarks', selectedStudentId, selectedBookId],
    queryFn: () =>
      api.get<{ data: QaidaBookmark[] }>(`/qaida/bookmarks/${selectedStudentId}/${selectedBookId}`)
        .then(r => r.data.data),
    enabled: !!selectedStudentId && !!selectedBookId,
  });

  const { data: notes = [] } = useQuery<QaidaLessonNote[]>({
    queryKey: ['qaida-notes', selectedStudentId, selectedBookId],
    queryFn: () =>
      api.get<{ data: QaidaLessonNote[] }>(`/qaida/notes/${selectedStudentId}/${selectedBookId}`)
        .then(r => r.data.data),
    enabled: !!selectedStudentId && !!selectedBookId,
  });

  const { data: history = [] } = useQuery<QaidaLessonHistory[]>({
    queryKey: ['qaida-history', selectedStudentId, selectedBookId],
    queryFn: () =>
      api.get<{ data: QaidaLessonHistory[] }>(`/qaida/history/${selectedStudentId}/${selectedBookId}`)
        .then(r => r.data.data),
    enabled: !!selectedStudentId && !!selectedBookId,
  });

  // ── Mutations ──────────────────────────────────────────────────────────────

  const updateProgressMutation = useMutation({
    mutationFn: (data: object) =>
      api.put(`/qaida/progress/${selectedStudentId}/${selectedBookId}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['qaida-progress', selectedStudentId, selectedBookId] });
      toast.success('Progress updated');
    },
    onError: () => toast.error('Failed to update progress'),
  });

  const saveBookmarkMutation = useMutation({
    mutationFn: (data: object) => api.post('/qaida/bookmarks', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['qaida-bookmarks', selectedStudentId, selectedBookId] });
      toast.success('Bookmark saved');
      setBookmarkNote('');
      setShowBookmarkForm(false);
    },
    onError: () => toast.error('Failed to save bookmark'),
  });

  const deleteBookmarkMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/qaida/bookmarks/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['qaida-bookmarks', selectedStudentId, selectedBookId] });
      toast.success('Bookmark removed');
    },
    onError: () => toast.error('Failed to remove bookmark'),
  });

  const saveNoteMutation = useMutation({
    mutationFn: (data: object) => api.post('/qaida/notes', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['qaida-notes', selectedStudentId, selectedBookId] });
      qc.invalidateQueries({ queryKey: ['qaida-history', selectedStudentId, selectedBookId] });
      toast.success('Lesson note saved');
      setNoteForm({ note: '', nextPage: '', revisionRequired: false });
      setShowNoteForm(false);
    },
    onError: () => toast.error('Failed to save note'),
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/qaida/notes/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['qaida-notes', selectedStudentId, selectedBookId] });
      toast.success('Note deleted');
    },
    onError: () => toast.error('Failed to delete note'),
  });

  // ── Derived ────────────────────────────────────────────────────────────────

  const selectedBook    = books.find(b => b.id === selectedBookId) ?? null;
  const selectedStudent = students.find(s => s.id === selectedStudentId) ?? null;
  const totalPages      = selectedBook?.totalPages ?? 1;

  // Sync form when progress loads
  useEffect(() => {
    if (progress) {
      setProgressForm({
        status:           progress.status,
        teacherNotes:     progress.teacherNotes ?? '',
        nextPage:         progress.nextPage?.toString() ?? '',
        revisionRequired: progress.revisionRequired,
      });
      setCurrentPage(progress.currentPage);
      setPageInputVal(progress.currentPage.toString());
    } else {
      setProgressForm({ status: 'IN_PROGRESS', teacherNotes: '', nextPage: '', revisionRequired: false });
      setCurrentPage(1);
      setPageInputVal('1');
    }
  }, [progress]);

  // Reset page when book changes
  useEffect(() => {
    setCurrentPage(1);
    setPageInputVal('1');
  }, [selectedBookId]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function handlePageInput(val: string) {
    setPageInputVal(val);
    const n = parseInt(val, 10);
    if (!isNaN(n) && n >= 1 && n <= totalPages) setCurrentPage(n);
  }

  function handleStudentChange(id: string) {
    setSelectedStudentId(id);
    setCurrentPage(1);
    setPageInputVal('1');
    if (isStaff) navigate(`/lms/noorani-qaida/${id}`, { replace: true });
  }

  function submitProgress() {
    if (!selectedStudentId || !selectedBookId) return;
    const completedPages = progress?.completedPages ?? [];
    const isNewlyCompleted = !completedPages.includes(currentPage)
      && progressForm.status === 'COMPLETED';
    const updatedCompleted = isNewlyCompleted
      ? [...new Set([...completedPages, currentPage])]
      : completedPages;
    const completionPercentage = totalPages > 0
      ? Math.round((updatedCompleted.length / totalPages) * 100)
      : 0;

    updateProgressMutation.mutate({
      currentPage,
      completedPages: updatedCompleted,
      completionPercentage,
      status:           progressForm.status,
      teacherNotes:     progressForm.teacherNotes || null,
      nextPage:         progressForm.nextPage ? parseInt(progressForm.nextPage, 10) : null,
      revisionRequired: progressForm.revisionRequired,
      lastLessonDate:   new Date().toISOString(),
    });
  }

  function submitBookmark() {
    if (!selectedStudentId || !selectedBookId) return;
    saveBookmarkMutation.mutate({
      studentId:  selectedStudentId,
      bookId:     selectedBookId,
      pageNumber: currentPage,
      note:       bookmarkNote || null,
    });
  }

  function submitNote() {
    if (!selectedStudentId || !selectedBookId || !noteForm.note.trim()) return;
    saveNoteMutation.mutate({
      studentId:        selectedStudentId,
      bookId:           selectedBookId,
      pageNumber:       currentPage,
      lessonDate:       new Date().toISOString(),
      note:             noteForm.note,
      nextPage:         noteForm.nextPage ? parseInt(noteForm.nextPage, 10) : null,
      revisionRequired: noteForm.revisionRequired,
    });
  }

  // ── Sub-panels ─────────────────────────────────────────────────────────────

  const NavPanel = (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto h-full">

      {/* Book selector */}
      {books.length > 1 && (
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
            Book
          </label>
          <select
            value={selectedBookId}
            onChange={e => setSelectedBookId(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {books.map(b => (
              <option key={b.id} value={b.id}>{b.title}</option>
            ))}
          </select>
        </div>
      )}

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
              <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
            ))}
          </select>
        </div>
      )}

      {/* Page jump */}
      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
          Go to page
        </label>
        <div className="flex gap-2 items-center">
          <input
            type="number"
            min={1}
            max={totalPages}
            value={pageInputVal}
            onChange={e => handlePageInput(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder={`1–${totalPages}`}
          />
          <button
            onClick={() => { const n = parseInt(pageInputVal, 10); if (!isNaN(n) && n >= 1 && n <= totalPages) setCurrentPage(n); }}
            className="px-3 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors shrink-0"
          >
            Go
          </button>
        </div>
      </div>

      {/* Prev / Next shortcuts */}
      <div className="flex gap-2">
        <button
          onClick={() => { const p = Math.max(1, currentPage - 1); setCurrentPage(p); setPageInputVal(p.toString()); }}
          disabled={currentPage <= 1}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
        >
          <ChevronLeft size={14} /> Prev
        </button>
        <button
          onClick={() => { const p = Math.min(totalPages, currentPage + 1); setCurrentPage(p); setPageInputVal(p.toString()); }}
          disabled={currentPage >= totalPages}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
        >
          Next <ChevronRight size={14} />
        </button>
      </div>

      {/* Book progress bar */}
      {selectedStudentId && progress && selectedBook && (
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wide">Progress</span>
            <span className="font-bold text-slate-700">{Math.round(progress.completionPercentage)}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${progress.completionPercentage}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{progress.completedPages.length} / {selectedBook.totalPages} pages</span>
            <Badge variant={STATUS_BADGE[progress.status]} >{STATUS_LABELS[progress.status]}</Badge>
          </div>
        </div>
      )}

      {/* Current lesson card */}
      {selectedStudentId && !progressLoading && progress && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 space-y-1.5 text-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-700 uppercase tracking-wide">
            <User size={11} /> Current lesson
          </div>
          <div>
            <span className="text-amber-600 text-xs">Page: </span>
            <button
              onClick={() => { setCurrentPage(progress.currentPage); setPageInputVal(progress.currentPage.toString()); }}
              className="font-bold text-amber-900 hover:underline"
            >
              {progress.currentPage}
            </button>
          </div>
          {progress.nextPage && (
            <div>
              <span className="text-amber-600 text-xs">Next lesson: </span>
              <button
                onClick={() => { setCurrentPage(progress.nextPage!); setPageInputVal(progress.nextPage!.toString()); }}
                className="font-bold text-emerald-700 hover:underline"
              >
                page {progress.nextPage}
              </button>
            </div>
          )}
          {progress.revisionRequired && (
            <div className="flex items-center gap-1.5 text-xs text-red-600 font-medium">
              <AlertCircle size={11} /> Revision required
            </div>
          )}
          {progress.lastLessonDate && (
            <div className="text-xs text-amber-600">Last taught: {fmt(progress.lastLessonDate)}</div>
          )}
          {progress.teacher && (
            <div className="text-xs text-amber-600">
              Teacher: {progress.teacher.firstName} {progress.teacher.lastName}
            </div>
          )}
        </div>
      )}
    </div>
  );

  const NotesPanel = (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto h-full">

      {/* Progress update — staff only */}
      {isStaff && selectedStudentId && selectedBookId && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
            <CheckCircle2 size={12} /> Update Progress (page {currentPage})
          </h3>

          <div>
            <label className="block text-xs text-slate-600 mb-1">Status</label>
            <select
              value={progressForm.status}
              onChange={e => setProgressForm(f => ({ ...f, status: e.target.value as QaidaProgressStatus }))}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {(Object.keys(STATUS_LABELS) as QaidaProgressStatus[]).map(k => (
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
              placeholder="Notes for this page…"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-slate-600 mb-1">Next Lesson Page</label>
              <input
                type="number"
                min={1}
                max={totalPages}
                value={progressForm.nextPage}
                onChange={e => setProgressForm(f => ({ ...f, nextPage: e.target.value }))}
                placeholder="page #"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={progressForm.revisionRequired}
                  onChange={e => setProgressForm(f => ({ ...f, revisionRequired: e.target.checked }))}
                  className="rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                />
                Revision needed
              </label>
            </div>
          </div>

          <button
            onClick={submitProgress}
            disabled={updateProgressMutation.isPending}
            className="w-full rounded-lg bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white text-sm font-medium py-2 transition-colors"
          >
            {updateProgressMutation.isPending ? 'Saving…' : 'Save Progress'}
          </button>
        </div>
      )}

      {/* Lesson note form — staff only */}
      {isStaff && selectedStudentId && selectedBookId && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
              <BookOpen size={12} /> Lesson Notes
            </h3>
            <button
              onClick={() => setShowNoteForm(v => !v)}
              className="text-xs text-brand-600 hover:text-brand-800 font-medium"
            >
              + Add note
            </button>
          </div>

          {showNoteForm && (
            <div className="rounded-lg border border-brand-200 bg-brand-50 p-3 space-y-2">
              <div className="text-xs text-brand-700 font-medium">Note for page {currentPage}</div>
              <textarea
                value={noteForm.note}
                onChange={e => setNoteForm(f => ({ ...f, note: e.target.value }))}
                rows={3}
                placeholder="What was taught, errors, homework…"
                className="w-full rounded border border-brand-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-400 resize-none"
              />
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-brand-700 mb-1">Next page</label>
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={noteForm.nextPage}
                    onChange={e => setNoteForm(f => ({ ...f, nextPage: e.target.value }))}
                    placeholder="page #"
                    className="w-full rounded border border-brand-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-400"
                  />
                </div>
                <label className="flex items-center gap-1.5 text-xs text-brand-700 cursor-pointer pt-4">
                  <input
                    type="checkbox"
                    checked={noteForm.revisionRequired}
                    onChange={e => setNoteForm(f => ({ ...f, revisionRequired: e.target.checked }))}
                    className="rounded"
                  />
                  Revision
                </label>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={submitNote}
                  disabled={saveNoteMutation.isPending || !noteForm.note.trim()}
                  className="flex-1 rounded bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium py-1.5 transition-colors disabled:bg-brand-300"
                >
                  {saveNoteMutation.isPending ? 'Saving…' : 'Save Note'}
                </button>
                <button
                  onClick={() => setShowNoteForm(false)}
                  className="flex-1 rounded bg-white border border-slate-200 text-slate-600 text-xs font-medium py-1.5 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Recent notes */}
          {notes.length > 0 && (
            <div className="space-y-1.5 max-h-52 overflow-y-auto">
              {notes.slice(0, 8).map(n => (
                <div key={n.id} className="rounded-lg border border-slate-100 bg-white p-2.5 text-xs group">
                  <div className="flex items-start justify-between gap-1">
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="font-semibold text-slate-700">Page {n.pageNumber}</span>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-500">{fmt(n.lessonDate)}</span>
                        {n.revisionRequired && (
                          <span className="px-1 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-medium">Revision</span>
                        )}
                      </div>
                      <p className="text-slate-600">{n.note}</p>
                      {n.nextPage && (
                        <button
                          onClick={() => { setCurrentPage(n.nextPage!); setPageInputVal(n.nextPage!.toString()); }}
                          className="text-emerald-600 font-medium mt-0.5 hover:underline"
                        >
                          Next: page {n.nextPage}
                        </button>
                      )}
                      <div className="text-slate-400 mt-0.5">by {n.teacher.firstName}</div>
                    </div>
                    {isStaff && (
                      <button
                        onClick={() => deleteNoteMutation.mutate(n.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 transition-all shrink-0"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bookmarks */}
      {selectedStudentId && selectedBookId && (
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
              <div className="text-xs text-brand-700 font-medium">Bookmark page {currentPage}</div>
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
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {bookmarks.map(bm => (
                <div key={bm.id} className="flex items-start gap-2 p-2 rounded-lg border border-slate-100 hover:border-slate-200 bg-white group">
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
      {selectedStudentId && selectedBookId && history.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
            <Clock size={12} /> Lesson History
          </h3>
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {history.map(entry => (
              <div key={entry.id} className="rounded-lg border border-slate-100 bg-white p-2.5 text-xs">
                <div className="flex items-center justify-between mb-0.5">
                  <button
                    onClick={() => { setCurrentPage(entry.pageNumber); setPageInputVal(entry.pageNumber.toString()); }}
                    className="font-semibold text-brand-700 hover:underline"
                  >
                    Page {entry.pageNumber}
                  </button>
                  <span className="text-slate-400">{fmt(entry.lessonDate)}</span>
                </div>
                <div className="text-slate-500">
                  Teacher: {entry.teacher.firstName} {entry.teacher.lastName}
                </div>
                {entry.note && <div className="text-slate-600 mt-0.5 italic">{entry.note}</div>}
                {entry.nextPage && (
                  <div className="text-slate-500 mt-0.5">
                    Next:{' '}
                    <button
                      onClick={() => { setCurrentPage(entry.nextPage!); setPageInputVal(entry.nextPage!.toString()); }}
                      className="text-emerald-600 font-medium hover:underline"
                    >
                      page {entry.nextPage}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No selection prompt */}
      {!selectedStudentId && isStaff && (
        <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400 text-sm">
          <User size={32} className="text-slate-300" />
          <p className="text-center">Select a student to view and update lesson progress</p>
        </div>
      )}
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  if (booksLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    );
  }

  if (books.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-slate-400">
        <BookOpen size={40} className="text-slate-300" />
        <div className="text-center">
          <p className="font-medium text-slate-600">No Qaida books configured</p>
          <p className="text-sm mt-1">Run <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">pnpm db:seed:qaida-books</code> to seed the book registry.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 4rem)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white shrink-0">
        <div className="flex items-center gap-2.5">
          <BookMarked size={18} className="text-emerald-600" />
          <h1 className="text-lg font-bold text-slate-900">
            {selectedBook?.title ?? 'Noorani Qaida'}
          </h1>
          {selectedStudent && (
            <span className="text-sm text-slate-500">— {selectedStudent.firstName} {selectedStudent.lastName}</span>
          )}
          {isStudent && user && (
            <span className="text-sm text-slate-500">— My Progress</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {progress && <Badge variant={STATUS_BADGE[progress.status]}>{STATUS_LABELS[progress.status]}</Badge>}
          {progress && (
            <span className="text-xs text-slate-500 tabular-nums">
              {Math.round(progress.completionPercentage)}% complete
            </span>
          )}
        </div>
      </div>

      {/* Desktop 3-panel */}
      <div className="hidden lg:grid flex-1 min-h-0" style={{ gridTemplateColumns: '270px 1fr 300px' }}>
        {/* Left: Navigation */}
        <div className="border-r border-slate-200 bg-white overflow-hidden flex flex-col">
          {NavPanel}
        </div>

        {/* Center: Page viewer */}
        <div className="overflow-hidden flex flex-col bg-slate-200">
          {selectedBook && (selectedStudentId || isStudent) ? (
            <QaidaPanel
              key={`${selectedStudentId || 'student'}-${selectedBookId}`}
              imageFolder={selectedBook.imageFolder}
              pageNumber={currentPage}
              totalPages={totalPages}
              onNavigate={p => { setCurrentPage(p); setPageInputVal(p.toString()); }}
              allowHighlight={isStaff}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
              <LayoutPanelLeft size={40} className="text-slate-300" />
              <p className="text-sm">{isStaff ? 'Select a student to begin' : 'Loading…'}</p>
            </div>
          )}
        </div>

        {/* Right: Notes & progress */}
        <div className="border-l border-slate-200 bg-white overflow-hidden flex flex-col">
          {NotesPanel}
        </div>
      </div>

      {/* Mobile layout */}
      <div className="lg:hidden flex flex-col flex-1 min-h-0">
        <div className="flex-1 min-h-0 overflow-hidden">
          {activeTab === 'nav' && (
            <div className="h-full bg-white overflow-y-auto">{NavPanel}</div>
          )}
          {activeTab === 'reader' && (
            <div className="h-full">
              {selectedBook && (selectedStudentId || isStudent) ? (
                <QaidaPanel
                  key={`${selectedStudentId || 'student'}-${selectedBookId}`}
                  imageFolder={selectedBook.imageFolder}
                  pageNumber={currentPage}
                  totalPages={totalPages}
                  onNavigate={p => { setCurrentPage(p); setPageInputVal(p.toString()); }}
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

        {/* Mobile tab bar */}
        <div className="flex border-t border-slate-200 bg-white shrink-0">
          {([
            { tab: 'nav',    label: 'Navigate', icon: <RefreshCw size={16} /> },
            { tab: 'reader', label: 'Qaida',    icon: <BookOpen  size={16} /> },
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
