import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookOpen, CheckCircle2, ChevronLeft, ChevronDown, ChevronRight, X, ZoomIn, ZoomOut, ImageIcon, Maximize, Minimize, RotateCcw, Highlighter } from 'lucide-react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import { Card, CardBody, Badge, Spinner, EmptyState } from '../../components/ui';
import { cn, fullName } from '../../lib/utils';
import type { User } from '../../types';
import { toast } from 'sonner';

interface LessonResource {
  id: string;
  url: string;
  filename: string;
  originalName: string;
  mimeType: string;
}

interface Lesson {
  id: string;
  order: number;
  title: string;
  content: string | null;
  resources: LessonResource[] | null;
  isPublished: boolean;
}

interface Week {
  id: string;
  order: number;
  title: string;
  description: string | null;
  lessons: Lesson[];
}

interface LessonProgress {
  lessonId: string;
  completedAt: string;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.25;

// ─── Lesson image modal ───────────────────────────────────────
interface LessonImageModalProps {
  lesson: Lesson;
  onClose: () => void;
}

function LessonImageModal({ lesson, onClose }: LessonImageModalProps) {
  const images = (lesson.resources ?? []).filter(r => r.mimeType.startsWith('image/'));
  const [index, setIndex]               = useState(0);
  const [loaded, setLoaded]             = useState(false);
  const [zoom, setZoom]                 = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDragging, setIsDragging]     = useState(false);
  const [highlightMode, setHighlightMode] = useState(false);
  const [highlightYFrac, setHighlightYFrac] = useState<number | null>(null);

  const backdropRef     = useRef<HTMLDivElement>(null);
  const scrollRef       = useRef<HTMLDivElement>(null);
  const imgRef          = useRef<HTMLImageElement>(null);
  const lastPos         = useRef({ x: 0, y: 0 });
  const lastPinchDist   = useRef<number | null>(null);
  const draggingRef     = useRef(false);

  const current = images[index];

