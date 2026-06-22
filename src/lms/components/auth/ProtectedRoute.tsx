import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import type { Role } from '../../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: Role[];
}

export function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { isAuthenticated, isInitializing, user } = useAuthStore();
  const location = useLocation();

  // Key invariant: AuthInitializer lives INSIDE LMSLayout (a child of this component).
  // We must render children so AuthInitializer can run and set isInitializing=false.
  // Only redirect to login after initialization completes and user is not authenticated.
  if (!isInitializing && !isAuthenticated) {
    return <Navigate to="/lms/login" state={{ from: location }} replace />;
  }

  // Role-based access — only enforce once we have user data
  if (!isInitializing && roles && user && !roles.includes(user.role)) {
    return <Navigate to="/lms/dashboard" replace />;
  }

  return <>{children}</>;
}
