import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Clock, Users, User, Video, ExternalLink, X, CalendarDays, Upload } from 'lucide-react';
import { api } from '../../lib/api';
import { Badge, Spinner } from '../../components/ui';
import { fullName } from '../../lib/utils';
import type { Session } from '../../types';
import { toast } from 'sonner';

// ─── Date helpers ─────────────────────────────────────────────

function toLocalDateKey(dateStr: string): string {
  const d = new Date(dateStr);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
}

function todayKey(): string {
  return toLocalDateKey(new Date().toISOString());
}

function formatLocalTime(dateStr: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  }).format(new Date(dateStr));
}

// ─── Status colours ───────────────────────────────────────────

const statusVariant: Record<string, 'info' | 'success' | 'default' | 'danger'> = {
  SCHEDULED: 'info', LIVE: 'success', COMPLETED: 'default', CANCELLED: 'danger',
};

/** True once a session's end time (scheduledAt + durationMinutes) is in the past. */
function hasEnded(s: Session): boolean {
  return new Date(s.scheduledAt).getTime() + s.durationMinutes * 60_000 < Date.now();
}

/** Frontend-only display status: ended SCHEDULED/LIVE sessions show as COMPLETED. */
function displayStatus(s: Session): string {
  if (s.status === 'CANCELLED' || s.status === 'COMPLETED') return s.status;
  return hasEnded(s) ? 'COMPLETED' : s.status;
}

const statusChipBg: Record<string, string> = {
  SCHEDULED: 'bg-blue-500',
  LIVE:      'bg-green-500',
  COMPLETED: 'bg-slate-400',
  CANCELLED: 'bg-red-300',
};

// ─── Session detail card ──────────────────────────────────────

interface SessionCardProps {
  session: Session;
  onUploadRecording: (sessionId: string, file: File) => void;
  uploadingId: string | null;
  uploadProgress: number;
  onDeleteRecording: (sessionId: string) => void;
}