  const applyZoom = useCallback((next: number) => {
    setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next)));
  }, []);

  // Reset on image change; fallback timeout so spinner never hangs indefinitely
  useEffect(() => {
    setLoaded(false);
    setZoom(1);
    setHighlightYFrac(null);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    const t = setTimeout(() => setLoaded(true), 8000);
    return () => clearTimeout(t);
  }, [index]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowLeft')  setIndex(i => Math.max(0, i - 1));
      if (e.key === 'ArrowRight') setIndex(i => Math.min(images.length - 1, i + 1));
      if ((e.key === '+' || e.key === '=') && !e.ctrlKey) applyZoom(zoom + ZOOM_STEP);
      if (e.key === '-' && !e.ctrlKey)                     applyZoom(zoom - ZOOM_STEP);
      if (e.key === '0') setZoom(1);
      if (e.key === 'h') setHighlightMode(m => !m);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [images.length, zoom, applyZoom, onClose]);

  // Ctrl+scroll to zoom
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      applyZoom(zoom + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [zoom, applyZoom]);

  // Drag to pan
  function onMouseDown(e: React.MouseEvent) {
    if (zoom <= 1 || highlightMode) return;
    draggingRef.current = true;
    setIsDragging(true);
    lastPos.current = { x: e.clientX, y: e.clientY };
    e.preventDefault();
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!draggingRef.current || !scrollRef.current) return;
    scrollRef.current.scrollLeft -= e.clientX - lastPos.current.x;
    scrollRef.current.scrollTop  -= e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
  }
  function onMouseUp() { draggingRef.current = false; setIsDragging(false); }

  // Touch pinch + drag
  function onTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      lastPinchDist.current = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
    } else if (e.touches.length === 1 && zoom > 1 && !highlightMode) {
      draggingRef.current = true;
      lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }
  function onTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && lastPinchDist.current !== null) {
      e.preventDefault();
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      applyZoom(zoom * (dist / lastPinchDist.current));
      lastPinchDist.current = dist;
    } else if (e.touches.length === 1 && draggingRef.current && scrollRef.current) {
      scrollRef.current.scrollLeft -= e.touches[0].clientX - lastPos.current.x;
      scrollRef.current.scrollTop  -= e.touches[0].clientY - lastPos.current.y;
      lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }
  function onTouchEnd() { draggingRef.current = false; lastPinchDist.current = null; }

  // Fullscreen
  function toggleFullscreen() {
    if (!document.fullscreenElement) backdropRef.current?.requestFullscreen().catch(() => {});
    else document.exitFullscreen().catch(() => {});
  }
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const canPrev = index > 0;
  const canNext = index < images.length - 1;
  const cursor  = highlightMode ? 'crosshair' : zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default';

  function onImageClick(e: React.MouseEvent) {
    if (!highlightMode || !imgRef.current) return;
    e.stopPropagation();
    const rect = imgRef.current.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1 - 0.055, (e.clientY - rect.top) / rect.height - 0.055 / 2));
    setHighlightYFrac(frac);
  }

  function onImageTouchEnd(e: React.TouchEvent) {
    if (!highlightMode || !imgRef.current || lastPinchDist.current !== null) return;
    if (e.changedTouches.length !== 1) return;
    const rect = imgRef.current.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1 - 0.055, (e.changedTouches[0].clientY - rect.top) / imgRef.current.getBoundingClientRect().height - 0.055 / 2));
    setHighlightYFrac(frac);
  }

  return (
    <div ref={backdropRef} className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center" onClick={onClose}>
      <div
        className={`flex flex-col bg-white shadow-2xl overflow-hidden transition-all ${
          isFullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-3xl rounded-2xl'
        }`}
        style={isFullscreen ? {} : { maxHeight: 'calc(100vh - 2rem)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Top bar ── */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-200 shrink-0">
          {/* Left: prev / title / next */}
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={() => canPrev && setIndex(i => i - 1)} disabled={!canPrev}
              title="Previous image (←)"
              className="p-1.5 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-200 disabled:opacity-30 transition-colors shrink-0">
              <ChevronLeft size={16} />
            </button>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{lesson.title}</p>
              {images.length > 1 && (
                <p className="text-xs text-slate-400 truncate">{current?.originalName} · {index + 1}/{images.length}</p>
              )}
            </div>
            <button onClick={() => canNext && setIndex(i => i + 1)} disabled={!canNext}
              title="Next image (→)"
              className="p-1.5 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-200 disabled:opacity-30 transition-colors shrink-0">
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Right: highlight + zoom controls + reset + fullscreen + close */}
          <div className="flex items-center gap-0.5 shrink-0 ml-3">
            <button
              onClick={() => setHighlightMode(m => !m)}
              title={highlightMode ? 'Exit highlight mode (H)' : 'Highlight a row (H)'}
              className={`p-1.5 rounded transition-colors ${
                highlightMode
                  ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-400'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200'
              }`}
            >
              <Highlighter size={16} />
            </button>
            {highlightYFrac !== null && !highlightMode && (
              <button
                onClick={() => setHighlightYFrac(null)}
                title="Clear highlight"
                className="text-xs text-slate-400 hover:text-red-500 px-1.5 py-1 rounded hover:bg-red-50 transition-colors"
              >
                Clear
              </button>
            )}
            <div className="w-px h-5 bg-slate-200 mx-1" />
            <button onClick={() => applyZoom(zoom - ZOOM_STEP)} disabled={zoom <= MIN_ZOOM}
              title="Zoom out (−)"
              className="p-1.5 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-200 disabled:opacity-30 transition-colors">
              <ZoomOut size={16} />
            </button>
            <button onClick={() => setZoom(1)} title="Reset zoom (0)"
              className="min-w-[3.2rem] text-center text-xs font-mono text-slate-500 hover:text-slate-800 px-1.5 py-1.5 rounded hover:bg-slate-200 transition-colors">
              {Math.round(zoom * 100)}%
            </button>
            <button onClick={() => applyZoom(zoom + ZOOM_STEP)} disabled={zoom >= MAX_ZOOM}
              title="Zoom in (+)"
              className="p-1.5 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-200 disabled:opacity-30 transition-colors">
              <ZoomIn size={16} />
            </button>

            <div className="w-px h-5 bg-slate-200 mx-1" />

            <button onClick={() => { setZoom(1); if (scrollRef.current) scrollRef.current.scrollTop = 0; }}
              title="Reset view"
              className="p-1.5 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors">
              <RotateCcw size={15} />
            </button>
            <button onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              className="p-1.5 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors">
              {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
            </button>

            <div className="w-px h-5 bg-slate-200 mx-1" />

            <button onClick={onClose} title="Close (Esc)"
              className="p-1.5 rounded text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── Scrollable image area ── */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-auto bg-slate-100 min-h-0 relative"
          style={{ cursor }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {images.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 h-full min-h-[400px] text-slate-400">
              <ImageIcon size={40} />
              <p className="text-sm">No images available for this lesson.</p>
            </div>
          ) : (
            <>
              {!loaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-white z-10 min-h-[400px]">
                  <div className="w-10 h-10 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              <div className="flex justify-center p-4">
                <div className="relative inline-block" style={{ width: `${zoom * 100}%` }}>
                  <img
                    ref={(el) => {
                      (imgRef as React.MutableRefObject<HTMLImageElement | null>).current = el;
                      if (el?.complete) setLoaded(true);
                    }}
                    key={current?.url}
                    src={current?.url}
                    alt={current?.originalName}
                    draggable={false}
                    style={{
                      width: '100%',
                      height: 'auto',
                      maxWidth: 'none',
                      userSelect: 'none',
                      boxShadow: '0 2px 16px rgba(0,0,0,0.15)',
                      borderRadius: '4px',
                    }}
                    onClick={onImageClick}
                    onTouchEnd={onImageTouchEnd}
                    onLoad={() => setLoaded(true)}
                    onError={() => setLoaded(true)}
                  />

                  {/* Highlight band */}
                  {loaded && highlightYFrac !== null && (
                    <div
                      className="absolute left-0 right-0 pointer-events-none"
                      style={{
                        top:    `${highlightYFrac * 100}%`,
                        height: '5.5%',
                        background: 'rgba(251, 191, 36, 0.35)',
                        borderTop:    '2px solid rgba(217, 119, 6, 0.7)',
                        borderBottom: '2px solid rgba(217, 119, 6, 0.7)',
                        borderRadius: '2px',
                      }}
                    />
                  )}

                  {/* Hover guide in highlight mode */}
                  {loaded && highlightMode && (
                    <div
                      className="absolute left-0 right-0 pointer-events-none opacity-0 hover:opacity-100 transition-opacity"
                      style={{
                        top: '0', height: '5.5%',
                        background: 'rgba(251, 191, 36, 0.2)',
                        borderTop: '1px dashed rgba(217,119,6,0.5)',
                        borderBottom: '1px dashed rgba(217,119,6,0.5)',
                      }}
                    />
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Bottom hint ── */}
        <div className="text-center text-slate-400 text-xs py-2 border-t border-slate-200 shrink-0">
          H to highlight row · Ctrl+scroll to zoom · ← → to navigate · Esc to close
        </div>
      </div>

      <style>{`
        :fullscreen { background: rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; }
        :-webkit-full-screen { background: rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; }
      `}</style>
    </div>
  );
}

export default function NooraniQaida() {
  const { id: NOORANI_ID = 'noorani-qaida' } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const qc = useQueryClient();
  const isStaff = user?.role === 'ADMIN' || user?.role === 'TEACHER';
  const isStudent = user?.role === 'STUDENT';

  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    isStudent ? user!.id : (searchParams.get('student') ?? '')
  );
  const [collapsedWeeks, setCollapsedWeeks] = useState<Set<string>>(new Set());
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);

  useEffect(() => {
    const studentParam = searchParams.get('student');
    if (studentParam && isStaff) setSelectedStudentId(studentParam);
  }, [searchParams, isStaff]);

  const studentId = isStudent ? user!.id : selectedStudentId;

  // Course weeks + lessons
  const { data: subject, isLoading: loadingSubject } = useQuery({
    queryKey: ['subject', NOORANI_ID],
    queryFn: () => api.get<{ data: { weeks: Week[] } }>(`/subjects/${NOORANI_ID}`).then(r => r.data.data),
  });


  // Student list (staff only)
  const { data: students = [], isLoading: loadingStudents } = useQuery({
    queryKey: ['students-list'],
    queryFn: () => api.get<{ data: User[] }>('/users?role=STUDENT').then(r => r.data.data),
    enabled: isStaff,
  });

  // Lesson progress for selected student
  const { data: allProgress = [], isLoading: loadingProgress } = useQuery({
    queryKey: ['noorani-progress', studentId],
    queryFn: () =>
      api.get<{ data: { lessonId: string; completedAt: string }[] }>(
        `/curriculum/progress/${studentId}`,
      ).then(r => r.data.data),
    enabled: !!studentId,
  });

  // Filter to Noorani lessons only
  const lessonIds = new Set(
    subject?.weeks.flatMap(w => w.lessons.map(l => l.id)) ?? [],
  );
  const progress: LessonProgress[] = allProgress.filter(p => lessonIds.has(p.lessonId));
  const completedSet = new Set(progress.map(p => p.lessonId));

  // When arriving from a session card (?student= param), auto-open the current lesson
  // (first incomplete). Runs once when both subject + progress are loaded.
  const autoOpenDone = useRef(false);
  useEffect(() => {
    if (autoOpenDone.current) return;
    if (!searchParams.get('student')) return; // only when coming from session
    if (!subject || allProgress === undefined) return;
    const allLessons = subject.weeks.flatMap(w => w.lessons);
    if (allLessons.length === 0) return;
    const next = allLessons.find(l => !completedSet.has(l.id));
    if (next) {
      setActiveLesson(next);
      autoOpenDone.current = true;
    }
  }, [subject, completedSet.size, searchParams]);

  const totalLessons = subject?.weeks.reduce((acc, w) => acc + w.lessons.length, 0) ?? 0;
  const completedCount = progress.length;
  const pct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  // Mark complete / incomplete (staff toggling for a student)
  const markMutation = useMutation({
    mutationFn: ({ lessonId, complete }: { lessonId: string; complete: boolean }) => {
      if (complete) {
        return api.post(`/curriculum/lessons/${lessonId}/complete`, { userId: studentId });
      }
      return api.delete(`/curriculum/lessons/${lessonId}/complete`, { data: { userId: studentId } });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['noorani-progress', studentId] }),
    onError: () => toast.error('Failed to update progress'),
  });

  function toggleWeek(weekId: string) {
    setCollapsedWeeks(prev => {
      const next = new Set(prev);
      if (next.has(weekId)) next.delete(weekId);
      else next.add(weekId);
      return next;
    });
  }

  const selectedStudent = students.find(s => s.id === studentId);
  const weeks: Week[] = subject?.weeks ?? [];

  return (
    <>
    {activeLesson && (
      <LessonImageModal lesson={activeLesson} onClose={() => setActiveLesson(null)} />
    )}
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/lms/subjects')}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Noorani Qaida</h1>
          <p className="text-sm text-slate-500 mt-0.5">6 weeks · 22 lessons — Arabic reading foundations</p>
        </div>
      </div>

      {/* Student picker (staff only) */}
      {isStaff && (
        <Card>
          <CardBody className="py-3">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-slate-700 shrink-0">Student</label>
              {loadingStudents ? (
                <Spinner className="w-4 h-4" />
              ) : (
                <select
                  value={selectedStudentId}
                  onChange={e => setSelectedStudentId(e.target.value)}
                  className="flex-1 max-w-xs rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">— select a student —</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{fullName(s)}</option>
                  ))}
                </select>
              )}
              {selectedStudent && <Badge variant="info">{fullName(selectedStudent)}</Badge>}
            </div>
          </CardBody>
        </Card>
      )}

      {!studentId ? (
        <EmptyState
          icon={<BookOpen size={40} />}
          title="Select a student"
          description="Choose a student from the dropdown above to view their Noorani Qaida progress."
        />
      ) : loadingSubject || loadingProgress ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : (
        <>
          {/* Summary bar */}
          <Card>
            <CardBody className="py-3.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700">Overall Progress</span>
                <span className="text-sm font-bold text-slate-800">{pct}% — {completedCount}/{totalLessons} lessons</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </CardBody>
          </Card>

          {/* Week-by-week accordion */}
          {weeks.length === 0 ? (
            <EmptyState icon={<BookOpen size={40} />} title="No lessons found" description="Run pnpm db:seed:noorani-qaida to seed the curriculum." />
          ) : (
            <div className="flex flex-col gap-3">
              {weeks.map(week => {
                const weekLessons = week.lessons;
                const weekCompleted = weekLessons.filter(l => completedSet.has(l.id)).length;
                const allDone = weekCompleted === weekLessons.length && weekLessons.length > 0;
                const expanded = !collapsedWeeks.has(week.id);

                return (
                  <Card key={week.id} className={cn(allDone && 'border-emerald-200')}>
                    {/* Week header */}
                    <button
                      type="button"
                      onClick={() => toggleWeek(week.id)}
                      className="w-full text-left px-4 py-3.5 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0',
                          allDone ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600',
                        )}>
                          {allDone ? <CheckCircle2 size={16} /> : week.order}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{week.title}</p>
                          {week.description && (
                            <p className="text-xs text-slate-400 truncate">{week.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={cn(
                          'text-xs font-medium px-2 py-0.5 rounded-full',
                          allDone ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500',
                        )}>
                          {weekCompleted}/{weekLessons.length}
                        </span>
                        {expanded ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                      </div>
                    </button>

                    {/* Lessons */}
                    {expanded && (
                      <div className="border-t border-slate-100">
                        {weekLessons.map(lesson => {
                          const done = completedSet.has(lesson.id);
                          return (
                            <div
                              key={lesson.id}
                              onClick={() => setActiveLesson(lesson)}
                              className={cn(
                                'flex items-center justify-between px-4 py-3 border-b border-slate-50 last:border-0 cursor-pointer',
                                done ? 'bg-emerald-50/40 hover:bg-emerald-50/70' : 'hover:bg-slate-50',
                              )}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={cn(
                                  'w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold',
                                  done ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500',
                                )}>
                                  {done ? <CheckCircle2 size={13} /> : lesson.order}
                                </div>
                                <p className={cn(
                                  'text-sm font-medium truncate',
                                  done ? 'text-emerald-700' : 'text-slate-700',
                                )}>
                                  {lesson.title}
                                </p>
                              </div>

                              {isStaff && (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); markMutation.mutate({ lessonId: lesson.id, complete: !done }); }}
                                  disabled={markMutation.isPending}
                                  className={cn(
                                    'text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors shrink-0 ml-3',
                                    done
                                      ? 'border-emerald-200 text-emerald-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600'
                                      : 'border-slate-200 text-slate-500 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700',
                                  )}
                                >
                                  {done ? 'Mark incomplete' : 'Mark complete'}
                                </button>
                              )}

                              {isStudent && done && (
                                <span className="text-xs text-emerald-600 font-medium shrink-0 ml-3 flex items-center gap-1">
                                  <CheckCircle2 size={12} /> Done
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
    </>
  );
}
