import sequelize from '../config/database.js';
import Hospital from './Hospital.js';
import User from './User.js';
import Role from './Role.js';
import Permission from './Permission.js';
import RolePermission from './RolePermission.js';
import UserRole from './UserRole.js';
import HospitalSetting from './HospitalSetting.js';
import Patient from './Patient.js';
import HospitalSequence from './HospitalSequence.js';
import Department from './Department.js';
import Medicine from './Medicine.js';
import Investigation from './Investigation.js';
import Treatment from './Treatment.js';
import EecpPackage from './EecpPackage.js';
import PaymentMode from './PaymentMode.js';
import DoctorSchedule from './DoctorSchedule.js';
import DoctorLeave from './DoctorLeave.js';
import Appointment from './Appointment.js';
import Encounter from './Encounter.js';
import Vital from './Vital.js';
import EncounterDiagnosis from './EncounterDiagnosis.js';
import Prescription from './Prescription.js';
import PrescriptionItem from './PrescriptionItem.js';
import InvestigationOrder from './InvestigationOrder.js';
import EecpAssessment from './EecpAssessment.js';
import EecpTreatmentCourse from './EecpTreatmentCourse.js';
import EecpSession from './EecpSession.js';
import EecpSessionReading from './EecpSessionReading.js';
import MedicineBatch from './MedicineBatch.js';
import PharmacyStockTransaction from './PharmacyStockTransaction.js';
import PrescriptionDispensing from './PrescriptionDispensing.js';
import PrescriptionDispensingItem from './PrescriptionDispensingItem.js';
import InvestigationSample from './InvestigationSample.js';
import InvestigationResult from './InvestigationResult.js';
import BillingService from './BillingService.js';
import Invoice from './Invoice.js';
import InvoiceItem from './InvoiceItem.js';
import Payment from './Payment.js';
import Receipt from './Receipt.js';
import Ward from './Ward.js';
import Bed from './Bed.js';
import IpdAdmission from './IpdAdmission.js';
import IpdBedTransfer from './IpdBedTransfer.js';
import IpdProgressNote from './IpdProgressNote.js';
import IpdNursingNote from './IpdNursingNote.js';
import DischargeSummary from './DischargeSummary.js';
import DischargeMedication from './DischargeMedication.js';
import Notification from './Notification.js';

// ==========================================
// Centralized Model Associations
// ==========================================

// 1. Hospital <-> User (1:N)
Hospital.hasMany(User, {
  foreignKey: 'hospitalId',
  as: 'users',
  onDelete: 'RESTRICT',
});
User.belongsTo(Hospital, {
  foreignKey: 'hospitalId',
  as: 'hospital',
});

// 2. Hospital <-> HospitalSetting (1:N)
Hospital.hasMany(HospitalSetting, {
  foreignKey: 'hospitalId',
  as: 'settings',
  onDelete: 'RESTRICT',
});
HospitalSetting.belongsTo(Hospital, {
  foreignKey: 'hospitalId',
  as: 'hospital',
});

// 3. User <-> Role (M:N through UserRole)
User.belongsToMany(Role, {
  through: UserRole,
  foreignKey: 'userId',
  otherKey: 'roleId',
  as: 'roles',
});
Role.belongsToMany(User, {
  through: UserRole,
  foreignKey: 'roleId',
  otherKey: 'userId',
  as: 'users',
});

// Direct associations for UserRole junction
User.hasMany(UserRole, { foreignKey: 'userId', as: 'userRoles' });
UserRole.belongsTo(User, { foreignKey: 'userId', as: 'user' });
Role.hasMany(UserRole, { foreignKey: 'roleId', as: 'userRoles' });
UserRole.belongsTo(Role, { foreignKey: 'roleId', as: 'role' });

// 4. Role <-> Permission (M:N through RolePermission)
Role.belongsToMany(Permission, {
  through: RolePermission,
  foreignKey: 'roleId',
  otherKey: 'permissionId',
  as: 'permissions',
});
Permission.belongsToMany(Role, {
  through: RolePermission,
  foreignKey: 'permissionId',
  otherKey: 'roleId',
  as: 'roles',
});

// Direct associations for RolePermission junction
Role.hasMany(RolePermission, { foreignKey: 'roleId', as: 'rolePermissions' });
RolePermission.belongsTo(Role, { foreignKey: 'roleId', as: 'role' });
Permission.hasMany(RolePermission, { foreignKey: 'permissionId', as: 'rolePermissions' });

// 5. Hospital <-> Patient (1:N)
Hospital.hasMany(Patient, {
  foreignKey: 'hospitalId',
  as: 'patients',
  onDelete: 'RESTRICT',
});
Patient.belongsTo(Hospital, {
  foreignKey: 'hospitalId',
  as: 'hospital',
});

// 6. Hospital <-> HospitalSequence (1:N)
Hospital.hasMany(HospitalSequence, {
  foreignKey: 'hospitalId',
  as: 'sequences',
  onDelete: 'CASCADE',
});
HospitalSequence.belongsTo(Hospital, {
  foreignKey: 'hospitalId',
  as: 'hospital',
});

// 7. Hospital <-> Department (1:N)
Hospital.hasMany(Department, {
  foreignKey: 'hospitalId',
  as: 'departments',
  onDelete: 'RESTRICT',
});
Department.belongsTo(Hospital, {
  foreignKey: 'hospitalId',
  as: 'hospital',
});

// 8. Department <-> User / Staff (1:N)
Department.hasMany(User, {
  foreignKey: 'departmentId',
  as: 'staff',
  onDelete: 'SET NULL',
});
User.belongsTo(Department, {
  foreignKey: 'departmentId',
  as: 'department',
});

// 9. Department <-> Investigation (1:N)
Department.hasMany(Investigation, {
  foreignKey: 'departmentId',
  as: 'investigations',
  onDelete: 'SET NULL',
});
Investigation.belongsTo(Department, {
  foreignKey: 'departmentId',
  as: 'department',
});

// 10. Department <-> Treatment (1:N)
Department.hasMany(Treatment, {
  foreignKey: 'departmentId',
  as: 'treatments',
  onDelete: 'SET NULL',
});
Treatment.belongsTo(Department, {
  foreignKey: 'departmentId',
  as: 'department',
});

// 11. Hospital <-> Clinical Masters (1:N)
Hospital.hasMany(Medicine, {
  foreignKey: 'hospitalId',
  as: 'medicines',
  onDelete: 'RESTRICT',
});
Medicine.belongsTo(Hospital, {
  foreignKey: 'hospitalId',
  as: 'hospital',
});

