import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import './lib/firebase';
import { AuthProvider, useAuth } from './lib/auth';
import { ConfirmModalProvider } from './components/ConfirmModal';
import { ThemeProvider } from './lib/theme';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { CustomerHome } from './pages/customer/CustomerHome';
import { BookFlow } from './pages/customer/BookFlow';
import { StaffHome } from './pages/staff/StaffHome';
import { AdminHome } from './pages/admin/AdminHome';
import { AdminServices } from './pages/admin/AdminServices';
import { AdminStaff } from './pages/admin/AdminStaff';
import { AdminCalendar } from './pages/admin/AdminCalendar';
import { NotFound } from './pages/NotFound';
import { ServerError } from './pages/ServerError';
import { Tutorial } from './components/Tutorial';
import { AppShell } from './components/AppShell';
import type { Role } from './lib/types';

const qc = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
});

function RequireAuth({ children, roles }: { children: React.ReactNode; roles?: Role[] }) {
  const { user, profile, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center text-ink-500">
        <span className="text-sm">Loading…</span>
      </div>
    );
  }
  if (!user || !profile) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(profile.role)) {
    // Redirect each role to their home
    if (profile.role === 'customer') return <Navigate to="/app" replace />;
    if (profile.role === 'staff') return <Navigate to="/staff" replace />;
    if (profile.role === 'admin') return <Navigate to="/admin" replace />;
  }
  return <>{children}</>;
}

function RoleRouter() {
  const { profile } = useAuth();
  if (!profile) return <Navigate to="/login" replace />;
  if (profile.role === 'staff') return <Navigate to="/staff" replace />;
  if (profile.role === 'admin') return <Navigate to="/admin" replace />;
  return <Navigate to="/app" replace />;
}

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={qc}>
        <AuthProvider>
          <ConfirmModalProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Landing />} errorElement={<ServerError />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/home" element={<RoleRouter />} />

                <Route
                  path="/app"
                  element={
                    <RequireAuth roles={['customer']}>
                      <AppShell />
                    </RequireAuth>
                  }
                >
                  <Route index element={<CustomerHome />} />
                  <Route path="book" element={<BookFlow />} />
                </Route>

                <Route
                  path="/staff"
                  element={
                    <RequireAuth roles={['staff']}>
                      <AppShell />
                    </RequireAuth>
                  }
                >
                  <Route index element={<StaffHome />} />
                </Route>

                <Route
                  path="/admin"
                  element={
                    <RequireAuth roles={['admin']}>
                      <AppShell />
                    </RequireAuth>
                  }
                >
                  <Route index element={<AdminHome />} />
                  <Route path="services" element={<AdminServices />} />
                  <Route path="staff" element={<AdminStaff />} />
                  <Route path="calendar" element={<AdminCalendar />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
              <Tutorial />
            </BrowserRouter>
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  border: '1px solid #cfccc6',
                  borderRadius: '16px',
                  background: '#fff',
                  color: '#1a1814',
                  fontWeight: 500,
                  boxShadow: '0 4px 16px -4px rgba(26, 60, 44, 0.08)',
                },
              }}
            />
          </ConfirmModalProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
