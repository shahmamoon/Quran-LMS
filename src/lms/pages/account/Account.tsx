import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Eye, EyeOff, User, Phone, Save, Video, CheckCircle2, XCircle } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import { Button, Card, CardHeader, CardBody, Input } from '../../components/ui';
import { fullName } from '../../lib/utils';
import { toast } from 'sonner';
import type { User as UserType } from '../../types';

// ── Profile edit ──────────────────────────────────────────────
interface ProfileForm {
  firstName: string;
  lastName: string;
  phone: string;
  bio: string;
}

function ProfileSection() {
  const { user, updateUser } = useAuthStore();

  const [form, setForm] = useState<ProfileForm>({
    firstName: user?.firstName ?? '',
    lastName:  user?.lastName  ?? '',
    phone:     user?.phone     ?? '',
    bio:       user?.bio       ?? '',
  });

  const updateMutation = useMutation({
    mutationFn: (data: ProfileForm) =>
      api.put<{ data: UserType }>(`/users/${user?.id}`, {
        firstName: data.firstName.trim(),
        lastName:  data.lastName.trim(),
        phone:     data.phone.trim() || null,
        bio:       data.bio.trim()   || null,
      }),
    onSuccess: (res) => {
      updateUser(res.data.data);
      toast.success('Profile updated');
    },
    onError: () => toast.error('Failed to update profile'),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error('First and last name are required');
      return;
    }
    updateMutation.mutate(form);
  }

  if (!user) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <User size={16} className="text-slate-400" />
          <h2 className="font-semibold text-slate-800">Profile</h2>
        </div>
      </CardHeader>
      <CardBody>
        {/* Read-only info */}
        <div className="grid grid-cols-2 gap-4 text-sm mb-5 pb-5 border-b border-slate-100">
          <div>
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wide mb-1">Email</p>
            <p className="text-slate-800 font-medium">{user.email}</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wide mb-1">Role</p>
            <p className="text-slate-800 font-medium capitalize">{user.role.toLowerCase()}</p>
          </div>
        </div>

        {/* Editable fields */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name"
              value={form.firstName}
              onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
              required
              placeholder="First name"
            />
            <Input
              label="Last Name"
              value={form.lastName}
              onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
              required
              placeholder="Last name"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Phone Number
              <span className="ml-1 text-xs font-normal text-slate-400">(optional — used for WhatsApp)</span>
            </label>
            <div className="relative">
              <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+60 12-345 6789"
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-300 focus:border-brand-500"
              />
            </div>
            {form.phone && (
              <p className="text-xs text-slate-400 mt-1">
                WhatsApp link:{' '}
                <a
                  href={`https://wa.me/${form.phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-600 hover:underline"
                >
                  wa.me/{form.phone.replace(/\D/g, '')}
                </a>
              </p>
            )}
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Bio
              <span className="ml-1 text-xs font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              rows={3}
              placeholder="Tell students a bit about yourself…"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-300 focus:border-brand-500 resize-none"
            />
          </div>

          <Button
            type="submit"
            loading={updateMutation.isPending}
            icon={<Save size={15} />}
            className="w-full"
          >
            Save Profile
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}

// ── Change password ───────────────────────────────────────────
function ChangePasswordSection() {
  const { user } = useAuthStore();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);

  const changePasswordMutation = useMutation({
    mutationFn: () =>
      api.put(`/users/${user?.id}/change-password`, { currentPassword, newPassword }),
    onSuccess: () => {
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ?? 'Failed to change password');
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) { toast.error('New passwords do not match'); return; }
    if (newPassword.length < 6) { toast.error('New password must be at least 6 characters'); return; }
    changePasswordMutation.mutate();
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <KeyRound size={16} className="text-slate-400" />
          <h2 className="font-semibold text-slate-800">Change Password</h2>
        </div>
      </CardHeader>
      <CardBody>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full pr-10 pl-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-300 focus:border-brand-500"
                placeholder="Enter your current password"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* New password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="w-full pr-10 pl-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-300 focus:border-brand-500"
                placeholder="Min. 6 characters"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Confirm password */}
          <Input
            label="Confirm New Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            placeholder="Re-enter new password"
          />

          {/* Password strength bar */}
          {newPassword.length > 0 && (
            <div className="flex items-center gap-2">
              {[6, 8, 10, 12].map((len) => (
                <div
                  key={len}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    newPassword.length >= len ? 'bg-green-400' : 'bg-slate-200'
                  }`}
                />
              ))}
              <span className="text-xs text-slate-400 shrink-0">
                {newPassword.length < 6 ? 'Too short' : newPassword.length < 8 ? 'Fair' : newPassword.length < 10 ? 'Good' : 'Strong'}
              </span>
            </div>
          )}

          <Button
            type="submit"
            loading={changePasswordMutation.isPending}
            icon={<KeyRound size={15} />}
            className="w-full"
          >
            Update Password
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}

// ── Zoom account connect ──────────────────────────────────────
function ZoomSection() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const { data, isLoading } = useQuery({
    queryKey: ['zoom-status'],
    queryFn: () => api.get<{ data: { enabled: boolean; connected: boolean } }>('/zoom/status').then((r) => r.data.data),
  });

  // Handle redirect back from Zoom OAuth
  useEffect(() => {
    const zoom = searchParams.get('zoom');
    if (zoom === 'connected') {
      toast.success('Zoom account connected!');
      qc.invalidateQueries({ queryKey: ['zoom-status'] });
      setSearchParams({}, { replace: true });
    } else if (zoom === 'error') {
      toast.error('Zoom connection failed. Please try again.');
      setSearchParams({}, { replace: true });
    } else if (zoom === 'denied') {
      toast.error('Zoom authorization was cancelled.');
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, qc, setSearchParams]);

  const disconnectMutation = useMutation({
    mutationFn: () => api.delete('/zoom/disconnect'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['zoom-status'] });
      toast.success('Zoom account disconnected');
    },
    onError: () => toast.error('Failed to disconnect Zoom'),
  });

  // Only show for teachers and admins
  if (!user || (user.role !== 'TEACHER' && user.role !== 'ADMIN')) return null;
  // Feature not configured on server
  if (!isLoading && data && !data.enabled) return null;

  const connected = data?.connected ?? false;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Video size={16} className="text-slate-400" />
          <h2 className="font-semibold text-slate-800">Zoom Account</h2>
        </div>
      </CardHeader>
      <CardBody>
        <p className="text-sm text-slate-500 mb-4">
          Connect your own Zoom account so sessions you create are hosted under your identity.
          If not connected, sessions use the shared organisation account.
        </p>

        {isLoading ? (
          <div className="h-8 bg-slate-100 rounded animate-pulse w-40" />
        ) : connected ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-emerald-700 font-medium">
              <CheckCircle2 size={16} className="text-emerald-500" />
              Zoom account connected
            </div>
            <Button
              variant="outline"
              size="sm"
              icon={<XCircle size={14} />}
              loading={disconnectMutation.isPending}
              onClick={() => disconnectMutation.mutate()}
            >
              Disconnect
            </Button>
          </div>
        ) : (
          <a href="/api/zoom/connect">
            <Button variant="secondary" icon={<Video size={15} />}>
              Connect Zoom Account
            </Button>
          </a>
        )}
      </CardBody>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────
export default function Account() {
  const { user } = useAuthStore();
  if (!user) return null;

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{fullName(user)}</h1>
        <p className="text-slate-500 text-sm mt-1">Manage your profile and security settings</p>
      </div>

      <ProfileSection />
      <ZoomSection />
      <ChangePasswordSection />
    </div>
  );
}
