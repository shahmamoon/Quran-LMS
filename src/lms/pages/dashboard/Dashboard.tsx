import { useQuery } from '@tanstack/react-query';
import { Calendar, BookOpen, Users, Video, Bell, Clock, Plus, ArrowRight, UserPlus, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/auth.store';
import { Card, CardBody, CardHeader, StatCard, Badge, Avatar, Spinner, EmptyState, Button } from '../../components/ui';
import { formatDateTime, formatRelative, fullName, sessionStatusColor } from '../../lib/utils';
import type { Session, Subject, Notification, User, ActivityItem } from '../../types';

// ─── Activity Feed Widget ─────────────────────────────────────
const ACTIVITY_ICON: Record<string, string> = {
  message_received: '💬', session_scheduled: '📅', course_enrolled: '🎓',
  user_joined: '👤', session_reminder: '⏰',
  info: 'ℹ️', success: '✅', warning: '⚠️', error: '❌',
};

function ActivityFeed() {
  const { data: items = [], isLoading } = useQuery<ActivityItem[]>({
    queryKey: ['activity'],
    queryFn: () => api.get<{ data: ActivityItem[] }>('/activity').then((r) => r.data.data),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <Activity size={16} className="text-slate-400" />Recent Activity
          </h2>
          <Link to="/lms/notifications" className="text-xs text-brand-500 hover:text-brand-600 flex items-center gap-1 font-medium">
            All notifications <ArrowRight size={12} />
          </Link>
        </div>
      </CardHeader>
      <CardBody className="p-0">
        {isLoading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : items.length === 0 ? (
          <EmptyState icon={<Activity size={32} />} title="No recent activity" description="Activity will appear here as things happen." />
        ) : (
          <ul className="divide-y divide-slate-50">
            {items.slice(0, 8).map((item) => (
              <li key={item.id}>
                {item.link ? (
                  <Link to={item.link} className="flex items-start gap-3 px-6 py-3.5 hover:bg-slate-50 transition-colors">
                    <span className="text-base shrink-0 mt-0.5 select-none">{ACTIVITY_ICON[item.type] ?? '🔔'}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 truncate">{item.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{item.body}</p>
                      <p className="text-xs text-slate-400 mt-1">{formatRelative(item.createdAt)}</p>
                    </div>
                  </Link>
                ) : (
                  <div className="flex items-start gap-3 px-6 py-3.5">
                    <span className="text-base shrink-0 mt-0.5 select-none">{ACTIVITY_ICON[item.type] ?? '🔔'}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 truncate">{item.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{item.body}</p>
                      <p className="text-xs text-slate-400 mt-1">{formatRelative(item.createdAt)}</p>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// ─── Admin Dashboard ──────────────────────────────────────────
function AdminDashboard() {
  const { user } = useAuthStore();
  const { data: usersData }    = useQuery({ queryKey: ['users'],    queryFn: () => api.get<{ data: User[] }>('/users').then((r) => r.data.data) });
  const { data: subjectsData } = useQuery({ queryKey: ['subjects'], queryFn: () => api.get<{ data: Subject[] }>('/subjects').then((r) => r.data.data) });
  const { data: sessionsData } = useQuery({ queryKey: ['sessions'], queryFn: () => api.get<{ data: Session[] }>('/sessions').then((r) => r.data.data) });

  const users    = usersData ?? [];
  const subjects = subjectsData ?? [];
  const sessions = sessionsData ?? [];

  const teachers = users.filter((u) => u.role === 'TEACHER').length;
  const students = users.filter((u) => u.role === 'STUDENT').length;
  const upcoming = sessions.filter((s) => s.status === 'SCHEDULED' && new Date(s.scheduledAt) > new Date());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{greeting()}, {user?.firstName}!</h1>
          <p className="text-slate-500 text-sm mt-0.5">Here's what's happening today.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/lms/users">
            <Button variant="outline" size="sm" icon={<UserPlus size={14} />}>Add User</Button>
          </Link>
          <Link to="/lms/subjects">
            <Button size="sm" icon={<Plus size={14} />}>New Course</Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Students"         value={students}        icon={<Users size={20} />}    color="text-blue-600" />
        <StatCard label="Teachers"         value={teachers}        icon={<Users size={20} />}    color="text-purple-600" />
        <StatCard label="Courses"          value={subjects.length} icon={<BookOpen size={20} />} color="text-emerald-600" />
        <StatCard label="Upcoming Sessions" value={upcoming.length} icon={<Calendar size={20} />} color="text-amber-600" />
      </div>

      {/* Tables */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">Upcoming Sessions</h2>
              <Link to="/lms/sessions" className="text-xs text-brand-500 hover:text-brand-600 flex items-center gap-1 font-medium">
                View all <ArrowRight size={12} />
              </Link>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {upcoming.length === 0 ? (
              <EmptyState icon={<Calendar size={32} />} title="No upcoming sessions"
                action={<Link to="/lms/sessions"><Button size="sm" icon={<Plus size={14} />} variant="outline">Schedule one</Button></Link>} />
            ) : (
              <ul className="divide-y divide-slate-50">
                {upcoming.slice(0, 5).map((s) => (
                  <li key={s.id} className="px-6 py-3.5 flex items-center gap-3 hover:bg-slate-50 transition-colors">
                    <div className="text-center w-9 shrink-0">
                      <p className="text-[10px] text-slate-400 uppercase font-medium">
                        {new Intl.DateTimeFormat('en', { month: 'short' }).format(new Date(s.scheduledAt))}
                      </p>
                      <p className="text-lg font-bold text-slate-800 leading-none">
                        {new Date(s.scheduledAt).getDate()}
                      </p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-800 text-sm truncate">{s.title}</p>
                      <p className="text-xs text-slate-400">
                        {new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit' }).format(new Date(s.scheduledAt))}
                        {' · '}{s.durationMinutes}min
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">Courses</h2>
              <Link to="/lms/subjects" className="text-xs text-brand-500 hover:text-brand-600 flex items-center gap-1 font-medium">
                View all <ArrowRight size={12} />
              </Link>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {subjects.length === 0 ? (
              <EmptyState icon={<BookOpen size={32} />} title="No courses yet"
                action={<Link to="/lms/subjects"><Button size="sm" icon={<Plus size={14} />} variant="outline">Create one</Button></Link>} />
            ) : (
              <ul className="divide-y divide-slate-50">
                {subjects.slice(0, 5).map((s) => (
                  <li key={s.id} className="px-6 py-3.5 flex items-center gap-3 hover:bg-slate-50 transition-colors">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-800 text-sm truncate">{s.title}</p>
                      {s.teachers?.[0] && <p className="text-xs text-slate-400">{fullName(s.teachers[0].teacher)}</p>}
                    </div>
                    <Badge variant={s.isPublished ? 'success' : 'default'}>{s.isPublished ? 'Live' : 'Draft'}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
      <ActivityFeed />
    </div>
  );
}

// ─── Teacher Dashboard ────────────────────────────────────────
function TeacherDashboard() {
  const { user } = useAuthStore();
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => api.get<{ data: Session[] }>('/sessions').then((r) => r.data.data),
  });
  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => api.get<{ data: Subject[] }>('/subjects').then((r) => r.data.data),
  });

  const upcoming = sessions.filter((s) => s.status === 'SCHEDULED' && new Date(s.scheduledAt) > new Date());
  const live     = sessions.filter((s) => s.status === 'LIVE');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{greeting()}, {user?.firstName}!</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {live.length > 0 ? `You have ${live.length} live session${live.length > 1 ? 's' : ''} right now.` : 'Ready to teach today?'}
          </p>
        </div>
        <Link to="/lms/sessions">
          <Button size="sm" icon={<Plus size={14} />}>Schedule Session</Button>
        </Link>
      </div>

      {/* Live banner */}
      {live.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4 flex items-center gap-3">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <p className="text-emerald-800 font-medium text-sm">
            {live.length} session{live.length > 1 ? 's are' : ' is'} live right now
          </p>
          {live[0].zoomStartUrl && (
            <a href={live[0].zoomStartUrl} target="_blank" rel="noreferrer" className="ml-auto">
              <Button size="sm" icon={<Video size={13} />}>Join Now</Button>
            </a>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="My Courses"       value={subjects.length} icon={<BookOpen size={20} />} color="text-brand-600" />
        <StatCard label="Upcoming Classes" value={upcoming.length} icon={<Calendar size={20} />} color="text-amber-600" />
        <StatCard label="Live Now"         value={live.length}     icon={<Video size={20} />}    color="text-emerald-600" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Upcoming Sessions</h2>
            <Link to="/lms/sessions" className="text-xs text-brand-500 hover:text-brand-600 flex items-center gap-1 font-medium">
              View all <ArrowRight size={12} />
            </Link>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : upcoming.length === 0 ? (
            <EmptyState icon={<Calendar size={32} />} title="No upcoming sessions"
              description="Schedule a Zoom session for your class."
              action={<Link to="/lms/sessions"><Button size="sm" icon={<Plus size={14} />} variant="outline">Schedule one</Button></Link>} />
          ) : (
            <ul className="divide-y divide-slate-50">
              {upcoming.slice(0, 8).map((s) => (
                <li key={s.id} className="px-6 py-3.5 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                  <div className="text-center w-9 shrink-0">
                    <p className="text-[10px] text-slate-400 uppercase font-medium">
                      {new Intl.DateTimeFormat('en', { month: 'short' }).format(new Date(s.scheduledAt))}
                    </p>
                    <p className="text-lg font-bold text-slate-800 leading-none">
                      {new Date(s.scheduledAt).getDate()}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-800 text-sm truncate">{s.title}</p>
                    <p className="text-xs text-slate-400">
                      {new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit' }).format(new Date(s.scheduledAt))}
                      {' · '}{s.durationMinutes}min
                    </p>
                  </div>
                  {s.zoomJoinUrl && (
                    <a href={s.zoomStartUrl ?? s.zoomJoinUrl} target="_blank" rel="noreferrer">
                      <Button size="sm" icon={<Video size={12} />}>Start</Button>
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
      <ActivityFeed />
    </div>
  );
}

// ─── Student Dashboard ────────────────────────────────────────
function StudentDashboard() {
  const { user } = useAuthStore();
  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => api.get<{ data: Subject[] }>('/subjects').then((r) => r.data.data),
  });
  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => api.get<{ data: Session[] }>('/sessions').then((r) => r.data.data),
  });
  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get<{ data: { notifications: Notification[] } }>('/notifications').then((r) => r.data.data),
    refetchInterval: 30_000,
  });

  const upcoming    = sessions.filter((s) => s.status === 'SCHEDULED' && new Date(s.scheduledAt) > new Date());
  const live        = sessions.filter((s) => s.status === 'LIVE');
  const unreadNotifs = (notifData?.notifications ?? []).filter((n) => !n.isRead);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{greeting()}, {user?.firstName}!</h1>
        <p className="text-slate-500 text-sm mt-0.5">Here's your learning overview.</p>
      </div>

      {/* Live session banner */}
      {live.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4 flex items-center gap-3">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <p className="text-emerald-800 font-medium text-sm">A class is live right now!</p>
          {live[0].zoomJoinUrl && (
            <a href={live[0].zoomJoinUrl} target="_blank" rel="noreferrer" className="ml-auto">
              <Button size="sm" icon={<Video size={13} />}>Join Class</Button>
            </a>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Enrolled Courses"     value={subjects.length}     icon={<BookOpen size={20} />} color="text-brand-600" />
        <StatCard label="Upcoming Classes"     value={upcoming.length}     icon={<Calendar size={20} />} color="text-amber-600" />
        <StatCard label="Unread Notifications" value={unreadNotifs.length} icon={<Bell size={20} />}    color="text-purple-600" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Courses */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">My Courses</h2>
              <Link to="/lms/subjects" className="text-xs text-brand-500 hover:text-brand-600 flex items-center gap-1 font-medium">
                View all <ArrowRight size={12} />
              </Link>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {subjects.length === 0 ? (
              <EmptyState icon={<BookOpen size={32} />} title="No courses yet" description="Your teacher will enroll you in courses." />
            ) : (
              <ul className="divide-y divide-slate-50">
                {subjects.map((s) => (
                  <li key={s.id} className="px-6 py-3.5 flex items-center gap-3 hover:bg-slate-50 transition-colors">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-800 text-sm">{s.title}</p>
                      {s.teachers?.[0] && <p className="text-xs text-slate-400">{fullName(s.teachers[0].teacher)}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        {/* Upcoming sessions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">Upcoming Classes</h2>
              <Link to="/lms/sessions" className="text-xs text-brand-500 hover:text-brand-600 flex items-center gap-1 font-medium">
                View all <ArrowRight size={12} />
              </Link>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {upcoming.length === 0 ? (
              <EmptyState icon={<Calendar size={32} />} title="No upcoming classes" description="Check back soon for scheduled sessions." />
            ) : (
              <ul className="divide-y divide-slate-50">
                {upcoming.slice(0, 5).map((s) => (
                  <li key={s.id} className="px-6 py-3.5 flex items-center gap-3 hover:bg-slate-50 transition-colors">
                    <div className="text-center w-9 shrink-0">
                      <p className="text-[10px] text-slate-400 uppercase font-medium">
                        {new Intl.DateTimeFormat('en', { month: 'short' }).format(new Date(s.scheduledAt))}
                      </p>
                      <p className="text-lg font-bold text-slate-800 leading-none">
                        {new Date(s.scheduledAt).getDate()}
                      </p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-800 text-sm truncate">{s.title}</p>
                      <p className="text-xs text-slate-400">{formatDateTime(s.scheduledAt)}</p>
                    </div>
                    {s.zoomJoinUrl && (
                      <a href={s.zoomJoinUrl} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="outline" icon={<Video size={12} />}>Join</Button>
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Unread notifications */}
      {unreadNotifs.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">New Notifications</h2>
              <Link to="/lms/notifications" className="text-xs text-brand-500 hover:text-brand-600 flex items-center gap-1 font-medium">
                See all <ArrowRight size={12} />
              </Link>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            <ul className="divide-y divide-slate-50">
              {unreadNotifs.slice(0, 3).map((n) => (
                <li key={n.id} className="px-6 py-3.5 flex items-start gap-3 hover:bg-slate-50 transition-colors">
                  <div className="w-2 h-2 rounded-full bg-brand-400 shrink-0 mt-1.5" />
                  <div>
                    <p className="text-sm font-medium text-slate-800">{n.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{n.body}</p>
                    <p className="text-xs text-slate-400 mt-1">{formatRelative(n.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}
      <ActivityFeed />
    </div>
  );
}

// ─── Role-based export ────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuthStore();
  if (!user) return null;
  if (user.role === 'ADMIN')   return <AdminDashboard />;
  if (user.role === 'TEACHER') return <TeacherDashboard />;
  return <StudentDashboard />;
}
