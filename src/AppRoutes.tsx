import { Routes, Route, Outlet, Navigate } from 'react-router-dom';

// Public site
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import WhatsAppWidget from './components/WhatsAppWidget';
import Home from './pages/Home';
import About from './pages/About';
import Booking from './pages/Booking';
import Confirmation from './pages/Confirmation';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import FAQ from './pages/FAQ';

// LMS layout & auth
import { LMSLayout } from './lms/components/layout/LMSLayout';
import { ProtectedRoute } from './lms/components/auth/ProtectedRoute';

// LMS pages
import Login from './lms/pages/auth/Login';
import Dashboard from './lms/pages/dashboard/Dashboard';
import Sessions from './lms/pages/sessions/Sessions';
import Subjects from './lms/pages/subjects/Subjects';
import SubjectDetail from './lms/pages/subjects/SubjectDetail';
import Chat from './lms/pages/chat/Chat';
import Notifications from './lms/pages/notifications/Notifications';
import Users from './lms/pages/users/Users';
import Students from './lms/pages/students/Students';
import Account from './lms/pages/account/Account';
import Settings from './lms/pages/settings/Settings';
import AuditLogs from './lms/pages/audit/AuditLogs';
import Payments from './lms/pages/payments/Payments';
import MyPayments from './lms/pages/payments/MyPayments';
import QuranReader from './lms/pages/quran-reader/QuranReader';
import QaidaReader from './lms/pages/qaida/QaidaReader';
import IslamicLearning from './lms/pages/islamic/IslamicLearning';

function PublicShell() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />
      <WhatsAppWidget />
    </div>
  );
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* ── Public Marketing Site ─────────────────────────── */}
      <Route element={<PublicShell />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/book" element={<Booking />} />
        <Route path="/confirmation" element={<Confirmation />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/faq" element={<FAQ />} />
      </Route>

      {/* ── LMS Auth (no sidebar) ─────────────────────────── */}
      <Route path="/lms/login" element={<Login />} />

      {/* ── LMS App (protected, with sidebar) ─────────────── */}
      <Route
        path="/lms"
        element={
          <ProtectedRoute>
            <LMSLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/lms/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="subjects" element={<Subjects />} />
        <Route path="subjects/:id" element={<SubjectDetail />} />
        <Route path="sessions" element={<Sessions />} />
        <Route path="chat" element={<Chat />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="account" element={<Account />} />
        <Route path="students" element={<ProtectedRoute roles={['ADMIN', 'TEACHER']}><Students /></ProtectedRoute>} />
        <Route path="users" element={<ProtectedRoute roles={['ADMIN']}><Users /></ProtectedRoute>} />
        <Route path="payments" element={<ProtectedRoute roles={['ADMIN']}><Payments /></ProtectedRoute>} />
        <Route path="my-payments" element={<MyPayments />} />
        <Route path="quran-reader" element={<QuranReader />} />
        <Route path="quran-reader/:studentId" element={<ProtectedRoute roles={['ADMIN', 'TEACHER']}><QuranReader /></ProtectedRoute>} />
        <Route path="noorani-qaida" element={<QaidaReader />} />
        <Route path="noorani-qaida/:studentId" element={<ProtectedRoute roles={['ADMIN', 'TEACHER']}><QaidaReader /></ProtectedRoute>} />
        <Route path="islamic" element={<IslamicLearning />} />
        <Route path="settings" element={<ProtectedRoute roles={['ADMIN']}><Settings /></ProtectedRoute>} />
        <Route path="audit" element={<ProtectedRoute roles={['ADMIN']}><AuditLogs /></ProtectedRoute>} />
      </Route>

      {/* ── 404 ────────────────────────────────────────────── */}
      <Route path="*" element={
        <div className="min-h-screen flex items-center justify-center text-center">
          <div>
            <h1 className="text-6xl font-bold text-slate-200">404</h1>
            <p className="text-slate-600 mt-2">Page not found</p>
            <a href="/" className="mt-4 inline-block text-brand-500 hover:underline">Go home</a>
          </div>
        </div>
      } />
    </Routes>
  );
}
