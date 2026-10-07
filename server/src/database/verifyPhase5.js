import {
  sequelize,
  Hospital,
  User,
  UserRole,
  HospitalSetting,
  Patient,
  Department,
  Medicine,
  Investigation,
  Treatment,
  EecpPackage,
  PaymentMode,
} from '../models/index.js';
import departmentService from '../services/department.service.js';
import staffService from '../services/staff.service.js';
import clinicalMasterService from '../services/clinicalMaster.service.js';
import hospitalAdminService from '../services/hospitalAdmin.service.js';
import patientService from '../services/patient.service.js';
import authService from '../services/auth.service.js';

let passed = 0;
let failed = 0;

const assert = (condition, testName) => {
  if (condition) {
    console.log(`  ✓ ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    failed++;
  }
};

const assertThrows = async (fn, testName) => {
  try {
    await fn();
    console.error(`  ✗ FAIL (did not throw): ${testName}`);
    failed++;
  } catch {
    console.log(`  ✓ ${testName}`);
    passed++;
  }
};

export const runPhase5Verification = async () => {
  console.log('\n============================================================');
  console.log('HMS Phase 5: Hospital Administration & Configuration Verification');
  console.log('============================================================\n');

  try {
    await sequelize.authenticate();
    console.log('✓ Connected to PostgreSQL database.\n');
  } catch (error) {
    console.error(`✗ DB Connection error: ${error.message}`);
    process.exit(1);
  }

  let hospA, hospB, doctorA, nurseA;

  try {
    // 1. Setup Test Tenants: Hospital A & Hospital B
    hospA = await Hospital.create({
      name: 'Phase5 Hospital Alpha',
      slug: 'phase5-hospital-alpha',
      email: 'admin@alpha-hosp.test',
      phone: '9988776655',
      address: '100 Medical Center Dr',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      status: 'ACTIVE',
    });

    hospB = await Hospital.create({
      name: 'Phase5 Hospital Beta',
      slug: 'phase5-hospital-beta',
      email: 'admin@beta-hosp.test',
      phone: '8877665544',
      address: '200 Cardiac Way',
      city: 'Pune',
      state: 'Maharashtra',
      country: 'India',
      status: 'ACTIVE',
    });

    console.log('--- 1. Testing Department Management & Tenant Isolation ---');
    // Create Department in Hospital A
    const deptCardioA = await departmentService.createDepartment(hospA.id, {
      name: 'Cardiology',
      code: 'CARD',
      description: 'Cardiac care and diagnostics',
    });
    assert(deptCardioA && deptCardioA.id, 'Hospital A creates Cardiology department');

    // Duplicate in Hospital A should be rejected
    await assertThrows(
      () => departmentService.createDepartment(hospA.id, { name: 'Cardiology' }),
      'Hospital A rejects duplicate department name'
    );

    // Same department name in Hospital B MUST BE ALLOWED
    const deptCardioB = await departmentService.createDepartment(hospB.id, {
      name: 'Cardiology',
      code: 'CARD-B',
      description: 'Beta Cardiac unit',
    });
    assert(deptCardioB && deptCardioB.id, 'Hospital B can create department with same name (Cardiology)');

    // Tenant Isolation: Hospital A cannot see Hospital B departments
    const deptsA = await departmentService.getDepartments(hospA.id);
    const hasDeptBInA = deptsA.departments.some((d) => d.id === deptCardioB.id);
    assert(!hasDeptBInA, 'TENANT ISOLATION: Hospital A cannot see Hospital B departments');

    // Edit department in Hospital A
    const updatedDeptA = await departmentService.updateDepartment(hospA.id, deptCardioA.id, {
      code: 'CARD-ALPHA',
    });
    assert(updatedDeptA.code === 'CARD-ALPHA', 'Hospital A can edit department details');

    // Toggle department status
    const deactDeptA = await departmentService.updateDepartmentStatus(hospA.id, deptCardioA.id, 'INACTIVE');
    assert(deactDeptA.status === 'INACTIVE', 'Hospital A can deactivate department');

    const actDeptA = await departmentService.updateDepartmentStatus(hospA.id, deptCardioA.id, 'ACTIVE');
    assert(actDeptA.status === 'ACTIVE', 'Hospital A can reactivate department');

    console.log('\n--- 2. Testing Doctors & Staff Management ---');
    // Provision Doctor in Hospital A
    doctorA = await staffService.createStaff(hospA.id, {
      name: 'Dr. Arjun Mehta',
      email: 'arjun.mehta@alpha.test',
      password: 'DoctorPassword123!',
      role: 'DOCTOR',
      departmentId: deptCardioA.id,
      phone: '9812345678',
      qualification: 'MBBS, MD, DM (Cardiology)',
      specialization: 'Interventional Cardiology & EECP',
      licenseNumber: 'MCI-CARD-9921',
      experienceYears: 15,
      consultationFee: 1200,
    });
    assert(doctorA && doctorA.roles[0].name === 'DOCTOR', 'Doctor created with DOCTOR role');
    assert(doctorA.departmentId === deptCardioA.id, 'Doctor assigned to Cardiology department');
    assert(doctorA.consultationFee == 1200, 'Doctor consultation fee persisted correctly');

    // Provision Nurse in Hospital A
    nurseA = await staffService.createStaff(hospA.id, {
      name: 'Nurse Priya Sharma',
      email: 'priya.sharma@alpha.test',
      password: 'NursePassword123!',
      role: 'NURSE',
      departmentId: deptCardioA.id,
      phone: '9823456789',
    });
    assert(nurseA && nurseA.roles[0].name === 'NURSE', 'Nurse created with NURSE role');

    // Hospital Admin CANNOT create SUPER_ADMIN
    await assertThrows(
      () =>
        staffService.createStaff(hospA.id, {
          name: 'Hacker SuperAdmin',
          email: 'fake.admin@alpha.test',
          password: 'Password123!',
          role: 'SUPER_ADMIN',
        }),
      'SECURITY: Hospital Admin cannot create SUPER_ADMIN'
    );

    // Tenant Isolation: Hospital B cannot see Hospital A staff
    const staffListB = await staffService.getStaff(hospB.id);
    const hasDoctorAInB = staffListB.staff.some((s) => s.id === doctorA.id);
    assert(!hasDoctorAInB, 'TENANT ISOLATION: Hospital B cannot see Hospital A doctor');

    // Filter staff by role
    const docOnlyList = await staffService.getStaff(hospA.id, { role: 'DOCTOR' });
    assert(
      docOnlyList.staff.every((s) => s.roles.some((r) => r.name === 'DOCTOR')),
      'Filter staff by role returns only requested role'
    );

    // Staff status toggle
    const deactDoctor = await staffService.updateStaffStatus(hospA.id, doctorA.id, 'INACTIVE');
    assert(deactDoctor.status === 'INACTIVE', 'Hospital Admin can deactivate staff member');
    await staffService.updateStaffStatus(hospA.id, doctorA.id, 'ACTIVE');

    console.log('\n--- 3. Testing Clinical Masters (Medicines, Investigations, Treatments, EECP, Payment) ---');
    // 3.1 Medicine
    const medA = await clinicalMasterService.createMedicine(hospA.id, {
      name: 'Atorvastatin 20mg',
      genericName: 'Atorvastatin Calcium',
      category: 'Lipid-lowering',
      strength: '20 mg',
      dosageForm: 'Tablet',
      manufacturer: 'Sun Pharma',
      unit: 'Strip',
    });
    assert(medA && medA.id, 'Medicine master created');

    // Same medicine name in Hospital B allowed
    const medB = await clinicalMasterService.createMedicine(hospB.id, {
      name: 'Atorvastatin 20mg',
      genericName: 'Atorvastatin Calcium',
    });
    assert(medB && medB.id, 'Hospital B can create same medicine name');

    // Tenant Isolation: Hospital A cannot see Hospital B medicines
    const medsA = await clinicalMasterService.getMedicines(hospA.id);
    assert(!medsA.medicines.some((m) => m.id === medB.id), 'TENANT ISOLATION: Hospital A cannot see Hospital B medicine');

    // 3.2 Investigation (Cardiology example)
    const invA = await clinicalMasterService.createInvestigation(hospA.id, {
      name: '2D Echocardiography',
      code: 'ECHO-2D',
      category: 'Cardiology',
      departmentId: deptCardioA.id,
      defaultCharge: 2500,
    });
    assert(invA && invA.defaultCharge == 2500, 'Investigation master created with default charge');

    // 3.3 Treatment
    const treatA = await clinicalMasterService.createTreatment(hospA.id, {
      name: 'Cardiac Rehabilitation Phase 1',
      code: 'CR-P1',
      category: 'Cardiac Therapy',
      departmentId: deptCardioA.id,
      defaultCharge: 1500,
    });
    assert(treatA && treatA.defaultCharge == 1500, 'Treatment master created');

    // 3.4 EECP Package Master
    const eecpA = await clinicalMasterService.createEecpPackage(hospA.id, {
      name: 'EECP Standard Course',
      description: '35 hours of Enhanced External Counterpulsation therapy',
      numberOfSessions: 35,
      sessionDuration: 60,
      validityPeriod: '60 Days',
      packagePrice: 75000,
      notes: 'Includes pre and post ECG and consultation',
    });
    assert(eecpA && eecpA.numberOfSessions === 35, 'EECP Package created with 35 sessions');
    assert(eecpA.packagePrice == 75000, 'EECP Package price configured correctly');

    // Tenant isolation for EECP packages
    const eecpBList = await clinicalMasterService.getEecpPackages(hospB.id);
    assert(!eecpBList.packages.some((p) => p.id === eecpA.id), 'TENANT ISOLATION: Hospital B cannot access Hospital A EECP packages');

    // 3.5 Payment Mode
    const pmUPI = await clinicalMasterService.createPaymentMode(hospA.id, {
      name: 'UPI / QR Code',
      code: 'UPI',
      description: 'Instant scan and pay via BHIM UPI / PhonePe / GPay',
    });
    assert(pmUPI && pmUPI.code === 'UPI', 'Payment mode master created');

    console.log('\n--- 4. Testing Hospital Settings, Billing & Notification Config ---');
    // Update Hospital Profile
    const profileUpdate = await hospitalAdminService.updateHospitalProfile(hospA.id, {
      alternatePhone: '9911223344',
      website: 'https://sssh-cardiac.example.com',
      workingHours: 'OPD 8am - 8pm, Emergency 24x7',
    });
    assert(profileUpdate.hospital.alternatePhone === '9911223344', 'Hospital profile alternatePhone updated');
    assert(profileUpdate.hospital.website === 'https://sssh-cardiac.example.com', 'Hospital profile website updated');

    // Update Patient Config (UHID Prefix)
    const patientConfigUpdate = await hospitalAdminService.updateHospitalSettingsMap(hospA.id, {
      uhid_prefix: 'SSSH',
      patient_starting_number: '100',
    });
    assert(patientConfigUpdate.settings.uhid_prefix === 'SSSH', 'Patient UHID prefix updated in settings');

    // Update Billing Config
    const billingUpdate = await hospitalAdminService.updateHospitalSettingsMap(hospA.id, {
      billing_tax_enabled: 'true',
      billing_tax_rate: '5.0',
      billing_invoice_prefix: 'SSSH-INV-',
      billing_receipt_prefix: 'SSSH-REC-',
    });
    assert(billingUpdate.settings.billing_tax_enabled === 'true', 'Billing tax enabled flag updated');
    assert(billingUpdate.settings.billing_invoice_prefix === 'SSSH-INV-', 'Billing invoice prefix updated');

    // Update Notification Config
    const notifyUpdate = await hospitalAdminService.updateHospitalSettingsMap(hospA.id, {
      notify_appointment_reminders: 'true',
      notify_eecp_reminders: 'true',
      notify_sms_enabled: 'true',
    });
    assert(notifyUpdate.settings.notify_eecp_reminders === 'true', 'EECP notification reminder setting updated');
    assert(notifyUpdate.settings.notify_sms_enabled === 'true', 'SMS notifications flag updated');

    // Tenant isolation on settings
    const settingsB = await hospitalAdminService.getHospitalSettings(hospB.id);
    assert(settingsB.settings.uhid_prefix !== 'SSSH', 'TENANT ISOLATION: Hospital B does not inherit Hospital A UHID prefix');

    console.log('\n--- 5. Testing Regression: Patient Registration & UHID Generation ---');
    // Register Patient in Hospital A
    const patient = await patientService.createPatient(hospA.id, {
      firstName: 'Ramesh',
      lastName: 'Patil',
      dateOfBirth: '1975-06-15',
      gender: 'MALE',
      bloodGroup: 'B_POSITIVE',
      phone: '9898989898',
      city: 'Mumbai',
    });
    assert(patient && patient.uhid.startsWith('SSSH-'), `UHID generated with custom prefix: ${patient.uhid}`);

    // Verify patient search & filter
    const patientList = await patientService.getPatients(hospA.id, { search: 'Ramesh' });
    assert(patientList.patients.length >= 1, 'Patient search returns registered patient');

    console.log('\n--- 6. Testing Authentication Regression ---');
    // Verify doctor can log in via loginHospitalUser
    const loginResult = await authService.loginHospitalUser('arjun.mehta@alpha.test', 'DoctorPassword123!');
    assert(loginResult && loginResult.accessToken, 'Doctor login produces valid JWT access token');
    assert(loginResult.user.hospitalId === hospA.id, 'Doctor token is correctly scoped to Hospital A');
  } finally {
    // Clean up test data
    console.log('\nCleaning up Phase 5 verification records...');
    if (hospA) {
      if (doctorA?.id || nurseA?.id) {
        await UserRole.destroy({ where: { userId: [doctorA?.id, nurseA?.id].filter(Boolean) } });
      }
      await Patient.destroy({ where: { hospitalId: hospA.id } });
      await Medicine.destroy({ where: { hospitalId: hospA.id } });
      await Investigation.destroy({ where: { hospitalId: hospA.id } });
      await Treatment.destroy({ where: { hospitalId: hospA.id } });
      await EecpPackage.destroy({ where: { hospitalId: hospA.id } });
      await PaymentMode.destroy({ where: { hospitalId: hospA.id } });
      await User.destroy({ where: { hospitalId: hospA.id } });
      await Department.destroy({ where: { hospitalId: hospA.id } });
      await HospitalSetting.destroy({ where: { hospitalId: hospA.id } });
      await Hospital.destroy({ where: { id: hospA.id } });
    }
    if (hospB) {
      await Medicine.destroy({ where: { hospitalId: hospB.id } });
      await Department.destroy({ where: { hospitalId: hospB.id } });
      await HospitalSetting.destroy({ where: { hospitalId: hospB.id } });
      await Hospital.destroy({ where: { id: hospB.id } });
    }
    console.log('✓ Cleanup complete.');
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed.\n`);
  return failed === 0;
};

if (process.argv[1] && process.argv[1].includes('verifyPhase5.js')) {
  runPhase5Verification()
    .then((success) => process.exit(success ? 0 : 1))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
