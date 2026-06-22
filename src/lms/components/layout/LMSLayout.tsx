import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom';
import { useEffect } from 'react';
import { Bell, MessageSquare } from 'lucide-react';
import { LMSSidebar } from './LMSSidebar';
import { useAuthStore } from '../../store/auth.store';
import { useNotificationStore } from '../../store/notification.store';
import { useChatStore } from '../../store/chat.store';
import axios from 'axios';
import { api } from '../../lib/api';
import { queryClient } from '../../lib/queryClient';
import { getSocket, disconnectSocket, reconnectSocket } from '../../lib/socket';
import { Avatar, Spinner } from '../ui';
import { fullName } from '../../lib/utils';
import type { Notification } from '../../types';
import { Toaster } from 'sonner';

// Map routes → readable page titles
const routeTitles: Record<string, string> = {
  '/lms/dashboard':     'Dashboard',
  '/lms/users':         'User Management',
  '/lms/students':      'Students',
  '/lms/subjects':      'Courses',
  '/lms/sessions':      'Sessions',
  '/lms/chat':          'Chat',
  '/lms/notifications': 'Notifications',
  '/lms/analytics':     'Analytics',
  '/lms/settings':      'Settings',
  '/lms/audit':         'Audit Logs',
  '/lms/account':       'Account',
  '/lms/payments':      'Payments',
  '/lms/my-payments':   'Payments',
};

function getPageTitle(pathname: string): string {
  // exact match first
  if (routeTitles[pathname]) return routeTitles[pathname];
  // subject detail: /lms/subjects/:id
  if (pathname.startsWith('/lms/subjects/')) return 'Subject Detail';
  return 'LMS';
}

// ─── Auth initializer ─────────────────────────────────────────
function AuthInitializer() {
  const { isAuthenticated, setAuth, clearAuth, setInitializing, isInitializing } = useAuthStore();
  const { setNotifications, addNotification } = useNotificationStore();
  const { setChatUnreadCount, incrementChatUnread } = useChatStore();
  const navigate = useNavigate();

  // Bootstrap auth + initial notifications on mount.
  // accessToken is memory-only (not persisted) so on page reload we always call /auth/refresh
  // first to get a fresh token from the httpOnly cookie, then fetch /auth/me.
  useEffect(() => {
    if (!isAuthenticated) {
      setInitializing(false);
      navigate('/lms/login', { replace: true });
      return;
    }
    (async () => {
      try {
        // Re-hydrate access token from the httpOnly refresh cookie on every page load.
        // This is safe: if the cookie is absent/expired the refresh call throws → catch → logout.
        const refreshRes = await axios.post<{ data: { accessToken: string } }>('/api/auth/refresh', {}, { withCredentials: true });
        const freshToken = refreshRes.data.data.accessToken;
        useAuthStore.getState().setAccessToken(freshToken);

        const meRes = await api.get<{ data: Parameters<typeof setAuth>[0] }>('/auth/me');
        const [notifRes, chatUnreadRes] = await Promise.all([
          api.get<{ data: { notifications: Notification[]; unreadCount: number } }>('/notifications'),
          api.get<{ data: { unread: number } }>('/chat/unread-total'),
        ]);
        setAuth(meRes.data.data, freshToken);
        setNotifications(notifRes.data.data.notifications, notifRes.data.data.unreadCount);
        setChatUnreadCount(chatUnreadRes.data.data.unread);
        reconnectSocket(); // connect socket with the fresh token now that auth is confirmed
      } catch {
        disconnectSocket();
        queryClient.clear();
        clearAuth();
        navigate('/lms/login', { replace: true });
      } finally {
        setInitializing(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Subscribe to real-time notifications once the user is authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    const socket = getSocket();
    socket.on('notification:new', (n: Notification) => {
      addNotification(n);
    });
    socket.on('chat:unread', () => {
      incrementChatUnread();
    });

    return () => {
      socket.off('notification:new');
      socket.off('chat:unread');
    };
  }, [isAuthenticated, addNotification, incrementChatUnread]);

  if (isInitializing) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <Spinner className="w-10 h-10" />
      </div>
    );
  }

  return null;
}

// ─── Top bar ─────────────────────────────────────────────────
function TopBar() {
  const { user } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const { chatUnreadCount } = useChatStore();
  const location = useLocation();
  const pageTitle = getPageTitle(location.pathname);

  if (!user) return null;

  return (
    <header className="h-14 border-b border-slate-200 flex items-center justify-between px-6 bg-white shrink-0">
      {/* Left: page title */}
      <h1 className="text-sm font-semibold text-slate-700 tracking-tight">{pageTitle}</h1>

      {/* Right: chat + bell + avatar */}
      <div className="flex items-center gap-1">
        <Link
          to="/lms/chat"
          className="relative p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="Messages"
        >
          <MessageSquare size={19} />
          {chatUnreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-medium">
              {chatUnreadCount > 9 ? '9+' : chatUnreadCount}
            </span>
          )}
        </Link>

        <Link
          to="/lms/notifications"
          className="relative p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="Notifications"
        >
          <Bell size={19} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-medium">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>

        <Link to="/lms/account" className="ml-2 rounded-full">
          <Avatar src={user.avatarUrl} name={fullName(user)} size="sm" />
        </Link>
      </div>
    </header>
  );
}

// ─── Layout ───────────────────────────────────────────────────
export function LMSLayout() {
  const { isInitializing } = useAuthStore();

  return (
    <>
      <AuthInitializer />
      <Toaster position="top-right" richColors />
      {!isInitializing && (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
          <LMSSidebar />
          <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
            <TopBar />
            <main className="flex-1 overflow-y-auto p-6">
              <Outlet />
            </main>
          </div>
        </div>
      )}
    </>
  );
}
