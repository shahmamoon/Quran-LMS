import { useState, useEffect, FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, CheckCheck, Trash2, Archive, ArchiveRestore, Send, Users, BookOpen } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import { useNotificationStore } from '../../store/notification.store';
import { Button, Card, Spinner, EmptyState, Modal, Input, Select } from '../../components/ui';
import { formatRelative } from '../../lib/utils';
import { cn } from '../../lib/utils';
import type { Notification } from '../../types';
import { toast } from 'sonner';

// ── Notification type categories ─────────────────────────────
type NotifTab = 'all' | 'session' | 'course' | 'message' | 'payment' | 'system' | 'archived';

const TAB_LABELS: Record<NotifTab, string> = {
  all: 'All',
  session: 'Sessions',
  course: 'Courses',
  message: 'Messages',
  payment: 'Payments',
  system: 'System',
  archived: 'Archived',
};

const TAB_TYPES: Record<NotifTab, string[] | null> = {
  all: null,
  session: ['session_reminder', 'session_scheduled', 'session_started'],
  course: ['lesson_published', 'grade', 'course_enrolled', 'progress'],
  message: ['message', 'message_received'],
  payment: ['payment', 'payment_received', 'subscription'],
  system: ['info', 'success', 'warning', 'error', 'user_joined'],
  archived: null,
};

const TYPE_ICON: Record<string, string> = {
  session_reminder: '📅', session_scheduled: '📅', session_started: '🎥',
  message: '💬', message_received: '💬',
  lesson_published: '📚', grade: '⭐', course_enrolled: '🎓', progress: '📈',
  payment: '💳', payment_received: '💰', subscription: '🔄',
  info: 'ℹ️', success: '✅', warning: '⚠️', error: '❌', user_joined: '👤',
};

// ── Target audience options ───────────────────────────────────
type TargetMode = 'all' | 'role' | 'subject' | 'specific';
const TARGET_LABELS: Record<TargetMode, string> = {
  all: 'Everyone', role: 'By Role', subject: 'By Course', specific: 'Specific User',
};

