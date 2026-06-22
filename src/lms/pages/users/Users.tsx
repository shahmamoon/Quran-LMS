import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, KeyRound, Eye, EyeOff, RefreshCw, Mail,
  GraduationCap, BookOpen, Users as UsersIcon, Pencil,
  UserCheck, ShieldOff, Archive, Trash2, AlertTriangle,
} from 'lucide-react';

// ── Teacher overview types ────────────────────────────────────
interface TeacherStudent { user: { id: string; firstName: string; lastName: string; avatarUrl: string | null } }
interface TeacherSubject { subject: { id: string; title: string; color: string } }
interface TeacherOverview {
  id: string; firstName: string; lastName: string; email: string;
  avatarUrl: string | null; phone: string | null;
  teachingSubjects: TeacherSubject[];
  assignedStudents: TeacherStudent[];
}

function WhatsAppIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

function waUrl(phone: string) {
  return `https://wa.me/${phone.replace(/\D/g, '')}`;
}

function isOnline(lastSeenAt: string | null | undefined): boolean {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < 5 * 60 * 1000;
}

import { api } from '../../lib/api';
import { Button, Card, CardBody, Badge, Modal, Input, Select, Avatar, Spinner, EmptyState } from '../../components/ui';
import { fullName, formatDate } from '../../lib/utils';
import type { User, UserStatus } from '../../types';
import { useAuthStore } from '../../store/auth.store';
import { toast } from 'sonner';

interface CreateUserForm { firstName: string; lastName: string; email: string; password: string; role: string; phone: string; grade: string }
const defaultCreateForm: CreateUserForm = { firstName: '', lastName: '', email: '', password: '', role: 'STUDENT', phone: '', grade: 'Upskill' };

const GRADE_OPTIONS = [
  { value: 'Upskill', label: 'Upskill (Adult / Professional)' },
  { value: 'Kindergarten', label: 'Kindergarten' },
  ...Array.from({ length: 12 }, (_, i) => ({ value: `Grade ${i + 1}`, label: `Grade ${i + 1}` })),
];

type StatusVariant = 'success' | 'warning' | 'danger' | 'default';

function statusVariant(s: UserStatus): StatusVariant {
  if (s === 'ACTIVE') return 'success';
  if (s === 'SUSPENDED') return 'warning';
  return 'danger';
}

function statusLabel(s: UserStatus) {
  if (s === 'ACTIVE') return 'Active';
  if (s === 'SUSPENDED') return 'Suspended';
  return 'Archived';
}

// ── Confirmation modal ────────────────────────────────────────
interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmLabel: string;
  confirmVariant?: 'danger' | 'warning' | 'primary';
  loading?: boolean;
  onConfirm: () => void;
}

