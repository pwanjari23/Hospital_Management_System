import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import SuperAdminLayout from '../layouts/SuperAdminLayout';
import SuperAdminDashboardPage from '../pages/SuperAdminDashboardPage';
import HospitalsPage from '../pages/HospitalsPage';
import SetupPage from '../pages/SetupPage';
import ProtectedRoute from './ProtectedRoute';

// Hospital Admin / Staff Portal Imports
import HospitalAdminLayout from '../layouts/HospitalAdminLayout';
import HospitalAdminDashboardPage from '../pages/hospital-admin/HospitalAdminDashboardPage';
import PatientsPage from '../pages/hospital-admin/PatientsPage';
import PatientFormPage from '../pages/hospital-admin/PatientFormPage';
import PatientDetailsPage from '../pages/hospital-admin/PatientDetailsPage';

const HOSPITAL_STAFF_ROLES = [
  'HOSPITAL_ADMIN',
  'RECEPTIONIST',
  'DOCTOR',
  'NURSE',
  'PHARMACIST',
  'LAB_STAFF',
];

const PATIENT_WRITE_ROLES = ['HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE'];

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Authentication Route */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected Super Admin Platform Routes */}
      <Route
        path="/super-admin"
        element={
          <ProtectedRoute requiredRole="SUPER_ADMIN">
            <SuperAdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/super-admin/dashboard" replace />} />
        <Route path="dashboard" element={<SuperAdminDashboardPage />} />
        <Route path="hospitals" element={<HospitalsPage />} />
      </Route>

      {/* Protected Hospital Admin & Staff Routes */}
      <Route
        path="/hospital-admin"
        element={
          <ProtectedRoute allowedRoles={HOSPITAL_STAFF_ROLES}>
            <HospitalAdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/hospital-admin/dashboard" replace />} />
        <Route path="dashboard" element={<HospitalAdminDashboardPage />} />
        <Route path="patients" element={<PatientsPage />} />
        <Route
          path="patients/new"
          element={
            <ProtectedRoute allowedRoles={PATIENT_WRITE_ROLES}>
              <PatientFormPage />
            </ProtectedRoute>
          }
        />
        <Route path="patients/:id" element={<PatientDetailsPage />} />
        <Route
          path="patients/:id/edit"
          element={
            <ProtectedRoute allowedRoles={PATIENT_WRITE_ROLES}>
              <PatientFormPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Step 1 Diagnostic Page (Preserved) */}
      <Route path="/setup" element={<SetupPage />} />

      {/* Default / Catch-all Redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
