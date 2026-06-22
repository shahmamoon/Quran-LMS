import { NavLink, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, BookOpen, Calendar, MessageSquare,
  Bell, Settings, LogOut,
  BarChart2, FileText, UserSquare2, CreditCard, BookMarked, BookOpenCheck, GraduationCap, Sparkles,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/auth.store';
import { useNotificationStore } from '../../store/notification.store';
import { useChatStore } from '../../store/chat.store';
import { api } from '../../lib/api';
import { queryClient } from '../../lib/queryClient';
import { disconnectSocket } from '../../lib/socket';
import { cn } from '../../lib/utils';
import { Avatar } from '../ui';
import { fullName } from '../../lib/utils';

type EnrollmentCourseType = 'NOORANI_QAIDA' | 'QURAN_LEARNING' | 'ISLAMIC_LEARNING';

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
  roles: string[];
  // When set, STUDENT role requires this course type in their enrollments to see the item.
  // ADMIN and TEACHER always see all items regardless of this field.
  enrollmentType?: EnrollmentCourseType;
}

interface NavSection {
  label: string | null;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    label: null,
    items: [
      { label: 'Dashboard', to: '/lms/dashboard',   icon: <LayoutDashboard size={17} />, roles: ['ADMIN', 'TEACHER', 'STUDENT'] },
      { label: 'Payments',  to: '/lms/my-payments', icon: <CreditCard size={17} />,      roles: ['STUDENT'] },
    ],
  },
  {
    label: 'Learning',
    items: [
      { label: 'Courses',          to: '/lms/subjects',      icon: <BookOpen size={17} />,      roles: ['ADMIN', 'TEACHER', 'STUDENT'] },
      { label: 'Quran Reader',     to: '/lms/quran-reader',  icon: <BookOpenCheck size={17} />, roles: ['ADMIN', 'TEACHER', 'STUDENT'], enrollmentType: 'QURAN_LEARNING' },
      { label: 'Noorani Qaida',    to: '/lms/noorani-qaida', icon: <GraduationCap size={17} />, roles: ['ADMIN', 'TEACHER', 'STUDENT'], enrollmentType: 'NOORANI_QAIDA' },
      { label: 'Islamic Learning', to: '/lms/islamic',       icon: <Sparkles size={17} />,      roles: ['ADMIN', 'TEACHER', 'STUDENT'], enrollmentType: 'ISLAMIC_LEARNING' },
      { label: 'Sessions',         to: '/lms/sessions',      icon: <Calendar size={17} />,      roles: ['ADMIN', 'TEACHER', 'STUDENT'] },
    ],
  },
  {
    label: 'Communication',
    items: [
      { label: 'Chat',          to: '/lms/chat',          icon: <MessageSquare size={17} />, roles: ['ADMIN', 'TEACHER', 'STUDENT'] },
      { label: 'Notifications', to: '/lms/notifications', icon: <Bell size={17} />,          roles: ['ADMIN', 'TEACHER', 'STUDENT'] },
    ],
  },
  {
    label: 'Management',
    items: [
      { label: 'Users',      to: '/lms/users',     icon: <Users size={17} />,       roles: ['ADMIN'] },
      { label: 'Payments',   to: '/lms/payments',  icon: <CreditCard size={17} />,  roles: ['ADMIN'] },
      { label: 'Students',   to: '/lms/students',  icon: <UserSquare2 size={17} />, roles: ['ADMIN', 'TEACHER'] },
      { label: 'Analytics',  to: '/lms/analytics', icon: <BarChart2 size={17} />,   roles: ['ADMIN'] },
      { label: 'Settings',   to: '/lms/settings',  icon: <Settings size={17} />,    roles: ['ADMIN'] },
      { label: 'Audit Logs', to: '/lms/audit',     icon: <FileText size={17} />,    roles: ['ADMIN'] },
    ],
  },
];