function ConfirmModal({ open, onClose, title, message, confirmLabel, confirmVariant = 'danger', loading, onConfirm }: ConfirmModalProps) {
  const variantClass =
    confirmVariant === 'danger' ? 'bg-red-600 hover:bg-red-700 text-white' :
    confirmVariant === 'warning' ? 'bg-amber-500 hover:bg-amber-600 text-white' :
    'bg-brand-600 hover:bg-brand-700 text-white';

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        <div className="flex gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
          <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">{message}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <button
            disabled={loading}
            onClick={onConfirm}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${variantClass}`}
          >
            {loading ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ── Teachers Overview panel ───────────────────────────────────
function TeachersPanel() {
  const { data: teachers = [], isLoading } = useQuery({
    queryKey: ['teachers-overview'],
    queryFn: () =>
      api.get<{ data: TeacherOverview[] }>('/users/teachers/overview').then((r) => r.data.data),
  });

  if (isLoading) return <div className="flex justify-center py-16"><Spinner className="w-10 h-10" /></div>;
  if (teachers.length === 0) return (
    <EmptyState icon={<GraduationCap size={40} />} title="No teachers yet" description="Create teacher accounts to see them here." />
  );

  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {teachers.map((t) => (
        <Card key={t.id} className="flex flex-col">
          <CardBody className="flex-1 space-y-4">
            <div className="flex items-center gap-3">
              <Avatar src={t.avatarUrl} name={fullName(t)} size="md" />
              <div className="min-w-0">
                <p className="font-semibold text-slate-800 truncate">{fullName(t)}</p>
                <a href={`mailto:${t.email}`} className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline">
                  <Mail size={11} />{t.email}
                </a>
                {t.phone && (
                  <a href={waUrl(t.phone)} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-emerald-600 hover:underline mt-0.5">
                    <WhatsAppIcon size={11} />{t.phone}
                  </a>
                )}
              </div>
            </div>
            <div>
              <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                <BookOpen size={12} />Courses ({t.teachingSubjects.length})
              </p>
              {t.teachingSubjects.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No courses assigned</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {t.teachingSubjects.map(({ subject: s }) => (
                    <span key={s.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white" style={{ background: s.color }}>
                      {s.title}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div>
              <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                <UsersIcon size={12} />Students ({t.assignedStudents.length})
              </p>
              {t.assignedStudents.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No students assigned</p>
              ) : (
                <div className="space-y-1.5">
                  {t.assignedStudents.slice(0, 5).map(({ user: s }) => (
                    <div key={s.id} className="flex items-center gap-2">
                      <Avatar src={s.avatarUrl} name={fullName(s)} size="sm" />
                      <span className="text-sm text-slate-700">{fullName(s)}</span>
                    </div>
                  ))}
                  {t.assignedStudents.length > 5 && (
                    <p className="text-xs text-slate-400 pl-7">+{t.assignedStudents.length - 5} more</p>
                  )}
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────
export default function Users() {
  const qc = useQueryClient();
  const { user: me } = useAuthStore();
  const [tab, setTab] = useState<'users' | 'teachers'>('users');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<CreateUserForm>(defaultCreateForm);
  const [showPw, setShowPw] = useState(false);

  // Reset password
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPw, setShowNewPw] = useState(false);

  // Edit grade
  const [gradeTarget, setGradeTarget] = useState<User | null>(null);
  const [gradeValue, setGradeValue] = useState('');

  // Edit user
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', phone: '', bio: '' });

  // Status confirmation modals
  const [statusConfirm, setStatusConfirm] = useState<{ user: User; action: 'SUSPENDED' | 'ARCHIVED' | 'ACTIVE' } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<User | null>(null);

  const { data: usersResp, isLoading } = useQuery({
    queryKey: ['users', roleFilter, statusFilter, search],
    queryFn: () => {
      const params = new URLSearchParams();
      if (roleFilter) params.set('role', roleFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (search) params.set('search', search);
      return api.get<{ data: (User & { lastSeenAt: string | null })[]; pagination: unknown }>(`/users?${params}`).then((r) => r.data.data);
    },
    refetchInterval: 60 * 1000,
  });

  const users: (User & { lastSeenAt: string | null })[] = usersResp ?? [];

  const createMutation = useMutation({
    mutationFn: (data: CreateUserForm) => api.post('/users', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      setShowModal(false);
      setForm(defaultCreateForm);
      toast.success('User created — welcome email sent');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Failed to create user');
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: UserStatus }) =>
      api.patch(`/users/${id}/status`, { status }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['users'] });
      setStatusConfirm(null);
      const label = vars.status === 'ACTIVE' ? 'reactivated' : vars.status === 'SUSPENDED' ? 'suspended' : 'archived';
      toast.success(`User ${label}`);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Failed to update status');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      setDeleteConfirm(null);
      toast.success('User permanently deleted');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Failed to delete user');
      setDeleteConfirm(null);
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ id, newPassword }: { id: string; newPassword: string }) =>
      api.post(`/users/${id}/reset-password`, { newPassword }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      setResetTarget(null);
      setNewPassword('');
      toast.success('Password reset — notification email sent to user');
    },
    onError: () => toast.error('Failed to reset password'),
  });

  const updateGradeMutation = useMutation({
    mutationFn: ({ id, grade }: { id: string; grade: string }) =>
      api.patch(`/users/${id}/grade`, { grade }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      setGradeTarget(null);
      toast.success('Grade updated');
    },
    onError: () => toast.error('Failed to update grade'),
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, ...data }: { id: string; firstName: string; lastName: string; phone: string; bio: string }) =>
      api.put(`/users/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      setEditTarget(null);
      toast.success('User updated');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Failed to update user');
    },
  });

  function openEdit(u: User) {
    setEditForm({ firstName: u.firstName, lastName: u.lastName, phone: u.phone ?? '', bio: u.bio ?? '' });
    setEditTarget(u);
  }

  function generatePassword() {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$';
    return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }

  const roleVariant: Record<string, 'info' | 'success' | 'purple'> = {
    ADMIN: 'info', TEACHER: 'success', STUDENT: 'purple',
  };

  const isSelf = (u: User) => u.id === me?.id;

  // Status action helpers
  function confirmStatus(u: User, action: 'SUSPENDED' | 'ARCHIVED' | 'ACTIVE') {
    setStatusConfirm({ user: u, action });
  }

  function statusActionLabel(action: 'SUSPENDED' | 'ARCHIVED' | 'ACTIVE') {
    if (action === 'ACTIVE') return 'Reactivate';
    if (action === 'SUSPENDED') return 'Suspend';
    return 'Archive';
  }

  function statusActionMessage(u: User, action: 'SUSPENDED' | 'ARCHIVED' | 'ACTIVE') {
    const name = fullName(u);
    if (action === 'SUSPENDED') return `${name} will be blocked from logging in but all records will be preserved. You can reactivate them later.`;
    if (action === 'ARCHIVED') return `${name} will be permanently hidden and blocked from logging in. Records are kept. You can still reactivate them later.`;
    return `${name} will be able to log in and access the LMS again.`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-slate-500 text-sm mt-1">
            {tab === 'users' ? `${users.length} users` : 'Teacher assignments overview'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm">
            <button
              onClick={() => setTab('users')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === 'users' ? 'bg-brand-500 text-white' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <UsersIcon size={14} />All Users
            </button>
            <button
              onClick={() => setTab('teachers')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors border-l border-slate-200 ${
                tab === 'teachers' ? 'bg-brand-500 text-white border-brand-500' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <GraduationCap size={14} />Teachers
            </button>
          </div>
          <Button onClick={() => setShowModal(true)} icon={<Plus size={16} />}>New User</Button>
        </div>
      </div>

      {tab === 'teachers' && <TeachersPanel />}

      {/* Filters */}
      {tab === 'users' && (
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-300 focus:border-brand-500"
            />
          </div>
          <Select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            options={[
              { value: '', label: 'All roles' },
              { value: 'ADMIN', label: 'Admin' },
              { value: 'TEACHER', label: 'Teacher' },
              { value: 'STUDENT', label: 'Student' },
            ]}
            className="w-36"
          />
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: '', label: 'Active + Suspended' },
              { value: 'ACTIVE', label: 'Active only' },
              { value: 'SUSPENDED', label: 'Suspended' },
              { value: 'ARCHIVED', label: 'Archived' },
            ]}
            className="w-44"
          />
        </div>
      )}

      {tab === 'users' && (isLoading ? (
        <div className="flex justify-center py-16"><Spinner className="w-10 h-10" /></div>
      ) : users.length === 0 ? (
        <EmptyState
          icon={<Plus size={40} />}
          title="No users found"
          action={<Button onClick={() => setShowModal(true)} icon={<Plus size={16} />}>Create User</Button>}
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  {['User', 'Contact', 'Role', 'Status', 'Joined', 'Actions'].map((h) => (
                    <th key={h} className="text-left text-xs font-medium text-slate-500 px-6 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className={`hover:bg-slate-50 transition-colors ${u.status !== 'ACTIVE' ? 'opacity-70' : ''}`}>
                    {/* User */}
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          <Avatar src={u.avatarUrl} name={fullName(u)} size="sm" />
                          <span
                            title={isOnline(u.lastSeenAt) ? 'Online' : 'Offline'}
                            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                              isOnline(u.lastSeenAt) ? 'bg-emerald-500' : 'bg-slate-300'
                            }`}
                          />
                        </div>
                        <span className="font-medium text-slate-800 text-sm">{fullName(u)}</span>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="px-6 py-3">
                      <div className="flex flex-col gap-0.5">
                        <a href={`mailto:${u.email}`}
                          className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:underline">
                          <Mail size={12} className="shrink-0" />{u.email}
                        </a>
                        {u.phone && (
                          <a href={waUrl(u.phone)} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-emerald-600 hover:underline">
                            <WhatsAppIcon size={12} />{u.phone}
                          </a>
                        )}
                      </div>
                    </td>

                    {/* Role */}
                    <td className="px-6 py-3">
                      <div className="flex flex-col gap-1">
                        <Badge variant={roleVariant[u.role] ?? 'default'}>{u.role}</Badge>
                        {u.role === 'STUDENT' && u.grade && (
                          <span className="text-[11px] text-slate-500 font-medium">{u.grade}</span>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-3">
                      <Badge variant={statusVariant(u.status)}>{statusLabel(u.status)}</Badge>
                    </td>

                    {/* Joined */}
                    <td className="px-6 py-3 text-sm text-slate-500">{formatDate(u.createdAt)}</td>

                    {/* Actions */}
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Status actions — not shown for self */}
                        {!isSelf(u) && u.status === 'ACTIVE' && (
                          <>
                            <Button variant="ghost" size="sm" icon={<ShieldOff size={13} />}
                              onClick={() => confirmStatus(u, 'SUSPENDED')}>
                              Suspend
                            </Button>
                            <Button variant="ghost" size="sm" icon={<Archive size={13} />}
                              onClick={() => confirmStatus(u, 'ARCHIVED')}>
                              Archive
                            </Button>
                          </>
                        )}
                        {!isSelf(u) && u.status === 'SUSPENDED' && (
                          <>
                            <Button variant="ghost" size="sm" icon={<UserCheck size={13} />}
                              onClick={() => confirmStatus(u, 'ACTIVE')}>
                              Reactivate
                            </Button>
                            <Button variant="ghost" size="sm" icon={<Archive size={13} />}
                              onClick={() => confirmStatus(u, 'ARCHIVED')}>
                              Archive
                            </Button>
                          </>
                        )}
                        {!isSelf(u) && u.status === 'ARCHIVED' && (
                          <>
                            <Button variant="ghost" size="sm" icon={<UserCheck size={13} />}
                              onClick={() => confirmStatus(u, 'ACTIVE')}>
                              Reactivate
                            </Button>
                            <Button variant="ghost" size="sm" icon={<Trash2 size={13} />}
                              onClick={() => setDeleteConfirm(u)}
                              className="text-red-500 hover:text-red-700">
                              Delete
                            </Button>
                          </>
                        )}

                        {/* Always-available actions */}
                        <Button variant="outline" size="sm" icon={<Pencil size={13} />} onClick={() => openEdit(u)}>
                          Edit
                        </Button>
                        <Button variant="outline" size="sm" icon={<KeyRound size={13} />}
                          onClick={() => { setResetTarget(u); setNewPassword(''); setShowNewPw(false); }}>
                          Reset PW
                        </Button>
                        {u.role === 'STUDENT' && (
                          <Button variant="outline" size="sm" icon={<GraduationCap size={13} />}
                            onClick={() => { setGradeTarget(u); setGradeValue(u.grade ?? ''); }}>
                            Grade
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ))}

      {/* ── Status Confirmation Modal ──────────────────────────────── */}
      {statusConfirm && (
        <ConfirmModal
          open
          onClose={() => setStatusConfirm(null)}
          title={`${statusActionLabel(statusConfirm.action)} ${fullName(statusConfirm.user)}`}
          message={statusActionMessage(statusConfirm.user, statusConfirm.action)}
          confirmLabel={statusActionLabel(statusConfirm.action)}
          confirmVariant={statusConfirm.action === 'ACTIVE' ? 'primary' : statusConfirm.action === 'SUSPENDED' ? 'warning' : 'danger'}
          loading={statusMutation.isPending}
          onConfirm={() => statusMutation.mutate({ id: statusConfirm.user.id, status: statusConfirm.action })}
        />
      )}

      {/* ── Delete Confirmation Modal ──────────────────────────────── */}
      {deleteConfirm && (
        <ConfirmModal
          open
          onClose={() => setDeleteConfirm(null)}
          title={`Permanently delete ${fullName(deleteConfirm)}`}
          message={`This will permanently delete ${fullName(deleteConfirm)}'s account. If this user has any linked records (enrollments, payments, sessions, progress, bookmarks, notes), the delete will be blocked and you'll see an error. This action cannot be undone.`}
          confirmLabel="Delete permanently"
          confirmVariant="danger"
          loading={deleteMutation.isPending}
          onConfirm={() => deleteMutation.mutate(deleteConfirm.id)}
        />
      )}

      {/* ── Create User Modal ──────────────────────────────────────── */}
      <Modal open={showModal} onClose={() => { setShowModal(false); setForm(defaultCreateForm); }} title="Create User">
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form); }} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="First Name" value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} required />
            <Input label="Last Name" value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} required />
          </div>
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
          <Input label="Phone Number (optional)" type="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+1 (555) 000-0000" />
          <div>
            <label htmlFor="create-password" className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  id="create-password"
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  required minLength={6}
                  className="w-full pr-10 pl-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-300 focus:border-brand-500"
                  placeholder="Min. 6 characters"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <Button type="button" variant="outline" size="sm" icon={<RefreshCw size={13} />}
                onClick={() => { const p = generatePassword(); setForm((f) => ({ ...f, password: p })); setShowPw(true); }}>
                Generate
              </Button>
            </div>
          </div>
          <Select
            label="Role"
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value, grade: e.target.value === 'STUDENT' ? f.grade || 'Upskill' : '' }))}
            options={[
              { value: 'STUDENT', label: 'Student' },
              { value: 'TEACHER', label: 'Teacher' },
              { value: 'ADMIN', label: 'Admin' },
            ]}
          />
          {form.role === 'STUDENT' && (
            <Select
              label="Grade / Category"
              value={form.grade}
              onChange={(e) => setForm((f) => ({ ...f, grade: e.target.value }))}
              options={GRADE_OPTIONS}
            />
          )}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
            📧 A welcome email with login credentials will be sent to the user automatically.
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={() => setShowModal(false)} className="flex-1">Cancel</Button>
            <Button type="submit" loading={createMutation.isPending} className="flex-1">Create User</Button>
          </div>
        </form>
      </Modal>

      {/* ── Edit User Modal ───────────────────────────────────────── */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)}
        title={`Edit User — ${editTarget ? fullName(editTarget) : ''}`}>
        <form onSubmit={(e) => { e.preventDefault(); editTarget && updateUserMutation.mutate({ id: editTarget.id, ...editForm }); }} className="space-y-4">
          <p className="text-sm text-slate-500">
            Editing <strong>{editTarget?.email}</strong>. Email and role can't be changed here.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Input label="First Name" value={editForm.firstName} onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))} required />
            <Input label="Last Name" value={editForm.lastName} onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))} required />
          </div>
          <Input label="Phone" value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} placeholder="Optional" />
          <Input label="Bio" value={editForm.bio} onChange={(e) => setEditForm((f) => ({ ...f, bio: e.target.value }))} placeholder="Optional" />
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={() => setEditTarget(null)} className="flex-1">Cancel</Button>
            <Button type="submit" loading={updateUserMutation.isPending} className="flex-1">Save Changes</Button>
          </div>
        </form>
      </Modal>

      {/* ── Edit Grade Modal ──────────────────────────────────────── */}
      <Modal open={!!gradeTarget} onClose={() => setGradeTarget(null)}
        title={`Edit Grade — ${gradeTarget ? fullName(gradeTarget) : ''}`}>
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Update the grade level for <strong>{gradeTarget?.firstName}</strong>.
            {gradeTarget?.grade && <> Currently: <span className="font-medium text-slate-700">{gradeTarget.grade}</span>.</>}
          </p>
          <Select
            label="New Grade"
            value={gradeValue}
            onChange={(e) => setGradeValue(e.target.value)}
            options={[{ value: '', label: 'No grade assigned' }, ...GRADE_OPTIONS]}
          />
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setGradeTarget(null)} className="flex-1">Cancel</Button>
            <Button loading={updateGradeMutation.isPending}
              onClick={() => gradeTarget && updateGradeMutation.mutate({ id: gradeTarget.id, grade: gradeValue })}
              className="flex-1">
              Save Grade
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Reset Password Modal ──────────────────────────────────── */}
      <Modal open={!!resetTarget} onClose={() => setResetTarget(null)}
        title={`Reset Password — ${resetTarget ? fullName(resetTarget) : ''}`}>
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            Set a new password for <strong>{resetTarget?.email}</strong>. An email notification will be sent to them.
          </p>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showNewPw ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={6}
                  className="w-full pr-10 pl-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-300 focus:border-brand-500"
                  placeholder="Min. 6 characters"
                />
                <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showNewPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <Button type="button" variant="outline" size="sm" icon={<RefreshCw size={13} />}
                onClick={() => { setNewPassword(generatePassword()); setShowNewPw(true); }}>
                Generate
              </Button>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setResetTarget(null)} className="flex-1">Cancel</Button>
            <Button disabled={newPassword.length < 6} loading={resetPasswordMutation.isPending}
              onClick={() => resetTarget && resetPasswordMutation.mutate({ id: resetTarget.id, newPassword })}
              className="flex-1">
              Reset & Notify
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