function SessionCard({ session, onUploadRecording, uploadingId, uploadProgress, onDeleteRecording }: SessionCardProps) {
  const effective    = displayStatus(session);
  const isCancelled  = session.status === 'CANCELLED';
  const isActive     = effective === 'SCHEDULED' || effective === 'LIVE';
  const isCompleted  = effective === 'COMPLETED';
  const subjectColor = session.subject?.color ?? '#6366f1';
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={`flex gap-3 p-3 rounded-xl border bg-white transition-shadow hover:shadow-sm ${isCancelled ? 'opacity-60' : ''}`}>
      <div className="w-1 rounded-full shrink-0" style={{ backgroundColor: isCancelled ? '#cbd5e1' : subjectColor }} />

      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <p className={`font-semibold text-sm truncate ${isCancelled ? 'line-through text-slate-400' : 'text-slate-800'}`}>
            {session.title}
          </p>
          <Badge variant={statusVariant[effective] ?? 'default'}>{effective}</Badge>
        </div>

        {session.subject && (
          <p className="text-xs text-slate-500">{session.subject.title}</p>
        )}

        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Clock size={11} />
            {formatLocalTime(session.scheduledAt)} · {session.durationMinutes} min
          </span>
          {session.group ? (
            <span className="flex items-center gap-1"><Users size={11} />{session.group.name}</span>
          ) : session.student ? (
            <span className="flex items-center gap-1"><User size={11} />{fullName(session.student)}</span>
          ) : null}
        </div>

        {isActive && !isCancelled && session.zoomJoinUrl && (
          <div className="flex gap-2 pt-1">
            {session.zoomStartUrl && (
              <a
                href={session.zoomStartUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
              >
                <Video size={11} />
                {session.status === 'LIVE' ? 'Join Live' : 'Start'}
              </a>
            )}
            <a
              href={session.zoomJoinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <ExternalLink size={11} />
              Student link
            </a>
          </div>
        )}

        {/* Recording upload — completed sessions only */}
        {isCompleted && !isCancelled && (
          <div className="border-t border-slate-100 pt-2 mt-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUploadRecording(session.id, file);
                e.target.value = '';
              }}
            />
            {uploadingId === session.id ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Uploading…</span><span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div className="bg-brand-500 h-1.5 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            ) : session.recordingUrl ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-green-600 font-medium flex-1">Recording uploaded</span>
                <button
                  onClick={() => { if (confirm('Delete this recording?')) onDeleteRecording(session.id); }}
                  className="text-slate-400 hover:text-red-500 transition-colors"
                  title="Delete recording"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 text-xs text-brand-600 border border-dashed border-brand-300 px-3 py-2 rounded-lg hover:bg-brand-50 transition-colors"
              >
                <Upload size={13} />
                Upload Recording (MP4, max 1 GB)
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Day cell ─────────────────────────────────────────────────

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MAX_CHIPS = 3;

interface DayCellProps {
  dateKey: string;
  inMonth: boolean;
  sessions: Session[];
  selected: boolean;
  onClick: () => void;
}

function DayCell({ dateKey, inMonth, sessions, selected, onClick }: DayCellProps) {
  const today  = todayKey();
  const isToday = dateKey === today;
  const dayNum  = Number(dateKey.split('-')[2]);
  const visible = sessions.slice(0, MAX_CHIPS);
  const overflow = sessions.length - MAX_CHIPS;

  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col min-h-[90px] p-1.5 text-left rounded-lg border transition-all focus:outline-none
        ${!inMonth ? 'bg-slate-50/50 border-transparent' : selected ? 'border-brand-400 bg-brand-50 shadow-sm' : 'border-slate-100 bg-white hover:border-slate-300 hover:shadow-sm'}
      `}
    >
      {/* Day number */}
      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold mb-1 shrink-0
        ${isToday ? 'bg-brand-500 text-white' : inMonth ? 'text-slate-700' : 'text-slate-300'}
      `}>
        {dayNum}
      </span>

      {/* Session chips */}
      <div className="space-y-0.5 w-full">
        {visible.map((s) => (
          <div
            key={s.id}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-white text-[10px] font-medium truncate ${statusChipBg[displayStatus(s)] ?? 'bg-slate-400'}`}
          >
            <span className="truncate">{s.title}</span>
          </div>
        ))}
        {overflow > 0 && (
          <p className="text-[10px] text-slate-400 font-medium pl-1">+{overflow} more</p>
        )}
      </div>
    </button>
  );
}

// ─── Main calendar ────────────────────────────────────────────

export default function TeacherCalendar() {
  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed
  const [selectedKey, setSelectedKey] = useState<string | null>(todayKey());
  const [uploadingId, setUploadingId]       = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const qc = useQueryClient();

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => api.get<{ data: Session[] }>('/sessions').then((r) => r.data.data),
  });

  const deleteRecordingMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/sessions/${id}/recording`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sessions'] }); toast.success('Recording deleted'); },
    onError: () => toast.error('Failed to delete recording'),
  });

  async function handleUpload(sessionId: string, file: File) {
    setUploadingId(sessionId);
    setUploadProgress(0);
    const form = new FormData();
    form.append('recording', file);
    try {
      await api.post(`/sessions/${sessionId}/recording`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) setUploadProgress(Math.round((e.loaded / e.total) * 100));
        },
      });
      qc.invalidateQueries({ queryKey: ['sessions'] });
      toast.success('Recording uploaded');
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploadingId(null);
      setUploadProgress(0);
    }
  }

  // Group sessions by local date key
  const byDate: Record<string, Session[]> = {};
  for (const s of sessions) {
    const k = toLocalDateKey(s.scheduledAt);
    (byDate[k] ??= []).push(s);
  }
  // Sort within each day
  for (const arr of Object.values(byDate)) {
    arr.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  }

  // Build the 6-week grid for this month
  function buildGrid() {
    const firstOfMonth = new Date(year, month, 1);
    const startOffset  = firstOfMonth.getDay(); // 0=Sun
    const daysInMonth  = new Date(year, month + 1, 0).getDate();
    const prevDays     = new Date(year, month, 0).getDate();

    const cells: { dateKey: string; inMonth: boolean }[] = [];

    // Trailing days from prev month
    for (let i = startOffset - 1; i >= 0; i--) {
      const d    = prevDays - i;
      const m    = month === 0 ? 12 : month;
      const y    = month === 0 ? year - 1 : year;
      cells.push({ dateKey: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, inMonth: false });
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ dateKey: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`, inMonth: true });
    }

    // Leading days from next month
    const remainder = 42 - cells.length;
    for (let d = 1; d <= remainder; d++) {
      const m = month === 11 ? 1 : month + 2;
      const y = month === 11 ? year + 1 : year;
      cells.push({ dateKey: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`, inMonth: false });
    }

    return cells;
  }

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }
  function goToday() {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setSelectedKey(todayKey());
  }

  const monthLabel = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(new Date(year, month));
  const grid = buildGrid();
  const selectedSessions = selectedKey ? (byDate[selectedKey] ?? []) : [];
  const selectedLabel = selectedKey
    ? new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(
        new Date(Number(selectedKey.split('-')[0]), Number(selectedKey.split('-')[1]) - 1, Number(selectedKey.split('-')[2]), 12)
      )
    : '';

  return (
    <div className="flex gap-4 min-h-[600px]">
      {/* ── Calendar grid ────────────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-3">
        {/* Month navigation */}
        <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm">
          <div className="flex items-center gap-1">
            <button onClick={prevMonth} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
              <ChevronLeft size={16} />
            </button>
            <button onClick={nextMonth} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>

          <h2 className="text-base font-semibold text-slate-800">{monthLabel}</h2>

          <button
            onClick={goToday}
            className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Today
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Spinner className="w-8 h-8" /></div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 border-b border-slate-100">
              {WEEKDAYS.map((w) => (
                <div key={w} className="py-2 text-center text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  {w}
                </div>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 gap-px bg-slate-100">
              {grid.map(({ dateKey, inMonth }) => (
                <DayCell
                  key={dateKey}
                  dateKey={dateKey}
                  inMonth={inMonth}
                  sessions={byDate[dateKey] ?? []}
                  selected={selectedKey === dateKey}
                  onClick={() => setSelectedKey(prev => prev === dateKey ? null : dateKey)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Day panel ─────────────────────────────────────────── */}
      <div className={`shrink-0 transition-all duration-200 ${selectedKey ? 'w-80 opacity-100' : 'w-0 opacity-0 overflow-hidden'}`}>
        {selectedKey && (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm h-full flex flex-col">
            {/* Panel header */}
            <div className="flex items-start justify-between p-4 border-b border-slate-100">
              <div>
                <p className="font-semibold text-slate-800 text-sm">{selectedLabel}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedSessions.length === 0
                    ? 'No sessions'
                    : `${selectedSessions.length} session${selectedSessions.length !== 1 ? 's' : ''}`}
                </p>
              </div>
              <button
                onClick={() => setSelectedKey(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {/* Session list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {selectedSessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-12 text-center gap-3">
                  <CalendarDays size={32} className="text-slate-200" />
                  <p className="text-sm text-slate-400">No sessions on this day</p>
                </div>
              ) : (
                selectedSessions.map((s) => (
                  <SessionCard
                    key={s.id}
                    session={s}
                    onUploadRecording={handleUpload}
                    uploadingId={uploadingId}
                    uploadProgress={uploadProgress}
                    onDeleteRecording={(id) => deleteRecordingMutation.mutate(id)}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
