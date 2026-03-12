import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

// Auth pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';

// Layout
import AppLayout from './components/layout/AppLayout';

// Shared pages
import DashboardPage from './pages/shared/DashboardPage';
import ProfilePage from './pages/shared/ProfilePage';
import SubjectsPage from './pages/shared/SubjectsPage';
import SubjectDetailPage from './pages/shared/SubjectDetailPage';
import ProjectDetailPage from './pages/shared/ProjectDetailPage';
import NotificationsPage from './pages/shared/NotificationsPage';
import MessagesPage from './pages/shared/MessagesPage';

import GroupPage from './pages/student/GroupPage';

// Student pages
import MyApplicationsPage from './pages/student/MyApplicationsPage';
import MyProjectPage from './pages/student/MyProjectPage';

// Supervisor pages
import MySupervisorSubjectsPage from './pages/supervisor/MySupervisorSubjectsPage';
import SupervisorProjectsPage from './pages/supervisor/SupervisorProjectsPage';
import ApplicationsReviewPage from './pages/supervisor/ApplicationsReviewPage';

// Admin pages
import UsersManagementPage from './pages/admin/UsersManagementPage';
import AdminSubjectsPage from './pages/admin/AdminSubjectsPage';
import AdminProjectsPage from './pages/admin/AdminProjectsPage';

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login"            element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register"         element={<PublicRoute><RegisterPage /></PublicRoute>} />
      <Route path="/forgot-password"  element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />

      {/* Protected */}
      <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"     element={<DashboardPage />} />
        <Route path="profile"       element={<ProfilePage />} />
        <Route path="subjects"      element={<SubjectsPage />} />
        <Route path="subjects/:id"  element={<SubjectDetailPage />} />
        <Route path="projects/:id"  element={<ProjectDetailPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="messages"      element={<MessagesPage />} />
        <Route path="messages/:projectId" element={<MessagesPage />} />

        {/* Student */}
        <Route path="group" element={<ProtectedRoute roles={['ROLE_STUDENT']}><GroupPage /></ProtectedRoute>} />
        <Route path="my-applications" element={<ProtectedRoute roles={['ROLE_STUDENT']}><MyApplicationsPage /></ProtectedRoute>} />
        <Route path="my-project"      element={<ProtectedRoute roles={['ROLE_STUDENT']}><MyProjectPage /></ProtectedRoute>} />

        {/* Supervisor */}
        <Route path="my-subjects"         element={<ProtectedRoute roles={['ROLE_SUPERVISOR']}><MySupervisorSubjectsPage /></ProtectedRoute>} />
        <Route path="supervisor-projects" element={<ProtectedRoute roles={['ROLE_SUPERVISOR']}><SupervisorProjectsPage /></ProtectedRoute>} />
        <Route path="applications-review" element={<ProtectedRoute roles={['ROLE_SUPERVISOR']}><ApplicationsReviewPage /></ProtectedRoute>} />

        {/* Admin */}
        <Route path="users"          element={<ProtectedRoute roles={['ROLE_ADMIN']}><UsersManagementPage /></ProtectedRoute>} />
        <Route path="admin-subjects" element={<ProtectedRoute roles={['ROLE_ADMIN']}><AdminSubjectsPage /></ProtectedRoute>} />
        <Route path="admin-projects" element={<ProtectedRoute roles={['ROLE_ADMIN']}><AdminProjectsPage /></ProtectedRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: { borderRadius: '10px', fontFamily: 'Inter', fontSize: '14px' },
            success: { style: { background: '#065f46', color: 'white' } },
            error:   { style: { background: '#991b1b', color: 'white' } }
          }}
        />
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
