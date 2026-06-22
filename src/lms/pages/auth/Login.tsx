import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { BookMarked, Mail, Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { api } from '../../lib/api';
import { queryClient } from '../../lib/queryClient';
import { useAuthStore } from '../../store/auth.store';
import { Button, Input } from '../../components/ui';
import type { LoginResponse } from '../../types';
import { toast } from 'sonner';

const features = [
  'Track Quran recitation page-by-page',
  'Manage Noorani Qaida lesson progress',
  'Schedule & host live sessions',
  'Communicate instantly via chat',
];

const demoAccounts = [
  { role: 'Admin',   email: 'admin@quranacademy.com',   pass: 'Admin@123!' },
  { role: 'Teacher', email: 'teacher@quranacademy.com', pass: 'Teacher@123!' },
  { role: 'Student', email: 'student@quranacademy.com', pass: 'Student@123!' },
];

export default function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    api.get<{ demo?: boolean }>('/health')
      .then(r => setIsDemoMode(r.data.demo === true))
      .catch(() => {});
  }, []);

  const { setAuth } = useAuthStore();
  const navigate    = useNavigate();
  const location    = useLocation();
  const from = (location.state as { from?: Location })?.from?.pathname ?? '/lms/dashboard';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post<{ data: LoginResponse }>('/auth/login', { email, password });
      const { user, accessToken } = res.data.data;
      queryClient.clear();
      setAuth(user, accessToken);
      toast.success(`Welcome back, ${user.firstName}!`);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Login failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left brand panel (desktop only) ─────────────────── */}
      <div className="hidden lg:flex lg:w-[45%] bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 flex-col justify-between p-12 relative overflow-hidden">
        {/* decorative circles */}
        <div className="absolute -top-24 -left-24 w-80 h-80 bg-white/5 rounded-full" />
        <div className="absolute top-1/2 -right-32 w-96 h-96 bg-white/5 rounded-full" />
        <div className="absolute -bottom-20 left-1/4 w-64 h-64 bg-white/5 rounded-full" />

        {/* logo */}
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm border border-white/20">
            <BookMarked size={22} className="text-white" />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">Online Quran Academy</span>
        </div>

        {/* headline */}
        <div className="relative">
          <h2 className="text-white text-3xl font-bold leading-snug mb-4">
            Your Quran learning<br />management platform
          </h2>
          <p className="text-brand-100 text-sm mb-8 leading-relaxed">
            Manage courses, host live sessions, track recitation progress — all in one place.
          </p>

          <ul className="space-y-3">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-3 text-brand-100">
                <CheckCircle2 size={16} className="text-brand-200 shrink-0" />
                <span className="text-sm">{f}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* footer */}
        <p className="relative text-brand-200 text-xs">
          © {new Date().getFullYear()} Online Quran Academy. All rights reserved.
        </p>
      </div>

      {/* ── Right form panel ────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2">
              <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center">
                <BookMarked size={20} className="text-white" />
              </div>
              <span className="text-lg font-bold text-slate-800">Online Quran Academy</span>
            </Link>
          </div>

          <div className="mb-7">
            <h1 className="text-2xl font-bold text-slate-900">Sign in</h1>
            <p className="text-slate-500 text-sm mt-1">Access your learning dashboard</p>
          </div>

          {/* Form card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-7">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-[2.1rem] text-slate-400 pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  label="Email address"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  required
                  autoComplete="email"
                />
              </div>

              {/* Password */}
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-[2.1rem] text-slate-400 pointer-events-none" />
                <Input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  label="Password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 pr-10"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-[2.15rem] text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-600 text-sm flex items-start gap-2">
                  <span className="shrink-0 mt-0.5">⚠</span>
                  {error}
                </div>
              )}

              <Button type="submit" loading={loading} className="w-full mt-1" size="lg">
                Sign in
              </Button>
            </form>

            {isDemoMode && (
              <div className="mt-6 pt-5 border-t border-slate-100">
                <p className="text-xs text-slate-400 text-center mb-3 font-medium">Quick demo access</p>
                <div className="grid grid-cols-3 gap-2">
                  {demoAccounts.map((d) => (
                    <button
                      key={d.role}
                      type="button"
                      onClick={() => { setEmail(d.email); setPassword(d.pass); }}
                      className="text-xs py-2 px-2 rounded-lg border border-slate-200 text-slate-600 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-600 transition-colors font-medium"
                    >
                      {d.role}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <p className="text-center mt-5 text-sm text-slate-500">
            <Link to="/" className="text-brand-500 hover:text-brand-600 hover:underline transition-colors">
              ← Back to site
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