Hospital.hasMany(Investigation, {
  foreignKey: 'hospitalId',
  as: 'investigations',
  onDelete: 'RESTRICT',
});
Investigation.belongsTo(Hospital, {
  foreignKey: 'hospitalId',
  as: 'hospital',
});

Hospital.hasMany(Treatment, {
  foreignKey: 'hospitalId',
  as: 'treatments',
  onDelete: 'RESTRICT',
});
Treatment.belongsTo(Hospital, {
  foreignKey: 'hospitalId',
  as: 'hospital',
});

Hospital.hasMany(EecpPackage, {
  foreignKey: 'hospitalId',
  as: 'eecpPackages',
  onDelete: 'RESTRICT',
});
EecpPackage.belongsTo(Hospital, {
  foreignKey: 'hospitalId',
  as: 'hospital',
});

Hospital.hasMany(PaymentMode, {
  foreignKey: 'hospitalId',
  as: 'paymentModes',
  onDelete: 'RESTRICT',
});
PaymentMode.belongsTo(Hospital, {
  foreignKey: 'hospitalId',
  as: 'hospital',
});

// 12. DoctorSchedule Associations
Hospital.hasMany(DoctorSchedule, {
  foreignKey: 'hospitalId',
  as: 'doctorSchedules',
  onDelete: 'RESTRICT',
});
DoctorSchedule.belongsTo(Hospital, {
  foreignKey: 'hospitalId',
  as: 'hospital',
});

User.hasMany(DoctorSchedule, {
  foreignKey: 'doctorId',
  as: 'schedules',
  onDelete: 'CASCADE',
});
DoctorSchedule.belongsTo(User, {
  foreignKey: 'doctorId',
  as: 'doctor',
});

Department.hasMany(DoctorSchedule, {
  foreignKey: 'departmentId',
  as: 'schedules',
  onDelete: 'SET NULL',
});
DoctorSchedule.belongsTo(Department, {
  foreignKey: 'departmentId',
  as: 'department',
});

// 13. DoctorLeave Associations
Hospital.hasMany(DoctorLeave, {
  foreignKey: 'hospitalId',
  as: 'doctorLeaves',
  onDelete: 'RESTRICT',
});
DoctorLeave.belongsTo(Hospital, {
  foreignKey: 'hospitalId',
  as: 'hospital',
});

User.hasMany(DoctorLeave, {
  foreignKey: 'doctorId',
  as: 'leaves',
  onDelete: 'CASCADE',
});
DoctorLeave.belongsTo(User, {
  foreignKey: 'doctorId',
  as: 'doctor',
});

// 14. Appointment Associations
Hospital.hasMany(Appointment, {
  foreignKey: 'hospitalId',
  as: 'appointments',
  onDelete: 'RESTRICT',
});
Appointment.belongsTo(Hospital, {
  foreignKey: 'hospitalId',
  as: 'hospital',
});

Patient.hasMany(Appointment, {
  foreignKey: 'patientId',
  as: 'appointments',
  onDelete: 'RESTRICT',
});
Appointment.belongsTo(Patient, {
  foreignKey: 'patientId',
  as: 'patient',
});

User.hasMany(Appointment, {
  foreignKey: 'doctorId',
  as: 'doctorAppointments',
  onDelete: 'RESTRICT',
});
Appointment.belongsTo(User, {
  foreignKey: 'doctorId',
  as: 'doctor',
});

Department.hasMany(Appointment, {
  foreignKey: 'departmentId',
  as: 'appointments',
  onDelete: 'SET NULL',
});
Appointment.belongsTo(Department, {
  foreignKey: 'departmentId',
  as: 'department',
});

User.hasMany(Appointment, {
  foreignKey: 'bookedBy',
  as: 'bookedAppointments',
  onDelete: 'SET NULL',
});
Appointment.belongsTo(User, {
  foreignKey: 'bookedBy',
  as: 'booker',
});

// 15. Encounter Associations
Hospital.hasMany(Encounter, {
  foreignKey: 'hospitalId',
  as: 'encounters',
  onDelete: 'RESTRICT',
});
Encounter.belongsTo(Hospital, {
  foreignKey: 'hospitalId',
  as: 'hospital',
});

Patient.hasMany(Encounter, {
  foreignKey: 'patientId',
  as: 'encounters',
  onDelete: 'RESTRICT',
});
Encounter.belongsTo(Patient, {
  foreignKey: 'patientId',
  as: 'patient',
});

Appointment.hasOne(Encounter, {
  foreignKey: 'appointmentId',
  as: 'encounter',
  onDelete: 'SET NULL',
});
Encounter.belongsTo(Appointment, {
  foreignKey: 'appointmentId',
  as: 'appointment',
});

User.hasMany(Encounter, {
  foreignKey: 'doctorId',
  as: 'doctorEncounters',
  onDelete: 'RESTRICT',
});
Encounter.belongsTo(User, {
  foreignKey: 'doctorId',
  as: 'doctor',
});

Department.hasMany(Encounter, {
  foreignKey: 'departmentId',
  as: 'encounters',
  onDelete: 'SET NULL',
});
Encounter.belongsTo(Department, {
  foreignKey: 'departmentId',
  as: 'department',
});

User.hasMany(Encounter, {
  foreignKey: 'createdBy',
  as: 'createdEncounters',
  onDelete: 'SET NULL',
});
Encounter.belongsTo(User, {
  foreignKey: 'createdBy',
  as: 'creator',
});

// 16. Vital Associations
Hospital.hasMany(Vital, {
  foreignKey: 'hospitalId',
  as: 'vitals',
  onDelete: 'RESTRICT',
});
Vital.belongsTo(Hospital, {
  foreignKey: 'hospitalId',
  as: 'hospital',
});

Encounter.hasMany(Vital, {
  foreignKey: 'encounterId',
  as: 'vitals',
  onDelete: 'CASCADE',
});
Vital.belongsTo(Encounter, {
  foreignKey: 'encounterId',
  as: 'encounter',
});

Patient.hasMany(Vital, {
  foreignKey: 'patientId',
  as: 'vitals',
  onDelete: 'RESTRICT',
});
Vital.belongsTo(Patient, {
  foreignKey: 'patientId',
  as: 'patient',
});

User.hasMany(Vital, {
  foreignKey: 'recordedBy',
  as: 'recordedVitals',
  onDelete: 'SET NULL',
});
Vital.belongsTo(User, {
  foreignKey: 'recordedBy',
  as: 'recorder',
});

