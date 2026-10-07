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
import DepartmentsPage from '../pages/hospital-admin/DepartmentsPage';
import StaffPage from '../pages/hospital-admin/StaffPage';
import ClinicalMastersPage from '../pages/hospital-admin/ClinicalMastersPage';
import HospitalSettingsPage from '../pages/hospital-admin/HospitalSettingsPage';
import AppointmentsPage from '../pages/hospital-admin/AppointmentsPage';
import DoctorRosterPage from '../pages/hospital-admin/DoctorRosterPage';
import EncountersPage from '../pages/hospital-admin/EncountersPage';
import ConsultationPage from '../pages/hospital-admin/ConsultationPage';
import EecpDashboardPage from '../pages/hospital-admin/EecpDashboardPage';
import EecpCourseDetailsPage from '../pages/hospital-admin/EecpCourseDetailsPage';
import EecpSessionWorkspacePage from '../pages/hospital-admin/EecpSessionWorkspacePage';
import PharmacyDashboardPage from '../pages/hospital-admin/PharmacyDashboardPage';
import PharmacyInventoryPage from '../pages/hospital-admin/PharmacyInventoryPage';
import PharmacyDispensingWorkspacePage from '../pages/hospital-admin/PharmacyDispensingWorkspacePage';

const HOSPITAL_STAFF_ROLES = [
  'HOSPITAL_ADMIN',
  'RECEPTIONIST',
  'DOCTOR',
  'NURSE',
  'PHARMACIST',
  'LAB_STAFF',
];

const PATIENT_WRITE_ROLES = ['HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE'];
const STAFF_VIEW_ROLES = ['HOSPITAL_ADMIN', 'DOCTOR', 'RECEPTIONIST'];
const APPOINTMENT_VIEW_ROLES = ['HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE'];
const ROSTER_VIEW_ROLES = ['HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE'];

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

        {/* Phase 6: Appointments, Doctor Rostering & Slot Management */}
        <Route
          path="appointments"
          element={
            <ProtectedRoute allowedRoles={APPOINTMENT_VIEW_ROLES}>
              <AppointmentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="doctor-roster"
          element={
            <ProtectedRoute allowedRoles={ROSTER_VIEW_ROLES}>
              <DoctorRosterPage />
            </ProtectedRoute>
          }
        />

        {/* Phase 7A: Clinical Encounters & Doctor Consultation */}
        <Route
          path="encounters"
          element={
            <ProtectedRoute allowedRoles={['HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST']}>
              <EncountersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="consultation/:id"
          element={
            <ProtectedRoute allowedRoles={['HOSPITAL_ADMIN', 'DOCTOR', 'NURSE']}>
              <ConsultationPage />
            </ProtectedRoute>
          }
        />

        {/* Phase 7C: EECP Clinical Workflow */}
        <Route
          path="eecp"
          element={
            <ProtectedRoute allowedRoles={['HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST']}>
              <EecpDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="eecp/courses/:id"
          element={
            <ProtectedRoute allowedRoles={['HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST']}>
              <EecpCourseDetailsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="eecp/sessions/:id"
          element={
            <ProtectedRoute allowedRoles={['HOSPITAL_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST']}>
              <EecpSessionWorkspacePage />
            </ProtectedRoute>
          }
        />

        {/* Phase 8A: Pharmacy Inventory & Prescription Dispensing */}
        <Route
          path="pharmacy"
          element={
            <ProtectedRoute allowedRoles={['HOSPITAL_ADMIN', 'PHARMACIST', 'DOCTOR', 'NURSE']}>
              <PharmacyDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="pharmacy/inventory"
          element={
            <ProtectedRoute allowedRoles={['HOSPITAL_ADMIN', 'PHARMACIST', 'DOCTOR', 'NURSE']}>
              <PharmacyInventoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="pharmacy/dispense/:prescriptionId"
          element={
            <ProtectedRoute allowedRoles={['HOSPITAL_ADMIN', 'PHARMACIST', 'DOCTOR', 'NURSE']}>
              <PharmacyDispensingWorkspacePage />
            </ProtectedRoute>
          }
        />

        {/* Patients Management (Module 4) */}
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

        {/* Phase 5: Hospital Administration & Configuration */}
        {/* Module 1: Departments */}
        <Route path="departments" element={<DepartmentsPage />} />

        {/* Module 2: Doctors & Staff */}
        <Route
          path="staff"
          element={
            <ProtectedRoute allowedRoles={STAFF_VIEW_ROLES}>
              <StaffPage />
            </ProtectedRoute>
          }
        />

        {/* Module 3: Clinical Masters */}
        <Route path="clinical-masters" element={<ClinicalMastersPage />} />

        {/* Modules 4, 5, 6: Hospital Settings & Configuration */}
        <Route
          path="settings"
          element={
            <ProtectedRoute allowedRoles={['HOSPITAL_ADMIN']}>
              <HospitalSettingsPage />
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
