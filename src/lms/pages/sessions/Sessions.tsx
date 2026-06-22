import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Video, Trash2, Calendar, CalendarDays, LayoutList, Clock, ExternalLink, Edit2, Users, Link, User, CheckCircle2, Upload, Download, X, ChevronLeft, ChevronRight, Chrome, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import {
  Button, Card, CardBody, Badge, Modal, Input, Textarea, Select, Spinner, EmptyState,
} from '../../components/ui';
import { formatDateTimeTz, fullName } from '../../lib/utils';
import type { Session, Subject, User as UserType } from '../../types';
import { toast } from 'sonner';
import TeacherCalendar from '../calendar/TeacherCalendar';

interface SessionFormData {
  title: string;
  description: string;
  subjectId: string;
  hostId: string;          // teacher's userId — auto-set from subject for admin
  studentId: string;
  scheduledAt: string;
  durationMinutes: string;
  zoomJoinUrl: string;
  isRecurring: boolean;
  recurringDays: number[];  // 0=Sun, 1=Mon … 6=Sat
  recurringUntil: string;
}

const defaultForm: SessionFormData = {
  title: '', description: '', subjectId: '', hostId: '',
  studentId: '', scheduledAt: '', durationMinutes: '60', zoomJoinUrl: '',
  isRecurring: false, recurringDays: [], recurringUntil: '',
};

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const statusVariant: Record<string, 'info' | 'success' | 'default' | 'danger'> = {
  SCHEDULED: 'info', LIVE: 'success', COMPLETED: 'default', CANCELLED: 'danger',
};

/** True once a session's end time (scheduledAt + durationMinutes) is in the past. */
function hasEnded(s: Session): boolean {
  const end = new Date(s.scheduledAt).getTime() + s.durationMinutes * 60_000;
  return end < Date.now();
}

/**
 * Status to DISPLAY (frontend-only; the stored status is never changed).
 * A SCHEDULED/LIVE session whose end time has passed shows as COMPLETED.
 * CANCELLED and already-COMPLETED sessions are shown as-is.
 */
function displayStatus(s: Session): string {
  if (s.status === 'CANCELLED' || s.status === 'COMPLETED') return s.status;
  return hasEnded(s) ? 'COMPLETED' : s.status;
}

// ── Time slots every 30 min from 6:00 AM to 10:30 PM ─────────
const TIME_SLOTS: { value: string; label: string }[] = [];
for (let h = 6; h <= 22; h++) {
  for (const m of [0, 30]) {
    if (h === 22 && m === 30) break;
    const hh  = String(h).padStart(2, '0');
    const mm  = String(m).padStart(2, '0');
    const period = h < 12 ? 'AM' : 'PM';
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    TIME_SLOTS.push({ value: `${hh}:${mm}`, label: `${h12}:${mm} ${period}` });
  }
}