// 17. EncounterDiagnosis Associations
Hospital.hasMany(EncounterDiagnosis, {
  foreignKey: 'hospitalId',
  as: 'encounterDiagnoses',
  onDelete: 'RESTRICT',
});
EncounterDiagnosis.belongsTo(Hospital, {
  foreignKey: 'hospitalId',
  as: 'hospital',
});

Encounter.hasMany(EncounterDiagnosis, {
  foreignKey: 'encounterId',
  as: 'diagnoses',
  onDelete: 'CASCADE',
});
EncounterDiagnosis.belongsTo(Encounter, {
  foreignKey: 'encounterId',
  as: 'encounter',
});

User.hasMany(EncounterDiagnosis, {
  foreignKey: 'createdBy',
  as: 'diagnosesCreated',
  onDelete: 'SET NULL',
});
EncounterDiagnosis.belongsTo(User, {
  foreignKey: 'createdBy',
  as: 'creator',
});

// 18. Prescription Associations
Hospital.hasMany(Prescription, {
  foreignKey: 'hospitalId',
  as: 'prescriptions',
  onDelete: 'RESTRICT',
});
Prescription.belongsTo(Hospital, {
  foreignKey: 'hospitalId',
  as: 'hospital',
});

Encounter.hasMany(Prescription, {
  foreignKey: 'encounterId',
  as: 'prescriptions',
  onDelete: 'RESTRICT',
});
Prescription.belongsTo(Encounter, {
  foreignKey: 'encounterId',
  as: 'encounter',
});

Patient.hasMany(Prescription, {
  foreignKey: 'patientId',
  as: 'prescriptions',
  onDelete: 'RESTRICT',
});
Prescription.belongsTo(Patient, {
  foreignKey: 'patientId',
  as: 'patient',
});

User.hasMany(Prescription, {
  foreignKey: 'doctorId',
  as: 'prescriptionsWritten',
  onDelete: 'RESTRICT',
});
Prescription.belongsTo(User, {
  foreignKey: 'doctorId',
  as: 'doctor',
});

User.hasMany(Prescription, {
  foreignKey: 'createdBy',
  as: 'prescriptionsCreated',
  onDelete: 'SET NULL',
});
Prescription.belongsTo(User, {
  foreignKey: 'createdBy',
  as: 'creator',
});

Prescription.hasMany(PrescriptionItem, {
  foreignKey: 'prescriptionId',
  as: 'items',
  onDelete: 'CASCADE',
});
PrescriptionItem.belongsTo(Prescription, {
  foreignKey: 'prescriptionId',
  as: 'prescription',
});

Medicine.hasMany(PrescriptionItem, {
  foreignKey: 'medicineId',
  as: 'prescriptionItems',
  onDelete: 'RESTRICT',
});
PrescriptionItem.belongsTo(Medicine, {
  foreignKey: 'medicineId',
  as: 'medicine',
});

Hospital.hasMany(PrescriptionItem, {
  foreignKey: 'hospitalId',
  as: 'prescriptionItems',
  onDelete: 'RESTRICT',
});
PrescriptionItem.belongsTo(Hospital, {
  foreignKey: 'hospitalId',
  as: 'hospital',
});

// 19. InvestigationOrder Associations
Hospital.hasMany(InvestigationOrder, {
  foreignKey: 'hospitalId',
  as: 'investigationOrders',
  onDelete: 'RESTRICT',
});
InvestigationOrder.belongsTo(Hospital, {
  foreignKey: 'hospitalId',
  as: 'hospital',
});

Encounter.hasMany(InvestigationOrder, {
  foreignKey: 'encounterId',
  as: 'investigationOrders',
  onDelete: 'RESTRICT',
});
InvestigationOrder.belongsTo(Encounter, {
  foreignKey: 'encounterId',
  as: 'encounter',
});

Patient.hasMany(InvestigationOrder, {
  foreignKey: 'patientId',
  as: 'investigationOrders',
  onDelete: 'RESTRICT',
});
InvestigationOrder.belongsTo(Patient, {
  foreignKey: 'patientId',
  as: 'patient',
});

User.hasMany(InvestigationOrder, {
  foreignKey: 'doctorId',
  as: 'investigationOrdersWritten',
  onDelete: 'RESTRICT',
});
InvestigationOrder.belongsTo(User, {
  foreignKey: 'doctorId',
  as: 'doctor',
});

Investigation.hasMany(InvestigationOrder, {
  foreignKey: 'investigationId',
  as: 'orders',
  onDelete: 'RESTRICT',
});
InvestigationOrder.belongsTo(Investigation, {
  foreignKey: 'investigationId',
  as: 'investigation',
});

User.hasMany(InvestigationOrder, {
  foreignKey: 'createdBy',
  as: 'investigationOrdersCreated',
  onDelete: 'SET NULL',
});
InvestigationOrder.belongsTo(User, {
  foreignKey: 'createdBy',
  as: 'creator',
});

// ==========================================
// Phase 7C: EECP Clinical Workflow Associations
// ==========================================

// Hospital <-> EecpAssessment / Course / Session / Reading (1:N)
Hospital.hasMany(EecpAssessment, {
  foreignKey: 'hospitalId',
  as: 'eecpAssessments',
  onDelete: 'RESTRICT',
});
EecpAssessment.belongsTo(Hospital, {
  foreignKey: 'hospitalId',
  as: 'hospital',
});

Hospital.hasMany(EecpTreatmentCourse, {
  foreignKey: 'hospitalId',
  as: 'eecpCourses',
  onDelete: 'RESTRICT',
});
EecpTreatmentCourse.belongsTo(Hospital, {
  foreignKey: 'hospitalId',
  as: 'hospital',
});

Hospital.hasMany(EecpSession, {
  foreignKey: 'hospitalId',
  as: 'eecpSessions',
  onDelete: 'RESTRICT',
});
EecpSession.belongsTo(Hospital, {
  foreignKey: 'hospitalId',
  as: 'hospital',
});

Hospital.hasMany(EecpSessionReading, {
  foreignKey: 'hospitalId',
  as: 'eecpSessionReadings',
  onDelete: 'RESTRICT',
});
EecpSessionReading.belongsTo(Hospital, {
  foreignKey: 'hospitalId',
  as: 'hospital',
});

// Encounter <-> EecpAssessment (1:1)
Encounter.hasOne(EecpAssessment, {
  foreignKey: 'encounterId',
  as: 'eecpAssessment',
  onDelete: 'RESTRICT',
});
EecpAssessment.belongsTo(Encounter, {
  foreignKey: 'encounterId',
  as: 'encounter',
});