const roleBadgeColors: Record<string, string> = {
  ADMIN:   'bg-brand-500/20 text-brand-300',
  TEACHER: 'bg-purple-500/20 text-purple-300',
  STUDENT: 'bg-emerald-500/20 text-emerald-300',
};

function SidebarBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-auto min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
      {count > 99 ? '99+' : count}
    </span>
  );
}

export function LMSSidebar() {
  const { user, clearAuth } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const { chatUnreadCount } = useChatStore();
  const navigate = useNavigate();

  // Fetch enrolled course types for STUDENT role only.
  // GET /subjects returns only the student's enrolled subjects (filtered server-side).
  // We extract the distinct courseType values to decide which module links to show.
  // null = still loading (hide restricted items to avoid flash).
  // [] = loaded but no enrollments (all restricted items hidden).
  const { data: enrolledTypes } = useQuery<EnrollmentCourseType[]>({
    queryKey: ['sidebar-enrolled-types'],
    queryFn: () =>
      api
        .get<{ data: { courseType: EnrollmentCourseType | null }[] }>('/subjects')
        .then(r => [
          ...new Set(
            r.data.data
              .map(s => s.courseType)
              .filter((t): t is EnrollmentCourseType => t !== null)
          ),
        ]),
    enabled: user?.role === 'STUDENT',
    staleTime: 5 * 60 * 1000, // cache 5 min — sidebar renders on every navigation
  });

  async function handleLogout() {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    disconnectSocket();
    queryClient.clear();
    clearAuth();
    navigate('/lms/login');
  }

  if (!user) return null;

  const isStudent = user.role === 'STUDENT';

  const itemVisible = (item: NavItem): boolean => {
    if (!item.roles.includes(user.role)) return false;
    if (!item.enrollmentType) return true;         // no enrollment gate
    if (!isStudent) return true;                   // staff see everything
    if (enrolledTypes === undefined) return false; // still loading → hide to avoid flash
    return enrolledTypes.includes(item.enrollmentType);
  };

  const visibleSections = navSections
    .map(section => ({
      ...section,
      items: section.items.filter(itemVisible),
    }))
    .filter(section => section.items.length > 0);

  return (
    <aside className="flex flex-col h-full bg-slate-900 w-60 shrink-0 border-r border-slate-800">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center shadow-lg shadow-brand-500/30">
          <BookMarked size={17} className="text-white" />
        </div>
        <span className="text-white font-semibold text-sm tracking-tight">Online Quran Academy</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2 overflow-y-auto scrollbar-thin">
        {visibleSections.map((section, si) => (
          <div key={si} className={si > 0 ? 'mt-1' : ''}>
            {section.label && (
              <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-widest px-5 py-2 mt-2">
                {section.label}
              </p>
            )}
            <ul className="space-y-0.5 px-3">
              {section.items.map((item) => {
                const badge = item.to === '/lms/chat'
                  ? chatUnreadCount
                  : item.to === '/lms/notifications'
                    ? unreadCount
                    : 0;
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      className={({ isActive }) => cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 relative',
                        isActive
                          ? 'bg-white/10 text-white font-medium before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-0.5 before:bg-brand-400 before:rounded-r'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-white/5'
                      )}
                    >
                      <span className="shrink-0">{item.icon}</span>
                      <span className="flex-1">{item.label}</span>
                      <SidebarBadge count={badge} />
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-slate-800 p-4">
        <Link
          to="/lms/account"
          className="flex items-center gap-3 rounded-lg p-2 hover:bg-white/5 transition-colors group"
        >
          <Avatar src={user.avatarUrl} name={fullName(user)} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="text-white text-sm font-medium truncate leading-tight">{fullName(user)}</p>
            <span className={cn(
              'inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full mt-0.5 leading-tight',
              roleBadgeColors[user.role] ?? 'bg-slate-700 text-slate-300'
            )}>
              {user.role.charAt(0) + user.role.slice(1).toLowerCase()}
            </span>
          </div>
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2.5 w-full px-3 py-2 mt-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 text-sm transition-colors"
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