function DateTimePicker({
  value,
  onChange,
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  const datePart = value.slice(0, 10);  // "YYYY-MM-DD"
  const timePart = value.slice(11, 16); // "HH:mm"

  function update(d: string, t: string) {
    if (d && t) onChange(`${d}T${t}`);
    else if (d) onChange(`${d}T${timePart || '09:00'}`);
  }

  return (
    <div>
      <label htmlFor="session-date" className="block text-sm font-medium text-slate-700 mb-1">Date &amp; Time</label>
      <div className="grid grid-cols-2 gap-2">
        {/* Date */}
        <div className="relative">
          <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            id="session-date"
            type="date"
            value={datePart}
            onChange={(e) => update(e.target.value, timePart)}
            required={required}
            min={new Date().toISOString().slice(0, 10)}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-brand-300 focus:border-brand-500 [color-scheme:light]"
          />
        </div>

        {/* Time */}
        <div className="relative">
          <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
          <select
            value={timePart || '09:00'}
            onChange={(e) => update(datePart, e.target.value)}
            required={required}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-brand-300 focus:border-brand-500 bg-white appearance-none"
          >
            {!timePart && <option value="">Select time…</option>}
            {TIME_SLOTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

export default function Sessions() {
  const { user, accessToken } = useAuthStore();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<SessionFormData>(defaultForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [uploadingRecording, setUploadingRecording] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadingForSession = useRef<string | null>(null);
  const [listYear, setListYear] = useState(() => new Date().getFullYear());
  const [listMonth, setListMonth] = useState(() => new Date().getMonth()); // 0-indexed
  const isAdmin = user?.role === 'ADMIN';
  const isTeacher = user?.role === 'TEACHER';
  const isStaff = isAdmin || isTeacher;

  // ── Static data ───────────────────────────────────────────────
  const { data: allSessions = [], isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => api.get<{ data: Session[] }>('/sessions').then((r) => r.data.data),
  });

  // List view: show sessions in the selected month only.
  // Staff see all statuses; students only see sessions with a recording (past) or upcoming.
  const monthStart = new Date(listYear, listMonth, 1).getTime();
  const monthEnd   = new Date(listYear, listMonth + 1, 0, 23, 59, 59, 999).getTime();
  const sessions = allSessions
    .filter((s) => {
      const t = new Date(s.scheduledAt).getTime();
      if (t < monthStart || t > monthEnd) return false;
      if (isStaff) return true;
      // Students: show upcoming + completed-with-recording
      const isPast = t < Date.now();
      return !isPast || !!s.recordingUrl;
    })
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  const monthLabel = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(new Date(listYear, listMonth));
  const isCurrentMonth = listYear === new Date().getFullYear() && listMonth === new Date().getMonth();

  function prevListMonth() {
    if (listMonth === 0) { setListMonth(11); setListYear(y => y - 1); }
    else setListMonth(m => m - 1);
  }
  function nextListMonth() {
    if (listMonth === 11) { setListMonth(0); setListYear(y => y + 1); }
    else setListMonth(m => m + 1);
  }

  // All students (for student picker — staff only)
  const { data: allStudents = [] } = useQuery({
    queryKey: ['students-for-session'],
    queryFn: () => api.get<{ data: UserType[] }>('/users?role=STUDENT').then(r => r.data.data),
    enabled: isStaff,
  });

  // Subjects the selected student is enrolled in (fetched after student is picked)
  const { data: studentSubjects = [], isFetching: loadingSubjects } = useQuery({
    queryKey: ['student-subjects-session', form.studentId],
    queryFn: () =>
      api.get<{ data: Subject[] }>(`/users/${form.studentId}/subjects`).then(r => r.data.data),
    enabled: !!form.studentId && showModal,
  });

  // Public settings — to check active meeting provider
  const { data: publicSettings } = useQuery({
    queryKey: ['settings-public'],
    queryFn: () => api.get<{ data: Record<string, string> }>('/settings/public').then((r) => r.data.data),
  });
  const isGoogleMeet = publicSettings?.meeting_provider === 'google_meet';
  const isDailyCo = publicSettings?.meeting_provider === 'daily_co';
  const recordingUploadEnabled = publicSettings?.recording_upload_enabled === 'true';

  // Google Calendar connection status (staff only, when Google Meet is enabled)
  const { data: googleStatus, refetch: refetchGoogleStatus } = useQuery({
    queryKey: ['google-status'],
    queryFn: () => api.get<{ data: { configured: boolean; connected: boolean } }>('/google/status').then((r) => r.data.data),
    enabled: isStaff && isGoogleMeet,
  });

  const disconnectGoogleMutation = useMutation({
    mutationFn: () => api.delete('/google/disconnect'),
    onSuccess: () => { refetchGoogleStatus(); toast.success('Google Calendar disconnected'); },
    onError: () => toast.error('Failed to disconnect'),
  });

  function connectGoogleCalendar() {
    const base = import.meta.env.DEV ? 'http://localhost:4000' : '';
    const nonce = Math.random().toString(36).slice(2) + Date.now().toString(36);
    window.open(`${base}/api/google/auth?_nonce=${nonce}`, 'google_oauth', 'width=600,height=700');

    let attempts = 0;
    const timer = setInterval(async () => {
      attempts++;
      if (attempts > 180) { clearInterval(timer); return; }
      try {
        const r = await api.get<{ data: { connected: boolean } }>(`/google/poll?nonce=${nonce}`);
        if (r.data.data.connected) {
          clearInterval(timer);
          refetchGoogleStatus();
          toast.success('Google Calendar connected!');
        }
      } catch { /* keep polling */ }
    }, 1000);
  }

  // ── Derived: teachers for the selected subject ───────────────
  // studentSubjects comes from /users/:id/subjects — no teachers field there,
  // so we derive teachers from the full subjects list only if admin needs picker.
  // For teacher role, hostId is always themselves — no need for teacher list.
  const selectedSubject = studentSubjects.find((s) => s.id === form.subjectId) ?? null;
  const subjectTeachers = (selectedSubject as Subject | null)?.teachers?.map((st) => st.teacher) ?? [];

  // ── Mutations ─────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data: SessionFormData) =>
      api.post('/sessions', {
        title: data.title,
        description: data.description || undefined,
        subjectId: data.subjectId || undefined,
        hostId: data.hostId || undefined,
        studentId: data.studentId || undefined,
        scheduledAt: new Date(data.scheduledAt).toISOString(),
        durationMinutes: Number(data.durationMinutes),
        zoomJoinUrl: data.zoomJoinUrl || undefined,
        recurringDays: data.isRecurring && data.recurringDays.length > 0 ? data.recurringDays : undefined,
        recurringUntil: data.isRecurring && data.recurringUntil ? new Date(data.recurringUntil).toISOString() : undefined,
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['sessions'] });
      setShowModal(false);
      setForm(defaultForm);
      const count = res.data?.data?.count;
      toast.success(count ? `${count} sessions created!` : 'Session created!');
    },
    onError: () => toast.error('Failed to create session'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: SessionFormData }) =>
      api.put(`/sessions/${id}`, {
        title: data.title,
        description: data.description || undefined,
        subjectId: data.subjectId || undefined,
        studentId: data.studentId || undefined,
        scheduledAt: new Date(data.scheduledAt).toISOString(),
        durationMinutes: Number(data.durationMinutes),
        zoomJoinUrl: data.zoomJoinUrl || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] });
      setShowModal(false);
      setEditId(null);
      setForm(defaultForm);
      toast.success('Session updated');
    },
    onError: () => toast.error('Failed to update session'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/sessions/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sessions'] }); toast.success('Session cancelled'); },
    onError: () => toast.error('Failed to delete session'),
  });

  const deleteRecordingMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/sessions/${id}/recording`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sessions'] }); toast.success('Recording deleted'); },
    onError: () => toast.error('Failed to delete recording'),
  });

  async function handleRecordingUpload(sessionId: string, file: File) {
    setUploadingRecording(sessionId);
    setUploadProgress(0);
    try {
      // Step 1: get presigned PUT URL from server
      const { data: { data: { uploadUrl, key } } } = await api.get(`/sessions/${sessionId}/recording/upload-url`);

      // Step 2: PUT directly to R2 (bypasses Cloudflare 100 MB limit)
      // XHR instead of fetch to get upload progress events
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', 'video/mp4');
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`R2 upload failed: ${xhr.status}`)));
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.onabort = () => reject(new Error('Upload aborted'));
        xhr.send(file);
      });

      // Step 3: confirm with server so it saves the key to DB
      await api.post(`/sessions/${sessionId}/recording/confirm`, { key });
      qc.invalidateQueries({ queryKey: ['sessions'] });
      toast.success('Recording uploaded');
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploadingRecording(null);
      setUploadProgress(0);
      uploadingForSession.current = null;
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  // ── Handlers ──────────────────────────────────────────────────
  function openCreate() {
    setEditId(null);
    setForm({
      ...defaultForm,
      // Teacher: pre-fill hostId with themselves
      hostId: isTeacher ? (user?.id ?? '') : '',
    });
    setShowModal(true);
  }

  function openEdit(s: Session) {
    setEditId(s.id);
    setForm({
      title: s.title,
      description: s.description ?? '',
      subjectId: s.subjectId ?? '',
      hostId: s.hostId ?? '',
      studentId: s.student?.id ?? '',
      scheduledAt: new Date(s.scheduledAt).toISOString().slice(0, 16),
      durationMinutes: String(s.durationMinutes),
      zoomJoinUrl: s.zoomJoinUrl ?? '',
      isRecurring: false,
      recurringDays: [],
      recurringUntil: '',
    });
    setShowModal(true);
  }

  // When student changes: reset subject (since subjects depend on student)
  function handleStudentChange(studentId: string) {
    setForm((f) => ({ ...f, studentId, subjectId: '', hostId: isAdmin ? '' : f.hostId }));
  }

  // When subject changes: for teacher role hostId is always themselves
  function handleSubjectChange(subjectId: string) {
    setForm((f) => ({ ...f, subjectId, hostId: isAdmin ? '' : f.hostId }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.studentId) { toast.error('Please select a student'); return; }
    if (!form.subjectId) { toast.error('Please select a course'); return; }
    if (editId) updateMutation.mutate({ id: editId, data: form });
    else createMutation.mutate(form);
  }

  function getZoomUrl(s: Session): string | null {
    if (!s.zoomJoinUrl) return null;
    return isStaff && s.zoomStartUrl ? s.zoomStartUrl : s.zoomJoinUrl;
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Hidden file input — shared across all session cards */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          const sessionId = uploadingForSession.current;
          if (file && sessionId) handleRecordingUpload(sessionId, file);
        }}
      />
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sessions</h1>
          <p className="text-slate-500 text-sm mt-1">{isGoogleMeet ? 'Google Meet-powered live learning sessions' : 'Zoom-powered live learning sessions'}</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* View toggle — staff only */}
          {isStaff && (
            <div className="flex items-center rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm">
              <button
                onClick={() => setView('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${
                  view === 'list'
                    ? 'bg-brand-500 text-white'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                <LayoutList size={14} />
                List
              </button>
              <button
                onClick={() => setView('calendar')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors border-l border-slate-200 ${
                  view === 'calendar'
                    ? 'bg-brand-500 text-white border-brand-500'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                <CalendarDays size={14} />
                Calendar View
              </button>
            </div>
          )}

          {/* Connect Google Calendar — staff only when Google Meet is active */}
          {isStaff && isGoogleMeet && (
            googleStatus?.connected ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500 text-white text-sm font-medium">
                  <Chrome size={14} />
                  Google Calendar Connected
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => disconnectGoogleMutation.mutate()}
                  loading={disconnectGoogleMutation.isPending}
                >
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button variant="secondary" size="sm" icon={<Chrome size={14} />} onClick={connectGoogleCalendar}>
                Connect Google Calendar
              </Button>
            )
          )}

          {isStaff && (
            <Button onClick={openCreate} icon={<Plus size={16} />}>New Session</Button>
          )}
        </div>
      </div>

      {/* Calendar view */}
      {view === 'calendar' && isStaff && (
        <TeacherCalendar />
      )}

      {/* List view */}
      {view === 'list' && (
        <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm">
          <button onClick={prevListMonth} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <h2 className="text-base font-semibold text-slate-800">{monthLabel}</h2>
          <div className="flex items-center gap-1">
            {!isCurrentMonth && (
              <button
                onClick={() => { setListYear(new Date().getFullYear()); setListMonth(new Date().getMonth()); }}
                className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors mr-1"
              >
                Today
              </button>
            )}
            <button onClick={nextListMonth} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
      {view === 'list' && isLoading ? (
        <div className="flex justify-center py-16"><Spinner className="w-10 h-10" /></div>
      ) : view === 'list' && sessions.length === 0 ? (
        <EmptyState
          icon={<Calendar size={40} />}
          title={`No sessions in ${monthLabel}`}
          description={isStaff ? 'Try another month or create a new session.' : 'No sessions scheduled for this month.'}
          action={isStaff ? <Button onClick={openCreate} icon={<Plus size={16} />}>Create Session</Button> : undefined}
        />
      ) : view === 'list' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sessions.map((s) => {
            const zoomUrl = getZoomUrl(s);
            return (
              <Card key={s.id} className="flex flex-col">
                <CardBody className="flex-1 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-slate-800 text-sm leading-tight">{s.title}</h3>
                    <Badge variant={statusVariant[displayStatus(s)] ?? 'default'}>{displayStatus(s)}</Badge>
                  </div>

                  {s.subject && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: s.subject.color }} />
                      <span className="text-xs text-slate-500 truncate">{s.subject.title}</span>
                    </div>
                  )}

                  {s.group && (
                    <div className="flex items-center gap-1.5">
                      <Users size={12} className="text-slate-400 shrink-0" />
                      <span className="text-xs text-slate-500 truncate">{s.group.name}</span>
                    </div>
                  )}
                  {!s.group && s.student && (
                    <div className="flex items-center gap-1.5">
                      <User size={12} className="text-slate-400 shrink-0" />
                      <span className="text-xs text-slate-500 truncate">1-on-1 · {fullName(s.student)}</span>
                    </div>
                  )}

                  {isStaff && !s.group && s.student && s.subjectId && (
                    <button
                      onClick={() => navigate(`/lms/subjects/${s.subjectId}?student=${s.student!.id}`)}
                      className="flex items-center gap-1.5 w-full text-left group"
                    >
                      <BookOpen size={12} className="text-brand-400 shrink-0" />
                      <span className="text-xs text-brand-600 group-hover:text-brand-700 group-hover:underline truncate">
                        Continue with {s.student.firstName}
                      </span>
                    </button>
                  )}

                  <div className="space-y-1 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={12} /> {formatDateTimeTz(s.scheduledAt)}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock size={12} /> {s.durationMinutes} minutes
                    </div>
                    {s.host && (
                      <div className="flex items-center gap-1.5">
                        <Video size={12} /> {fullName(s.host)}
                      </div>
                    )}
                  </div>

                  {displayStatus(s) === 'COMPLETED' ? (
                    <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 px-3 py-2 rounded-lg justify-center">
                      <CheckCircle2 size={13} />
                      Session ended
                    </div>
                  ) : zoomUrl ? (
                    <a
                      href={zoomUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={`flex items-center gap-2 text-xs text-white px-3 py-2 rounded-lg transition-colors justify-center font-medium ${
                        isGoogleMeet ? 'bg-green-600 hover:bg-green-700'
                        : isDailyCo ? 'bg-red-600 hover:bg-red-700'
                        : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      {isGoogleMeet ? <Chrome size={14} /> : <Video size={14} />}
                      {isGoogleMeet
                        ? (isStaff ? 'Start in Google Meet' : 'Join in Google Meet')
                        : isDailyCo
                          ? (isStaff ? 'Start Daily.co Call' : 'Join Daily.co Call')
                          : (isStaff ? 'Start in Zoom' : 'Join in Zoom')}
                      <ExternalLink size={12} />
                    </a>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 px-3 py-2 rounded-lg justify-center">
                      <Link size={13} />
                      {isGoogleMeet ? 'No Meet link yet' : isDailyCo ? 'No Daily.co room yet' : 'No Zoom link yet'}
                    </div>
                  )}

                  {s.zoomPassword && (
                    <p className="text-xs text-slate-400 text-center">
                      Password: <span className="font-mono">{s.zoomPassword}</span>
                    </p>
                  )}

                  {/* ── Recording section ── */}
                  {/* Teacher/Admin: upload button or progress or delete */}
                  {isStaff && displayStatus(s) === 'COMPLETED' && (recordingUploadEnabled || s.recordingUrl) && (
                    <div className="border-t border-slate-100 pt-3">
                      {uploadingRecording === s.id ? (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>Uploading…</span>
                            <span>{uploadProgress}%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5">
                            <div
                              className="bg-brand-500 h-1.5 rounded-full transition-all"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                        </div>
                      ) : s.recordingUrl ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-green-600 font-medium flex-1">Recording uploaded</span>
                          <button
                            onClick={() => {
                              if (confirm('Delete this recording?')) deleteRecordingMutation.mutate(s.id);
                            }}
                            className="text-slate-400 hover:text-red-500 transition-colors"
                            title="Delete recording"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : recordingUploadEnabled ? (
                        <button
                          onClick={() => {
                            uploadingForSession.current = s.id;
                            fileInputRef.current?.click();
                          }}
                          className="w-full flex items-center justify-center gap-2 text-xs text-brand-600 border border-dashed border-brand-300 px-3 py-2 rounded-lg hover:bg-brand-50 transition-colors"
                        >
                          <Upload size={13} />
                          Upload Recording (MP4, max 1 GB)
                        </button>
                      ) : null}
                    </div>
                  )}

                  {/* Student: download link when recording is available */}
                  {!isStaff && s.recordingUrl && (
                    <a
                      href={`/api/sessions/${s.id}/recording/download?token=${encodeURIComponent(accessToken ?? '')}`}
                      download
                      className="flex items-center gap-2 text-xs bg-slate-700 text-white px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors justify-center font-medium"
                    >
                      <Download size={14} />
                      Download Recording
                    </a>
                  )}
                </CardBody>

                {isStaff && (
                  <div className="flex gap-2 px-4 pb-4">
                    <Button variant="outline" size="sm" icon={<Edit2 size={14} />} onClick={() => openEdit(s)} className="flex-1">Edit</Button>
                    <Button
                      variant="danger"
                      size="sm"
                      icon={<Trash2 size={14} />}
                      loading={deleting === s.id}
                      onClick={async () => {
                        setDeleting(s.id);
                        try { await deleteMutation.mutateAsync(s.id); } finally { setDeleting(null); }
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      ) : null}

      {/* ── Create / Edit Modal ───────────────────────────────── */}
      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); setEditId(null); setForm(defaultForm); }}
        title={editId ? 'Edit Session' : isGoogleMeet ? 'New Google Meet Session' : isDailyCo ? 'New Daily.co Session' : 'New Zoom Session'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Warn teacher if Google Meet is active but they haven't connected */}
          {isGoogleMeet && isStaff && !googleStatus?.connected && !editId && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-sm text-amber-800">
              <Chrome size={14} className="mt-0.5 shrink-0" />
              <span>Google Calendar not connected. <button type="button" className="underline font-medium" onClick={connectGoogleCalendar}>Connect now</button> to auto-generate a Meet link.</span>
            </div>
          )}
          <Input
            label="Session Title"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            required
            placeholder="e.g. Week 3 Live Class"
          />
          <Textarea
            label="Description (optional)"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={2}
          />

          {/* Step 1 — Student */}
          <div>
            <label className="text-sm font-medium text-slate-700 block mb-1">Student</label>
            <select
              value={form.studentId}
              onChange={(e) => handleStudentChange(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-300 bg-white"
              required
            >
              <option value="">Select student…</option>
              {allStudents.map((s) => (
                <option key={s.id} value={s.id}>{fullName(s)}</option>
              ))}
            </select>
          </div>

          {/* Step 2 — Course (filtered to student's enrollments) */}
          {form.studentId && (
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">
                Course
                {loadingSubjects && <span className="ml-2 text-xs text-slate-400">Loading…</span>}
              </label>
              {!loadingSubjects && studentSubjects.length === 0 ? (
                <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-600">
                  ⚠ This student is not enrolled in any course yet.
                </div>
              ) : (
                <select
                  value={form.subjectId}
                  onChange={(e) => handleSubjectChange(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:ring-2 focus:ring-brand-300 bg-white"
                  required
                >
                  <option value="">Select course…</option>
                  {studentSubjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.title}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Date / Recurring */}
          <DateTimePicker
            value={form.scheduledAt}
            onChange={(v) => setForm((f) => ({ ...f, scheduledAt: v }))}
            required
          />

          {/* Recurring toggle — only for new sessions */}
          {!editId && (
            <div className="space-y-3">
              <label
                className="flex items-center gap-2 cursor-pointer select-none"
                onClick={() => setForm((f) => ({ ...f, isRecurring: !f.isRecurring, recurringDays: [], recurringUntil: '' }))}
              >
                <div className={`relative w-9 h-5 rounded-full transition-colors ${form.isRecurring ? 'bg-brand-600' : 'bg-slate-300'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.isRecurring ? 'translate-x-4' : ''}`} />
                </div>
                <span className="text-sm font-medium text-slate-700">Repeat on specific days</span>
              </label>

              {form.isRecurring && (
                <div className="pl-1 space-y-3">
                  <div className="flex gap-1.5 flex-wrap">
                    {DAY_LABELS.map((label, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setForm((f) => ({
                          ...f,
                          recurringDays: f.recurringDays.includes(idx)
                            ? f.recurringDays.filter((d) => d !== idx)
                            : [...f.recurringDays, idx],
                        }))}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                          form.recurringDays.includes(idx)
                            ? 'bg-brand-600 text-white border-brand-600'
                            : 'bg-white text-slate-600 border-slate-300 hover:border-brand-400'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <Input
                    label="Repeat until"
                    type="date"
                    value={form.recurringUntil}
                    onChange={(e) => setForm((f) => ({ ...f, recurringUntil: e.target.value }))}
                    required={form.isRecurring}
                  />
                  {form.recurringDays.length > 0 && form.recurringUntil && form.scheduledAt && (() => {
                    const days: string[] = [];
                    const until = new Date(form.recurringUntil);
                    until.setHours(23, 59, 59, 999);
                    const cursor = new Date(form.scheduledAt);
                    while (cursor <= until && days.length <= 100) {
                      if (form.recurringDays.includes(cursor.getDay())) days.push('x');
                      cursor.setDate(cursor.getDate() + 1);
                    }
                    return (
                      <p className="text-xs text-slate-500">
                        {days.length > 100
                          ? '⚠ Too many sessions — shorten the range'
                          : `${days.length} session${days.length !== 1 ? 's' : ''} will be created`}
                      </p>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          <Select
            label="Duration"
            value={form.durationMinutes}
            onChange={(e) => setForm((f) => ({ ...f, durationMinutes: e.target.value }))}
            options={[
              { value: '30', label: '30 minutes' },
              { value: '45', label: '45 minutes' },
              { value: '60', label: '1 hour' },
              { value: '90', label: '1.5 hours' },
              { value: '120', label: '2 hours' },
            ]}
          />
          {!isGoogleMeet && !isDailyCo && (
            <Input
              label="Zoom Meeting URL (optional)"
              type="url"
              value={form.zoomJoinUrl}
              onChange={(e) => setForm((f) => ({ ...f, zoomJoinUrl: e.target.value }))}
              placeholder="https://zoom.us/j/..."
            />
          )}

          <div className={`rounded-lg p-3 text-xs ${
            isGoogleMeet ? 'bg-green-50 border border-green-200 text-green-700'
            : isDailyCo ? 'bg-red-50 border border-red-200 text-red-700'
            : 'bg-blue-50 border border-blue-200 text-blue-700'
          }`}>
            {isGoogleMeet
              ? '📅 A Google Meet link will be auto-generated using your connected Google Calendar.'
              : isDailyCo
                ? '🔴 A Daily.co room will be created automatically. The call will be cloud-recorded and the MP4 will be saved when the session ends.'
                : '🎬 A Zoom link will be auto-generated if the Zoom API is configured, or paste your own link above.'}
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
            <Button
              type="submit"
              loading={createMutation.isPending || updateMutation.isPending}
              className="flex-1"
            >
              {editId ? 'Update Session' : form.isRecurring ? 'Create Recurring Sessions' : isGoogleMeet ? 'Create + Generate Meet Link' : isDailyCo ? 'Create + Generate Daily Room' : 'Create + Generate Zoom Link'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