// Encounter <-> EecpTreatmentCourse (1:N)
Encounter.hasMany(EecpTreatmentCourse, {
  foreignKey: 'initiatingEncounterId',
  as: 'initiatedEecpCourses',
  onDelete: 'SET NULL',
});
EecpTreatmentCourse.belongsTo(Encounter, {
  foreignKey: 'initiatingEncounterId',
  as: 'initiatingEncounter',
});

// Encounter <-> EecpSession (1:N)
Encounter.hasMany(EecpSession, {
  foreignKey: 'encounterId',
  as: 'eecpSessions',
  onDelete: 'SET NULL',
});
EecpSession.belongsTo(Encounter, {
  foreignKey: 'encounterId',
  as: 'encounter',
});

// Patient <-> EecpAssessment / Course / Session (1:N)
Patient.hasMany(EecpAssessment, {
  foreignKey: 'patientId',
  as: 'eecpAssessments',
  onDelete: 'RESTRICT',
});
EecpAssessment.belongsTo(Patient, {
  foreignKey: 'patientId',
  as: 'patient',
});

Patient.hasMany(EecpTreatmentCourse, {
  foreignKey: 'patientId',
  as: 'eecpCourses',
  onDelete: 'RESTRICT',
});
EecpTreatmentCourse.belongsTo(Patient, {
  foreignKey: 'patientId',
  as: 'patient',
});

Patient.hasMany(EecpSession, {
  foreignKey: 'patientId',
  as: 'eecpSessions',
  onDelete: 'RESTRICT',
});
EecpSession.belongsTo(Patient, {
  foreignKey: 'patientId',
  as: 'patient',
});

// Doctor & Staff Users <-> EECP Entities
User.hasMany(EecpAssessment, {
  foreignKey: 'doctorId',
  as: 'eecpAssessments',
  onDelete: 'RESTRICT',
});
EecpAssessment.belongsTo(User, {
  foreignKey: 'doctorId',
  as: 'doctor',
});

User.hasMany(EecpTreatmentCourse, {
  foreignKey: 'doctorId',
  as: 'supervisedEecpCourses',
  onDelete: 'RESTRICT',
});
EecpTreatmentCourse.belongsTo(User, {
  foreignKey: 'doctorId',
  as: 'doctor',
});

User.hasMany(EecpSession, {
  foreignKey: 'staffId',
  as: 'conductedEecpSessions',
  onDelete: 'SET NULL',
});
EecpSession.belongsTo(User, {
  foreignKey: 'staffId',
  as: 'staff',
});

User.hasMany(EecpSession, {
  foreignKey: 'doctorId',
  as: 'supervisedEecpSessions',
  onDelete: 'SET NULL',
});
EecpSession.belongsTo(User, {
  foreignKey: 'doctorId',
  as: 'doctor',
});

// EecpPackage <-> EecpTreatmentCourse (1:N)
EecpPackage.hasMany(EecpTreatmentCourse, {
  foreignKey: 'packageId',
  as: 'treatmentCourses',
  onDelete: 'RESTRICT',
});
EecpTreatmentCourse.belongsTo(EecpPackage, {
  foreignKey: 'packageId',
  as: 'package',
});

// EecpTreatmentCourse <-> EecpSession (1:N)
EecpTreatmentCourse.hasMany(EecpSession, {
  foreignKey: 'courseId',
  as: 'sessions',
  onDelete: 'RESTRICT',
});
EecpSession.belongsTo(EecpTreatmentCourse, {
  foreignKey: 'courseId',
  as: 'course',
});

// EecpSession <-> EecpSessionReading (1:N)
EecpSession.hasMany(EecpSessionReading, {
  foreignKey: 'sessionId',
  as: 'readings',
  onDelete: 'CASCADE',
});
EecpSessionReading.belongsTo(EecpSession, {
  foreignKey: 'sessionId',
  as: 'session',
});

EecpSessionReading.belongsTo(User, {
  foreignKey: 'recordedBy',
  as: 'recorder',
});

// ==========================================
// Phase 8A: Pharmacy Inventory & Dispensing
// ==========================================

// 23. MedicineBatch Associations
Hospital.hasMany(MedicineBatch, {
  foreignKey: 'hospitalId',
  as: 'medicineBatches',
  onDelete: 'RESTRICT',
});
MedicineBatch.belongsTo(Hospital, {
  foreignKey: 'hospitalId',
  as: 'hospital',
});

Medicine.hasMany(MedicineBatch, {
  foreignKey: 'medicineId',
  as: 'batches',
  onDelete: 'RESTRICT',
});
MedicineBatch.belongsTo(Medicine, {
  foreignKey: 'medicineId',
  as: 'medicine',
});

MedicineBatch.belongsTo(User, {
  foreignKey: 'createdBy',
  as: 'creator',
});
MedicineBatch.belongsTo(User, {
  foreignKey: 'updatedBy',
  as: 'updater',
});

// 24. PharmacyStockTransaction Associations
Hospital.hasMany(PharmacyStockTransaction, {
  foreignKey: 'hospitalId',
  as: 'pharmacyStockTransactions',
  onDelete: 'RESTRICT',
});
PharmacyStockTransaction.belongsTo(Hospital, {
  foreignKey: 'hospitalId',
  as: 'hospital',
});

Medicine.hasMany(PharmacyStockTransaction, {
  foreignKey: 'medicineId',
  as: 'stockTransactions',
  onDelete: 'RESTRICT',
});
PharmacyStockTransaction.belongsTo(Medicine, {
  foreignKey: 'medicineId',
  as: 'medicine',
});

MedicineBatch.hasMany(PharmacyStockTransaction, {
  foreignKey: 'batchId',
  as: 'stockTransactions',
  onDelete: 'RESTRICT',
});
PharmacyStockTransaction.belongsTo(MedicineBatch, {
  foreignKey: 'batchId',
  as: 'batch',
});

PharmacyStockTransaction.belongsTo(User, {
  foreignKey: 'performedBy',
  as: 'performer',
});

// 25. PrescriptionDispensing Associations
Hospital.hasMany(PrescriptionDispensing, {
  foreignKey: 'hospitalId',
  as: 'prescriptionDispensings',
  onDelete: 'RESTRICT',
});
PrescriptionDispensing.belongsTo(Hospital, {
  foreignKey: 'hospitalId',
  as: 'hospital',
});

Prescription.hasMany(PrescriptionDispensing, {
  foreignKey: 'prescriptionId',
  as: 'dispensings',
  onDelete: 'RESTRICT',
});
PrescriptionDispensing.belongsTo(Prescription, {
  foreignKey: 'prescriptionId',
  as: 'prescription',
});

