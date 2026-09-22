import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import SuperAdminPage from '../pages/SuperAdminPage';
import SetupPage from '../pages/SetupPage';
import ProtectedRoute from './ProtectedRoute';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Authentication Route */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected Super Admin Platform Routes */}
      <Route
        path="/super-admin/*"
        element={
          <ProtectedRoute requiredRole="SUPER_ADMIN">
            <SuperAdminPage />
          </ProtectedRoute>
        }
      />

      {/* Step 1 Diagnostic Page (Preserved) */}
      <Route path="/setup" element={<SetupPage />} />

      {/* Default / Catch-all Redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