export default function Notifications() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const { markRead, markAllRead } = useNotificationStore();
  const isAdmin = user?.role === 'ADMIN';

  const [activeTab, setActiveTab] = useState<NotifTab>('all');
  const [showSend, setShowSend] = useState(false);

  // ── Data fetching ─────────────────────────────────────────────
  const queryParams = activeTab === 'archived'
    ? '?archived=true'
    : TAB_TYPES[activeTab]
      ? `?type=${TAB_TYPES[activeTab]!.join(',')}`
      : '';

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', activeTab],
    queryFn: () => api.get<{ data: { notifications: Notification[]; unreadCount: number } }>(`/notifications${queryParams}`).then((r) => r.data.data),
    refetchInterval: 30_000,
  });

  // Auto-mark-all-read on mount: clears the header/sidebar badge immediately (optimistic)
  // and syncs to DB in the background. Visiting the Notifications page = you've seen them.
  useEffect(() => {
    markAllRead();
    api.patch('/notifications/read-all').catch(() => null);
    qc.invalidateQueries({ queryKey: ['notifications'] });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Mutations ─────────────────────────────────────────────────
  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: (_, id) => { markRead(id); qc.invalidateQueries({ queryKey: ['notifications'] }); },
  });

  const markAllMutation = useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => { markAllRead(); qc.invalidateQueries({ queryKey: ['notifications'] }); toast.success('All marked as read'); },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/archive`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/notifications/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const notifications = data?.notifications ?? [];
  const unread = data?.unreadCount ?? 0;

  // ── Send Notification Modal state ─────────────────────────────
  const [targetMode, setTargetMode] = useState<TargetMode>('all');
  const [sendForm, setSendForm] = useState({ title: '', body: '', link: '', type: 'info' });
  const [targetRole, setTargetRole] = useState<'STUDENT' | 'TEACHER' | 'ADMIN'>('STUDENT');
  const [targetSubjectId, setTargetSubjectId] = useState('');
  const [specificUserId, setSpecificUserId] = useState('');
  const [userSearch, setUserSearch] = useState('');

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects-simple'],
    queryFn: () => api.get<{ data: { id: string; title: string }[] }>('/curriculum/subjects').then((r) => r.data.data),
    enabled: showSend && isAdmin,
    staleTime: 60_000,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users-simple', userSearch],
    queryFn: () => api.get<{ data: { id: string; firstName: string; lastName: string; role: string }[] }>(`/users?search=${encodeURIComponent(userSearch)}&limit=30`).then((r) => r.data.data),
    enabled: showSend && isAdmin && targetMode === 'specific',
    staleTime: 30_000,
  });

  const sendMutation = useMutation({
    mutationFn: (payload: object) => api.post('/notifications', payload),
    onSuccess: (res) => {
      const count = (res.data as { data: { created: number } }).data.created;
      toast.success(`Notification sent to ${count} user${count !== 1 ? 's' : ''}`);
      setShowSend(false);
      setSendForm({ title: '', body: '', link: '', type: 'info' });
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: () => toast.error('Failed to send notification'),
  });

  function handleSend(e: FormEvent) {
    e.preventDefault();
    const base = { title: sendForm.title.trim(), body: sendForm.body.trim(), type: sendForm.type, link: sendForm.link.trim() || undefined };
    if (!base.title || !base.body) { toast.error('Title and message are required'); return; }
    if (targetMode === 'all') sendMutation.mutate({ ...base, targetAll: true });
    else if (targetMode === 'role') sendMutation.mutate({ ...base, targetRole });
    else if (targetMode === 'subject') { if (!targetSubjectId) { toast.error('Select a course'); return; } sendMutation.mutate({ ...base, targetSubjectId }); }
    else if (targetMode === 'specific') { if (!specificUserId) { toast.error('Select a user'); return; } sendMutation.mutate({ ...base, userIds: [specificUserId] }); }
  }

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="text-slate-500 text-sm mt-1">{unread > 0 && activeTab !== 'archived' ? `${unread} unread` : 'All caught up!'}</p>
        </div>
        <div className="flex gap-2">
          {unread > 0 && activeTab !== 'archived' && (
            <Button variant="outline" size="sm" icon={<CheckCheck size={16} />} onClick={() => markAllMutation.mutate()} loading={markAllMutation.isPending}>
              Mark all read
            </Button>
          )}
          {isAdmin && (
            <Button size="sm" icon={<Send size={16} />} onClick={() => { setShowSend(true); setTargetMode('all'); setSendForm({ title: '', body: '', link: '', type: 'info' }); }}>
              Send Notification
            </Button>
          )}
        </div>
      </div>

      {/* ── Filter tabs ─────────────────────────────────────────── */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {(Object.keys(TAB_LABELS) as NotifTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
              activeTab === tab
                ? 'bg-brand-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            )}
          >
            {TAB_LABELS[tab]}
            {tab === 'all' && unread > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-brand-400 text-white text-[9px] font-bold">
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── List ───────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner className="w-10 h-10" /></div>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={<Bell size={40} />}
          title={activeTab === 'archived' ? 'No archived notifications' : 'No notifications here'}
          description={activeTab === 'archived' ? 'Archive notifications to tidy up your inbox.' : "You're all caught up!"}
        />
      ) : (
        <Card>
          <ul className="divide-y divide-slate-100">
            {notifications.map((n) => (
              <li key={n.id} className={cn('flex items-start gap-4 px-6 py-4 transition-colors hover:bg-slate-50/50', !n.isRead && activeTab !== 'archived' && 'bg-brand-50/50')}>
                <span className="text-xl shrink-0 mt-0.5 select-none">{TYPE_ICON[n.type] ?? '🔔'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2">
                    <p className={cn('text-sm font-medium flex-1 leading-snug', !n.isRead && activeTab !== 'archived' ? 'text-slate-900' : 'text-slate-700')}>{n.title}</p>
                    {!n.isRead && activeTab !== 'archived' && <div className="w-2 h-2 bg-brand-500 rounded-full mt-1 shrink-0" />}
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5 leading-snug">{n.body}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-xs text-slate-400">{formatRelative(n.createdAt)}</p>
                    {n.link && <a href={n.link} className="text-xs text-brand-500 hover:underline">View →</a>}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0 mt-0.5">
                  {!n.isRead && activeTab !== 'archived' && (
                    <button onClick={() => markReadMutation.mutate(n.id)} className="p-1.5 text-slate-400 hover:text-brand-500 hover:bg-brand-50 rounded-lg transition-colors" title="Mark as read">
                      <Check size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => archiveMutation.mutate(n.id)}
                    className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                    title={n.archivedAt ? 'Unarchive' : 'Archive'}
                  >
                    {n.archivedAt ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                  </button>
                  <button onClick={() => deleteMutation.mutate(n.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* ── Send Notification Modal (Admin only) ─────────────── */}
      {isAdmin && (
        <Modal open={showSend} onClose={() => setShowSend(false)} title="Send Notification">
          <form onSubmit={handleSend} className="space-y-4">
            {/* Target audience selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Audience</label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(TARGET_LABELS) as TargetMode[]).map((m) => {
                  const icons: Record<TargetMode, React.ReactNode> = {
                    all: <Users size={14} />, role: <Users size={14} />,
                    subject: <BookOpen size={14} />, specific: <Users size={14} />,
                  };
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setTargetMode(m)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors',
                        targetMode === m ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-600 border-slate-300 hover:border-brand-400'
                      )}
                    >
                      {icons[m]}{TARGET_LABELS[m]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Conditional sub-selector */}
            {targetMode === 'role' && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Role</label>
                <div className="flex gap-2">
                  {(['STUDENT', 'TEACHER', 'ADMIN'] as const).map((r) => (
                    <button key={r} type="button" onClick={() => setTargetRole(r)}
                      className={cn('flex-1 py-1.5 rounded-lg border text-sm font-medium transition-colors', targetRole === r ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-600 border-slate-300 hover:border-brand-400')}>
                      {r.charAt(0) + r.slice(1).toLowerCase()}s
                    </button>
                  ))}
                </div>
              </div>
            )}

            {targetMode === 'subject' && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Course</label>
                <select
                  value={targetSubjectId}
                  onChange={(e) => setTargetSubjectId(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
                >
                  <option value="">Select a course…</option>
                  {subjects.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
                </select>
              </div>
            )}

            {targetMode === 'specific' && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">User</label>
                <input
                  placeholder="Search by name…"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
                {users.length > 0 && (
                  <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                    {users.map((u) => (
                      <button key={u.id} type="button" onClick={() => setSpecificUserId(u.id)}
                        className={cn('w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-slate-50 transition-colors', specificUserId === u.id && 'bg-brand-50')}>
                        <span className="font-medium">{u.firstName} {u.lastName}</span>
                        <span className="text-xs text-slate-400">{u.role}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Notification content */}
            <hr className="border-slate-200" />
            <Input label="Title" required value={sendForm.title} onChange={(e) => setSendForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Class cancelled today" />
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Message</label>
              <textarea
                required
                rows={3}
                value={sendForm.body}
                onChange={(e) => setSendForm((f) => ({ ...f, body: e.target.value }))}
                placeholder="Type your message…"
                className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Type</label>
                <select value={sendForm.type} onChange={(e) => setSendForm((f) => ({ ...f, type: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300">
                  <option value="info">Info</option>
                  <option value="success">Success</option>
                  <option value="warning">Warning</option>
                  <option value="session_reminder">Session Reminder</option>
                  <option value="lesson_published">Lesson Published</option>
                  <option value="grade">Grade</option>
                </select>
              </div>
              <Input label="Link (optional)" value={sendForm.link} onChange={(e) => setSendForm((f) => ({ ...f, link: e.target.value }))} placeholder="/lms/sessions" />
            </div>

            <div className="flex gap-3 pt-1">
              <Button variant="secondary" type="button" onClick={() => setShowSend(false)} className="flex-1">Cancel</Button>
              <Button type="submit" icon={<Send size={14} />} loading={sendMutation.isPending} className="flex-1">Send</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