Patient.hasMany(PrescriptionDispensing, {
  foreignKey: 'patientId',
  as: 'dispensings',
  onDelete: 'RESTRICT',
});
PrescriptionDispensing.belongsTo(Patient, {
  foreignKey: 'patientId',
  as: 'patient',
});

PrescriptionDispensing.belongsTo(User, {
  foreignKey: 'pharmacistId',
  as: 'pharmacist',
});
PrescriptionDispensing.belongsTo(User, {
  foreignKey: 'createdBy',
  as: 'creator',
});
PrescriptionDispensing.belongsTo(User, {
  foreignKey: 'updatedBy',
  as: 'updater',
});

// 26. PrescriptionDispensingItem Associations
PrescriptionDispensing.hasMany(PrescriptionDispensingItem, {
  foreignKey: 'dispensingId',
  as: 'items',
  onDelete: 'CASCADE',
});
PrescriptionDispensingItem.belongsTo(PrescriptionDispensing, {
  foreignKey: 'dispensingId',
  as: 'dispensing',
});

PrescriptionItem.hasMany(PrescriptionDispensingItem, {
  foreignKey: 'prescriptionItemId',
  as: 'dispensingItems',
  onDelete: 'RESTRICT',
});
PrescriptionDispensingItem.belongsTo(PrescriptionItem, {
  foreignKey: 'prescriptionItemId',
  as: 'prescriptionItem',
});

Medicine.hasMany(PrescriptionDispensingItem, {
  foreignKey: 'medicineId',
  as: 'dispensedItems',
  onDelete: 'RESTRICT',
});
PrescriptionDispensingItem.belongsTo(Medicine, {
  foreignKey: 'medicineId',
  as: 'medicine',
});

MedicineBatch.hasMany(PrescriptionDispensingItem, {
  foreignKey: 'batchId',
  as: 'dispensingItems',
  onDelete: 'RESTRICT',
});
PrescriptionDispensingItem.belongsTo(MedicineBatch, {
  foreignKey: 'batchId',
  as: 'batch',
});

// ==========================================
// Phase 8B: Laboratory & Investigation Results Associations
// ==========================================

// Hospital <-> InvestigationSample / InvestigationResult (1:N)
Hospital.hasMany(InvestigationSample, {
  foreignKey: 'hospitalId',
  as: 'investigationSamples',
  onDelete: 'RESTRICT',
});
InvestigationSample.belongsTo(Hospital, {
  foreignKey: 'hospitalId',
  as: 'hospital',
});

Hospital.hasMany(InvestigationResult, {
  foreignKey: 'hospitalId',
  as: 'investigationResults',
  onDelete: 'RESTRICT',
});
InvestigationResult.belongsTo(Hospital, {
  foreignKey: 'hospitalId',
  as: 'hospital',
});

// InvestigationOrder <-> InvestigationSample (1:N)
InvestigationOrder.hasMany(InvestigationSample, {
  foreignKey: 'investigationOrderId',
  as: 'samples',
  onDelete: 'RESTRICT',
});
InvestigationSample.belongsTo(InvestigationOrder, {
  foreignKey: 'investigationOrderId',
  as: 'order',
});

// InvestigationOrder <-> InvestigationResult (1:1)
InvestigationOrder.hasOne(InvestigationResult, {
  foreignKey: 'investigationOrderId',
  as: 'result',
  onDelete: 'RESTRICT',
});
InvestigationResult.belongsTo(InvestigationOrder, {
  foreignKey: 'investigationOrderId',
  as: 'order',
});

// InvestigationSample <-> InvestigationResult (1:N or 1:1)
InvestigationSample.hasOne(InvestigationResult, {
  foreignKey: 'sampleId',
  as: 'result',
  onDelete: 'SET NULL',
});
InvestigationResult.belongsTo(InvestigationSample, {
  foreignKey: 'sampleId',
  as: 'sample',
});

// Patient <-> InvestigationSample / InvestigationResult (1:N)
Patient.hasMany(InvestigationSample, {
  foreignKey: 'patientId',
  as: 'investigationSamples',
  onDelete: 'RESTRICT',
});
InvestigationSample.belongsTo(Patient, {
  foreignKey: 'patientId',
  as: 'patient',
});

Patient.hasMany(InvestigationResult, {
  foreignKey: 'patientId',
  as: 'investigationResults',
  onDelete: 'RESTRICT',
});
InvestigationResult.belongsTo(Patient, {
  foreignKey: 'patientId',
  as: 'patient',
});

// Encounter <-> InvestigationResult (1:N)
Encounter.hasMany(InvestigationResult, {
  foreignKey: 'encounterId',
  as: 'investigationResults',
  onDelete: 'RESTRICT',
});
InvestigationResult.belongsTo(Encounter, {
  foreignKey: 'encounterId',
  as: 'encounter',
});

// Investigation <-> InvestigationResult (1:N)
Investigation.hasMany(InvestigationResult, {
  foreignKey: 'investigationId',
  as: 'results',
  onDelete: 'RESTRICT',
});
InvestigationResult.belongsTo(Investigation, {
  foreignKey: 'investigationId',
  as: 'investigation',
});

// Doctor User <-> InvestigationResult (1:N)
User.hasMany(InvestigationResult, {
  foreignKey: 'doctorId',
  as: 'investigationResultsOrdered',
  onDelete: 'RESTRICT',
});
InvestigationResult.belongsTo(User, {
  foreignKey: 'doctorId',
  as: 'doctor',
});

// Staff User <-> Sample tracking (collectedBy, receivedBy)
User.hasMany(InvestigationSample, {
  foreignKey: 'collectedBy',
  as: 'collectedSamples',
  onDelete: 'SET NULL',
});
InvestigationSample.belongsTo(User, {
  foreignKey: 'collectedBy',
  as: 'collector',
});

User.hasMany(InvestigationSample, {
  foreignKey: 'receivedBy',
  as: 'receivedSamples',
  onDelete: 'SET NULL',
});
InvestigationSample.belongsTo(User, {
  foreignKey: 'receivedBy',
  as: 'receiver',
});

// Staff User <-> Result tracking (enteredBy, verifiedBy, finalizedBy)
User.hasMany(InvestigationResult, {
  foreignKey: 'enteredBy',
  as: 'enteredResults',
  onDelete: 'SET NULL',
});
InvestigationResult.belongsTo(User, {
  foreignKey: 'enteredBy',
  as: 'technician',
});

