import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/shared/ProtectedRoute';
import AdminLayout from './components/layout/AdminLayout';
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import UsersPage from './pages/users/UsersPage';
import CoursesPage from './pages/courses/CoursesPage';
import CourseContentPage from './pages/courses/CourseContentPage';
import VideoLibraryPage from './pages/videos/VideoLibraryPage';
import ActivityBuilderPage from './pages/activities/ActivityBuilderPage';
import HomeworkPage from './pages/homework/HomeworkPage';
import PaymentsPage from './pages/payments/PaymentsPage';
import CertificatesPage from './pages/certificates/CertificatesPage';
import NotificationsPage from './pages/notifications/NotificationsPage';
import CategoriesPage from './pages/categories/CategoriesPage';
import SettingsPage from './pages/settings/SettingsPage';

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
        </BrowserRouter>
        <Toaster position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
