import { lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/shared/ProtectedRoute';
import AdminLayout from './components/layout/AdminLayout';
import LoginPage from './pages/auth/LoginPage';
import Spinner from './components/ui/Spinner';

const DashboardPage       = lazy(() => import('./pages/dashboard/DashboardPage'));
const UsersPage           = lazy(() => import('./pages/users/UsersPage'));
const CoursesPage         = lazy(() => import('./pages/courses/CoursesPage'));
const CourseContentPage   = lazy(() => import('./pages/courses/CourseContentPage'));
const VideoLibraryPage    = lazy(() => import('./pages/videos/VideoLibraryPage'));
const ActivityBuilderPage = lazy(() => import('./pages/activities/ActivityBuilderPage'));
const HomeworkPage        = lazy(() => import('./pages/homework/HomeworkPage'));
const PaymentsPage        = lazy(() => import('./pages/payments/PaymentsPage'));
const CertificatesPage    = lazy(() => import('./pages/certificates/CertificatesPage'));
const NotificationsPage   = lazy(() => import('./pages/notifications/NotificationsPage'));
const CategoriesPage      = lazy(() => import('./pages/categories/CategoriesPage'));
const SettingsPage        = lazy(() => import('./pages/settings/SettingsPage'));

const pageFallback = (
  <div className="flex h-full items-center justify-center">
    <Spinner />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60 * 1000, retry: 1 },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter future={{ v7_startTransition: true }}>
          <Suspense fallback={pageFallback}>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected admin routes */}
            <Route
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="courses" element={<CoursesPage />} />
              <Route path="course-content/:uuid" element={<CourseContentPage />} />
              <Route path="videos" element={<VideoLibraryPage />} />
              <Route path="activities" element={<ActivityBuilderPage />} />
              <Route path="homework" element={<HomeworkPage />} />
              <Route path="payments" element={<PaymentsPage />} />
              <Route path="certificates" element={<CertificatesPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="categories" element={<CategoriesPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
        </BrowserRouter>
        <Toaster position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