User.hasMany(InvestigationResult, {
  foreignKey: 'verifiedBy',
  as: 'verifiedResults',
  onDelete: 'SET NULL',
});
InvestigationResult.belongsTo(User, {
  foreignKey: 'verifiedBy',
  as: 'verifier',
});

User.hasMany(InvestigationResult, {
  foreignKey: 'finalizedBy',
  as: 'finalizedResults',
  onDelete: 'SET NULL',
});
InvestigationResult.belongsTo(User, {
  foreignKey: 'finalizedBy',
  as: 'finalizer',
});

// ==========================================
// Phase 8C: Billing, Invoices, Payments, Receipts
// ==========================================

// Hospital <-> Billing models
Hospital.hasMany(BillingService, { foreignKey: 'hospitalId', as: 'billingServices', onDelete: 'RESTRICT' });
BillingService.belongsTo(Hospital, { foreignKey: 'hospitalId', as: 'hospital' });

Hospital.hasMany(Invoice, { foreignKey: 'hospitalId', as: 'invoices', onDelete: 'RESTRICT' });
Invoice.belongsTo(Hospital, { foreignKey: 'hospitalId', as: 'hospital' });

Hospital.hasMany(InvoiceItem, { foreignKey: 'hospitalId', as: 'invoiceItems', onDelete: 'RESTRICT' });
InvoiceItem.belongsTo(Hospital, { foreignKey: 'hospitalId', as: 'hospital' });

Hospital.hasMany(Payment, { foreignKey: 'hospitalId', as: 'payments', onDelete: 'RESTRICT' });
Payment.belongsTo(Hospital, { foreignKey: 'hospitalId', as: 'hospital' });

Hospital.hasMany(Receipt, { foreignKey: 'hospitalId', as: 'receipts', onDelete: 'RESTRICT' });
Receipt.belongsTo(Hospital, { foreignKey: 'hospitalId', as: 'hospital' });

// Department <-> BillingService
Department.hasMany(BillingService, { foreignKey: 'departmentId', as: 'billingServices', onDelete: 'SET NULL' });
BillingService.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });

// Patient <-> Invoices, Payments, Receipts
Patient.hasMany(Invoice, { foreignKey: 'patientId', as: 'invoices', onDelete: 'RESTRICT' });
Invoice.belongsTo(Patient, { foreignKey: 'patientId', as: 'patient' });

Patient.hasMany(Payment, { foreignKey: 'patientId', as: 'payments', onDelete: 'RESTRICT' });
Payment.belongsTo(Patient, { foreignKey: 'patientId', as: 'patient' });

Patient.hasMany(Receipt, { foreignKey: 'patientId', as: 'receipts', onDelete: 'RESTRICT' });
Receipt.belongsTo(Patient, { foreignKey: 'patientId', as: 'patient' });

// Invoice <-> Encounter, Appointment
Encounter.hasMany(Invoice, { foreignKey: 'encounterId', as: 'invoices', onDelete: 'SET NULL' });
Invoice.belongsTo(Encounter, { foreignKey: 'encounterId', as: 'encounter' });

Appointment.hasMany(Invoice, { foreignKey: 'appointmentId', as: 'invoices', onDelete: 'SET NULL' });
Invoice.belongsTo(Appointment, { foreignKey: 'appointmentId', as: 'appointment' });

// Invoice <-> InvoiceItem (1:N)
Invoice.hasMany(InvoiceItem, { foreignKey: 'invoiceId', as: 'items', onDelete: 'CASCADE' });
InvoiceItem.belongsTo(Invoice, { foreignKey: 'invoiceId', as: 'invoice' });

// BillingService <-> InvoiceItem (1:N)
BillingService.hasMany(InvoiceItem, { foreignKey: 'billingServiceId', as: 'invoiceItems', onDelete: 'SET NULL' });
InvoiceItem.belongsTo(BillingService, { foreignKey: 'billingServiceId', as: 'billingService' });

// Invoice <-> Payment (1:N)
Invoice.hasMany(Payment, { foreignKey: 'invoiceId', as: 'payments', onDelete: 'RESTRICT' });
Payment.belongsTo(Invoice, { foreignKey: 'invoiceId', as: 'invoice' });

// PaymentMode <-> Payment (1:N)
PaymentMode.hasMany(Payment, { foreignKey: 'paymentModeId', as: 'payments', onDelete: 'RESTRICT' });
Payment.belongsTo(PaymentMode, { foreignKey: 'paymentModeId', as: 'paymentMode' });

// Payment <-> Receipt (1:1)
Payment.hasOne(Receipt, { foreignKey: 'paymentId', as: 'receipt', onDelete: 'RESTRICT' });
Receipt.belongsTo(Payment, { foreignKey: 'paymentId', as: 'payment' });

// Invoice <-> Receipt (1:N)
Invoice.hasMany(Receipt, { foreignKey: 'invoiceId', as: 'receipts', onDelete: 'RESTRICT' });
Receipt.belongsTo(Invoice, { foreignKey: 'invoiceId', as: 'invoice' });

// User audit associations
BillingService.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
BillingService.belongsTo(User, { foreignKey: 'updatedBy', as: 'updater' });

Invoice.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
Invoice.belongsTo(User, { foreignKey: 'updatedBy', as: 'updater' });
Invoice.belongsTo(User, { foreignKey: 'cancelledBy', as: 'canceller' });

Payment.belongsTo(User, { foreignKey: 'receivedBy', as: 'receiver' });
Payment.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

Receipt.belongsTo(User, { foreignKey: 'generatedBy', as: 'generator' });

// ==========================================
// Phase 9A: IPD Admission, Ward & Bed Management Associations
// ==========================================

// Hospital <-> Ward (1:N)
Hospital.hasMany(Ward, { foreignKey: 'hospitalId', as: 'wards', onDelete: 'RESTRICT' });
Ward.belongsTo(Hospital, { foreignKey: 'hospitalId', as: 'hospital' });

// Hospital <-> Bed (1:N)
Hospital.hasMany(Bed, { foreignKey: 'hospitalId', as: 'beds', onDelete: 'RESTRICT' });
Bed.belongsTo(Hospital, { foreignKey: 'hospitalId', as: 'hospital' });

// Hospital <-> IpdAdmission (1:N)
Hospital.hasMany(IpdAdmission, { foreignKey: 'hospitalId', as: 'ipdAdmissions', onDelete: 'RESTRICT' });
IpdAdmission.belongsTo(Hospital, { foreignKey: 'hospitalId', as: 'hospital' });

// Hospital <-> IpdBedTransfer (1:N)
Hospital.hasMany(IpdBedTransfer, { foreignKey: 'hospitalId', as: 'ipdBedTransfers', onDelete: 'RESTRICT' });
IpdBedTransfer.belongsTo(Hospital, { foreignKey: 'hospitalId', as: 'hospital' });

// Department <-> Ward (1:N)
Department.hasMany(Ward, { foreignKey: 'departmentId', as: 'wards', onDelete: 'SET NULL' });
Ward.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });

// Ward <-> Bed (1:N)
Ward.hasMany(Bed, { foreignKey: 'wardId', as: 'beds', onDelete: 'RESTRICT' });
Bed.belongsTo(Ward, { foreignKey: 'wardId', as: 'ward' });

// Patient <-> IpdAdmission (1:N)
Patient.hasMany(IpdAdmission, { foreignKey: 'patientId', as: 'ipdAdmissions', onDelete: 'RESTRICT' });
IpdAdmission.belongsTo(Patient, { foreignKey: 'patientId', as: 'patient' });

// User (Doctor) <-> IpdAdmission (1:N)
User.hasMany(IpdAdmission, { foreignKey: 'admittingDoctorId', as: 'admittedPatients', onDelete: 'RESTRICT' });
IpdAdmission.belongsTo(User, { foreignKey: 'admittingDoctorId', as: 'admittingDoctor' });

// Department <-> IpdAdmission (1:N)
Department.hasMany(IpdAdmission, { foreignKey: 'departmentId', as: 'ipdAdmissions', onDelete: 'SET NULL' });
IpdAdmission.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });

// Ward <-> IpdAdmission (1:N)
Ward.hasMany(IpdAdmission, { foreignKey: 'wardId', as: 'ipdAdmissions', onDelete: 'RESTRICT' });
IpdAdmission.belongsTo(Ward, { foreignKey: 'wardId', as: 'ward' });

// Bed <-> IpdAdmission (1:N)
Bed.hasMany(IpdAdmission, { foreignKey: 'bedId', as: 'ipdAdmissions', onDelete: 'RESTRICT' });
IpdAdmission.belongsTo(Bed, { foreignKey: 'bedId', as: 'bed' });

// IpdAdmission <-> IpdBedTransfer (1:N)
IpdAdmission.hasMany(IpdBedTransfer, { foreignKey: 'admissionId', as: 'bedTransfers', onDelete: 'RESTRICT' });
IpdBedTransfer.belongsTo(IpdAdmission, { foreignKey: 'admissionId', as: 'admission' });

// Patient <-> IpdBedTransfer (1:N)
Patient.hasMany(IpdBedTransfer, { foreignKey: 'patientId', as: 'bedTransfers', onDelete: 'RESTRICT' });
IpdBedTransfer.belongsTo(Patient, { foreignKey: 'patientId', as: 'patient' });

// Ward <-> IpdBedTransfer (fromWard & toWard)
Ward.hasMany(IpdBedTransfer, { foreignKey: 'fromWardId', as: 'transfersOut', onDelete: 'RESTRICT' });
IpdBedTransfer.belongsTo(Ward, { foreignKey: 'fromWardId', as: 'fromWard' });
Ward.hasMany(IpdBedTransfer, { foreignKey: 'toWardId', as: 'transfersIn', onDelete: 'RESTRICT' });
IpdBedTransfer.belongsTo(Ward, { foreignKey: 'toWardId', as: 'toWard' });

// Bed <-> IpdBedTransfer (fromBed & toBed)
Bed.hasMany(IpdBedTransfer, { foreignKey: 'fromBedId', as: 'transfersOut', onDelete: 'RESTRICT' });
IpdBedTransfer.belongsTo(Bed, { foreignKey: 'fromBedId', as: 'fromBed' });
Bed.hasMany(IpdBedTransfer, { foreignKey: 'toBedId', as: 'transfersIn', onDelete: 'RESTRICT' });
IpdBedTransfer.belongsTo(Bed, { foreignKey: 'toBedId', as: 'toBed' });

// User audit associations
Ward.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
Ward.belongsTo(User, { foreignKey: 'updatedBy', as: 'updater' });

Bed.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
Bed.belongsTo(User, { foreignKey: 'updatedBy', as: 'updater' });

IpdAdmission.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
IpdAdmission.belongsTo(User, { foreignKey: 'updatedBy', as: 'updater' });

IpdBedTransfer.belongsTo(User, { foreignKey: 'transferredBy', as: 'transferredByUser' });

// ==========================================
// Phase 9B: IPD Clinical Care & Discharge Associations
// ==========================================

// IpdAdmission <-> Vital (1:N)
IpdAdmission.hasMany(Vital, { foreignKey: 'ipdAdmissionId', as: 'vitals', onDelete: 'SET NULL' });
Vital.belongsTo(IpdAdmission, { foreignKey: 'ipdAdmissionId', as: 'admission' });

// IpdAdmission <-> Encounter (1:N)
IpdAdmission.hasMany(Encounter, { foreignKey: 'ipdAdmissionId', as: 'encounters', onDelete: 'SET NULL' });
Encounter.belongsTo(IpdAdmission, { foreignKey: 'ipdAdmissionId', as: 'admission' });

// IpdProgressNote Associations
Hospital.hasMany(IpdProgressNote, { foreignKey: 'hospitalId', as: 'ipdProgressNotes', onDelete: 'RESTRICT' });
IpdProgressNote.belongsTo(Hospital, { foreignKey: 'hospitalId', as: 'hospital' });

Patient.hasMany(IpdProgressNote, { foreignKey: 'patientId', as: 'ipdProgressNotes', onDelete: 'RESTRICT' });
IpdProgressNote.belongsTo(Patient, { foreignKey: 'patientId', as: 'patient' });

IpdAdmission.hasMany(IpdProgressNote, { foreignKey: 'admissionId', as: 'progressNotes', onDelete: 'RESTRICT' });
IpdProgressNote.belongsTo(IpdAdmission, { foreignKey: 'admissionId', as: 'admission' });

User.hasMany(IpdProgressNote, { foreignKey: 'doctorId', as: 'doctorProgressNotes', onDelete: 'RESTRICT' });
IpdProgressNote.belongsTo(User, { foreignKey: 'doctorId', as: 'doctor' });

IpdProgressNote.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
IpdProgressNote.belongsTo(User, { foreignKey: 'updatedBy', as: 'updater' });
IpdProgressNote.belongsTo(User, { foreignKey: 'finalizedBy', as: 'finalizer' });

// IpdNursingNote Associations
Hospital.hasMany(IpdNursingNote, { foreignKey: 'hospitalId', as: 'ipdNursingNotes', onDelete: 'RESTRICT' });
IpdNursingNote.belongsTo(Hospital, { foreignKey: 'hospitalId', as: 'hospital' });

Patient.hasMany(IpdNursingNote, { foreignKey: 'patientId', as: 'ipdNursingNotes', onDelete: 'RESTRICT' });
IpdNursingNote.belongsTo(Patient, { foreignKey: 'patientId', as: 'patient' });

IpdAdmission.hasMany(IpdNursingNote, { foreignKey: 'admissionId', as: 'nursingNotes', onDelete: 'RESTRICT' });
IpdNursingNote.belongsTo(IpdAdmission, { foreignKey: 'admissionId', as: 'admission' });

User.hasMany(IpdNursingNote, { foreignKey: 'nurseId', as: 'nurseNotes', onDelete: 'RESTRICT' });
IpdNursingNote.belongsTo(User, { foreignKey: 'nurseId', as: 'nurse' });

IpdNursingNote.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
IpdNursingNote.belongsTo(User, { foreignKey: 'updatedBy', as: 'updater' });
IpdNursingNote.belongsTo(User, { foreignKey: 'finalizedBy', as: 'finalizer' });

// DischargeSummary Associations
Hospital.hasMany(DischargeSummary, { foreignKey: 'hospitalId', as: 'dischargeSummaries', onDelete: 'RESTRICT' });
DischargeSummary.belongsTo(Hospital, { foreignKey: 'hospitalId', as: 'hospital' });

Patient.hasMany(DischargeSummary, { foreignKey: 'patientId', as: 'dischargeSummaries', onDelete: 'RESTRICT' });
DischargeSummary.belongsTo(Patient, { foreignKey: 'patientId', as: 'patient' });

IpdAdmission.hasOne(DischargeSummary, { foreignKey: 'admissionId', as: 'dischargeSummaryRecord', onDelete: 'RESTRICT' });
DischargeSummary.belongsTo(IpdAdmission, { foreignKey: 'admissionId', as: 'admission' });

User.hasMany(DischargeSummary, { foreignKey: 'dischargingDoctorId', as: 'dischargedSummaries', onDelete: 'RESTRICT' });
DischargeSummary.belongsTo(User, { foreignKey: 'dischargingDoctorId', as: 'dischargingDoctor' });

DischargeSummary.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });
DischargeSummary.belongsTo(User, { foreignKey: 'updatedBy', as: 'updater' });
DischargeSummary.belongsTo(User, { foreignKey: 'finalizedBy', as: 'finalizer' });

// DischargeMedication Associations
Hospital.hasMany(DischargeMedication, { foreignKey: 'hospitalId', as: 'dischargeMedications', onDelete: 'RESTRICT' });
DischargeMedication.belongsTo(Hospital, { foreignKey: 'hospitalId', as: 'hospital' });

DischargeSummary.hasMany(DischargeMedication, { foreignKey: 'dischargeSummaryId', as: 'medications', onDelete: 'CASCADE' });
DischargeMedication.belongsTo(DischargeSummary, { foreignKey: 'dischargeSummaryId', as: 'dischargeSummary' });

Medicine.hasMany(DischargeMedication, { foreignKey: 'medicineId', as: 'dischargeMedications', onDelete: 'SET NULL' });
DischargeMedication.belongsTo(Medicine, { foreignKey: 'medicineId', as: 'medicine' });

export {
  sequelize,
  Hospital,
  User,
  Role,
  Permission,
  RolePermission,
  UserRole,
  HospitalSetting,
  Patient,
  HospitalSequence,
  Department,
  Medicine,
  Investigation,
  Treatment,
  EecpPackage,
  PaymentMode,
  DoctorSchedule,
  DoctorLeave,
  Appointment,
  Encounter,
  Vital,
  EncounterDiagnosis,
  Prescription,
  PrescriptionItem,
  InvestigationOrder,
  EecpAssessment,
  EecpTreatmentCourse,
  EecpSession,
  EecpSessionReading,
  MedicineBatch,
  PharmacyStockTransaction,
  PrescriptionDispensing,
  PrescriptionDispensingItem,
  InvestigationSample,
  InvestigationResult,
  BillingService,
  Invoice,
  InvoiceItem,
  Payment,
  Receipt,
  Ward,
  Bed,
  IpdAdmission,
  IpdBedTransfer,
  IpdProgressNote,
  IpdNursingNote,
  DischargeSummary,
  DischargeMedication,
  Notification,
};

export default {
  sequelize,
  Hospital,
  User,
  Role,
  Permission,
  RolePermission,
  UserRole,
  HospitalSetting,
  Patient,
  HospitalSequence,
  Department,
  Medicine,
  Investigation,
  Treatment,
  EecpPackage,
  PaymentMode,
  DoctorSchedule,
  DoctorLeave,
  Appointment,
  Encounter,
  Vital,
  EncounterDiagnosis,
  Prescription,
  PrescriptionItem,
  InvestigationOrder,
  EecpAssessment,
  EecpTreatmentCourse,
  EecpSession,
  EecpSessionReading,
  MedicineBatch,
  PharmacyStockTransaction,
  PrescriptionDispensing,
  PrescriptionDispensingItem,
  InvestigationSample,
  InvestigationResult,
  BillingService,
  Invoice,
  InvoiceItem,
  Payment,
  Receipt,
  Ward,
  Bed,
  IpdAdmission,
  IpdBedTransfer,
  IpdProgressNote,
  IpdNursingNote,
  DischargeSummary,
  DischargeMedication,
  Notification,
};

// ==========================================
// Notification Associations (Phase 11)
// ==========================================

Hospital.hasMany(Notification, {
  foreignKey: 'hospitalId',
  as: 'notifications',
  onDelete: 'CASCADE',
});
Notification.belongsTo(Hospital, {
  foreignKey: 'hospitalId',
  as: 'hospital',
});

User.hasMany(Notification, {
  foreignKey: 'recipientUserId',
  as: 'notifications',
  onDelete: 'CASCADE',
});
Notification.belongsTo(User, {
  foreignKey: 'recipientUserId',
  as: 'recipient',
});

Patient.hasMany(Notification, {
  foreignKey: 'patientId',
  as: 'notifications',
  onDelete: 'SET NULL',
});
Notification.belongsTo(Patient, {
  foreignKey: 'patientId',
  as: 'patient',
});




