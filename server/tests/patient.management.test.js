import test from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, stopTestServer, setupTestDatabase } from './testHelper.js';
import { generateAccessToken } from '../src/utils/jwt.js';
import {
  Hospital,
  HospitalSetting,
  User,
  UserRole,
  Role,
  Patient,
  HospitalSequence,
} from '../src/models/index.js';

let baseUrl;
let hospitalA, hospitalB;
let adminUserA, adminUserB;
let receptionistUserA;
let doctorUserA;
let nurseUserA;
let platformSuperAdminUser;

let tokenAdminA, tokenAdminB;
let tokenReceptionistA;
let tokenDoctorA;
let tokenNurseA;
let tokenSuperAdmin;

let patientA1, patientA2, patientB1;

test.before(async () => {
  const db = await setupTestDatabase();
  const server = await startTestServer();
  baseUrl = server.baseUrl;

  platformSuperAdminUser = db.superAdmin;
  tokenSuperAdmin = generateAccessToken({
    userId: platformSuperAdminUser.id,
    role: 'SUPER_ADMIN',
    scope: 'PLATFORM',
  });

  // 1. Create Hospital A & Hospital B
  hospitalA = await Hospital.create({
    name: 'Hospital Alpha Care',
    slug: `hospital-alpha-${Date.now()}`,
    city: 'Mumbai',
    status: 'ACTIVE',
  });

  hospitalB = await Hospital.create({
    name: 'Hospital Beta Health',
    slug: `hospital-beta-${Date.now()}`,
    city: 'Delhi',
    status: 'ACTIVE',
  });

  // Hospital settings
  await HospitalSetting.create({
    hospitalId: hospitalA.id,
    key: 'uhid_prefix',
    value: 'ALPH',
  });

  await HospitalSetting.create({
    hospitalId: hospitalB.id,
    key: 'uhid_prefix',
    value: 'BETA',
  });

  // 2. Fetch roles
  const hospitalAdminRole = await Role.findOne({
    where: { name: 'HOSPITAL_ADMIN', scope: 'HOSPITAL' },
  });
  const receptionistRole = await Role.findOne({
    where: { name: 'RECEPTIONIST', scope: 'HOSPITAL' },
  });
  const doctorRole = await Role.findOne({ where: { name: 'DOCTOR', scope: 'HOSPITAL' } });
  const nurseRole = await Role.findOne({ where: { name: 'NURSE', scope: 'HOSPITAL' } });

  // 3. Create Users for Hospital A
  adminUserA = await User.create({
    hospitalId: hospitalA.id,
    name: 'Admin Alpha',
    email: `admin.alpha.${Date.now()}@alpha.org`,
    passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz123456',
    status: 'ACTIVE',
  });
  await UserRole.create({ userId: adminUserA.id, roleId: hospitalAdminRole.id });

  receptionistUserA = await User.create({
    hospitalId: hospitalA.id,
    name: 'Recep Alpha',
    email: `recep.alpha.${Date.now()}@alpha.org`,
    passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz123456',
    status: 'ACTIVE',
  });
  await UserRole.create({ userId: receptionistUserA.id, roleId: receptionistRole.id });

  doctorUserA = await User.create({
    hospitalId: hospitalA.id,
    name: 'Dr. Alpha Doctor',
    email: `doc.alpha.${Date.now()}@alpha.org`,
    passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz123456',
    status: 'ACTIVE',
  });
  await UserRole.create({ userId: doctorUserA.id, roleId: doctorRole.id });

  nurseUserA = await User.create({
    hospitalId: hospitalA.id,
    name: 'Nurse Alpha',
    email: `nurse.alpha.${Date.now()}@alpha.org`,
    passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz123456',
    status: 'ACTIVE',
  });
  await UserRole.create({ userId: nurseUserA.id, roleId: nurseRole.id });

  // 4. Create Users for Hospital B
  adminUserB = await User.create({
    hospitalId: hospitalB.id,
    name: 'Admin Beta',
    email: `admin.beta.${Date.now()}@beta.org`,
    passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz123456',
    status: 'ACTIVE',
  });
  await UserRole.create({ userId: adminUserB.id, roleId: hospitalAdminRole.id });

  // 5. Generate Auth Tokens
  tokenAdminA = generateAccessToken({
    userId: adminUserA.id,
    role: 'HOSPITAL_ADMIN',
    scope: 'HOSPITAL',
  });
  tokenAdminB = generateAccessToken({
    userId: adminUserB.id,
    role: 'HOSPITAL_ADMIN',
    scope: 'HOSPITAL',
  });
  tokenReceptionistA = generateAccessToken({
    userId: receptionistUserA.id,
    role: 'RECEPTIONIST',
    scope: 'HOSPITAL',
  });
  tokenDoctorA = generateAccessToken({
    userId: doctorUserA.id,
    role: 'DOCTOR',
    scope: 'HOSPITAL',
  });
  tokenNurseA = generateAccessToken({
    userId: nurseUserA.id,
    role: 'NURSE',
    scope: 'HOSPITAL',
  });
});

test.after(async () => {
  // Clean up all created test entities
  const hospitalIds = [hospitalA?.id, hospitalB?.id].filter(Boolean);
  if (hospitalIds.length > 0) {
    await Patient.destroy({ where: { hospitalId: hospitalIds } });
    await HospitalSequence.destroy({ where: { hospitalId: hospitalIds } });

    const users = await User.findAll({ where: { hospitalId: hospitalIds } });
    const userIds = users.map((u) => u.id);
    if (userIds.length > 0) {
      await UserRole.destroy({ where: { userId: userIds } });
      await User.destroy({ where: { id: userIds } });
    }

    await HospitalSetting.destroy({ where: { hospitalId: hospitalIds } });
    await Hospital.destroy({ where: { id: hospitalIds } });
  }

  await stopTestServer();
});

// ==========================================
// 1. Authentication & Tenant Guard Tests
// ==========================================
test('GET /api/patients - 401 when unauthenticated', async () => {
  const res = await fetch(`${baseUrl}/patients`);
  assert.equal(res.status, 401);
});

test('GET /api/patients/:id - 401 when unauthenticated', async () => {
  const res = await fetch(`${baseUrl}/patients/00000000-0000-0000-0000-000000000000`);
  assert.equal(res.status, 401);
});

test('POST /api/patients - 403 when user has PLATFORM scope / null hospitalId (Super Admin)', async () => {
  const res = await fetch(`${baseUrl}/patients`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenSuperAdmin}`,
    },
    body: JSON.stringify({
      firstName: 'Jane',
      lastName: 'Doe',
      dateOfBirth: '1995-01-01',
      gender: 'FEMALE',
      phone: '9876543210',
    }),
  });
  assert.equal(res.status, 403);
});

// ==========================================
// 2. Patient Creation & Concurrency-Safe UHID
// ==========================================
test('POST /api/patients - Hospital Admin registers patient with atomic UHID', async () => {
  const payload = {
    firstName: 'Aarav',
    middleName: 'Kumar',
    lastName: 'Sharma',
    dateOfBirth: '1992-06-15',
    gender: 'MALE',
    bloodGroup: 'O_POSITIVE',
    phone: '+91 98765 43210',
    email: 'aarav.sharma@example.com',
    address: '123 Marine Drive',
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    postalCode: '400001',
    emergencyContactName: 'Pooja Sharma',
    emergencyContactPhone: '+91 98765 43211',
    emergencyContactRelation: 'Spouse',
    allergies: 'Penicillin allergy',
    medicalNotes: 'Hypertension history',
  };

  const res = await fetch(`${baseUrl}/patients`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenAdminA}`,
    },
    body: JSON.stringify(payload),
  });

  assert.equal(res.status, 201);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(data.data.id);
  assert.equal(data.data.hospitalId, hospitalA.id);
  assert.equal(data.data.firstName, 'Aarav');
  assert.equal(data.data.uhid, 'ALPH-000001');
  assert.equal(data.data.isActive, true);

  patientA1 = data.data;
});

test('POST /api/patients - Receptionist registers second patient in Hospital A (UHID increments)', async () => {
  const payload = {
    firstName: 'Priya',
    lastName: 'Patel',
    dateOfBirth: '1998-11-20',
    gender: 'FEMALE',
    bloodGroup: 'B_POSITIVE',
    phone: '+91 91234 56789',
    email: 'priya.patel@example.com',
  };

  const res = await fetch(`${baseUrl}/patients`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenReceptionistA}`,
    },
    body: JSON.stringify(payload),
  });

  assert.equal(res.status, 201);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.data.hospitalId, hospitalA.id);
  assert.equal(data.data.uhid, 'ALPH-000002');

  patientA2 = data.data;
});

test('POST /api/patients - Hospital B Admin registers patient (Hospital B gets independent UHID counter)', async () => {
  const payload = {
    firstName: 'Rahul',
    lastName: 'Verma',
    dateOfBirth: '1985-04-10',
    gender: 'MALE',
    bloodGroup: 'A_POSITIVE',
    phone: '+91 99887 76655',
  };

  const res = await fetch(`${baseUrl}/patients`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenAdminB}`,
    },
    body: JSON.stringify(payload),
  });

  assert.equal(res.status, 201);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.data.hospitalId, hospitalB.id);
  assert.equal(data.data.uhid, 'BETA-000001');

  patientB1 = data.data;
});

// ==========================================
// 3. Input Validation Checks
// ==========================================
test('POST /api/patients - Rejects missing required fields', async () => {
  const res = await fetch(`${baseUrl}/patients`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenAdminA}`,
    },
    body: JSON.stringify({}),
  });

  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.success, false);
  assert.ok(data.errors.firstName);
  assert.ok(data.errors.lastName);
  assert.ok(data.errors.phone);
  assert.ok(data.errors.dateOfBirth);
  assert.ok(data.errors.gender);
});

test('POST /api/patients - Rejects future date of birth', async () => {
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 2);

  const res = await fetch(`${baseUrl}/patients`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenAdminA}`,
    },
    body: JSON.stringify({
      firstName: 'Baby',
      lastName: 'Future',
      dateOfBirth: futureDate.toISOString().split('T')[0],
      gender: 'OTHER',
      phone: '9876543210',
    }),
  });

  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.success, false);
  assert.ok(data.errors.dateOfBirth);
});

test('POST /api/patients - Rejects invalid email', async () => {
  const res = await fetch(`${baseUrl}/patients`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenAdminA}`,
    },
    body: JSON.stringify({
      firstName: 'Bob',
      lastName: 'Smith',
      dateOfBirth: '2000-01-01',
      gender: 'MALE',
      phone: '9876543210',
      email: 'not-an-email',
    }),
  });

  assert.equal(res.status, 400);
  const data = await res.json();
  assert.ok(data.errors.email);
});

// ==========================================
// 4. Role-Based Access Control (RBAC)
// ==========================================
test('POST /api/patients - Pharmacist is NOT allowed to register patients (403)', async () => {
  const role = await Role.findOne({ where: { name: 'PHARMACIST', scope: 'HOSPITAL' } });
  const user = await User.create({
    hospitalId: hospitalA.id,
    name: 'Pharm Temp',
    email: `pharm.temp.${Date.now()}@alpha.org`,
    passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz123456',
    status: 'ACTIVE',
  });
  await UserRole.create({ userId: user.id, roleId: role.id });
  const tokenPharmacist = generateAccessToken({
    userId: user.id,
    role: 'PHARMACIST',
    scope: 'HOSPITAL',
  });

  try {
    const res = await fetch(`${baseUrl}/patients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenPharmacist}`,
      },
      body: JSON.stringify({
        firstName: 'PharmRegister',
        lastName: 'Patient',
        dateOfBirth: '1990-01-01',
        gender: 'MALE',
        phone: '9876543210',
      }),
    });

    assert.equal(res.status, 403);
  } finally {
    await UserRole.destroy({ where: { userId: user.id } });
    await User.destroy({ where: { id: user.id } });
  }
});

test('POST /api/patients - Lab Staff is NOT allowed to register patients (403)', async () => {
  const role = await Role.findOne({ where: { name: 'LAB_STAFF', scope: 'HOSPITAL' } });
  const user = await User.create({
    hospitalId: hospitalA.id,
    name: 'Lab Temp',
    email: `lab.temp.${Date.now()}@alpha.org`,
    passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz123456',
    status: 'ACTIVE',
  });
  await UserRole.create({ userId: user.id, roleId: role.id });
  const tokenLab = generateAccessToken({
    userId: user.id,
    role: 'LAB_STAFF',
    scope: 'HOSPITAL',
  });

  try {
    const res = await fetch(`${baseUrl}/patients`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenLab}`,
      },
      body: JSON.stringify({
        firstName: 'LabRegister',
        lastName: 'Patient',
        dateOfBirth: '1990-01-01',
        gender: 'FEMALE',
        phone: '9876543210',
      }),
    });

    assert.equal(res.status, 403);
  } finally {
    await UserRole.destroy({ where: { userId: user.id } });
    await User.destroy({ where: { id: user.id } });
  }
});

test('PATCH /api/patients/:id - Receptionist can update demographic information', async () => {
  const res = await fetch(`${baseUrl}/patients/${patientA1.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenReceptionistA}`,
    },
    body: JSON.stringify({
      city: 'Navi Mumbai',
      postalCode: '400703',
    }),
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.data.city, 'Navi Mumbai');
  assert.equal(data.data.postalCode, '400703');
});

test('PATCH /api/patients/:id - Receptionist CANNOT update clinical fields (allergies/medicalNotes) (403)', async () => {
  const res = await fetch(`${baseUrl}/patients/${patientA1.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenReceptionistA}`,
    },
    body: JSON.stringify({
      allergies: 'New allergy updated by receptionist',
    }),
  });

  assert.equal(res.status, 403);
});

test('POST /api/patients - Doctor CAN register a walk-in patient with clinical notes (201)', async () => {
  const payload = {
    firstName: 'Suresh',
    lastName: 'Raina',
    dateOfBirth: '1987-11-27',
    gender: 'MALE',
    bloodGroup: 'O_POSITIVE',
    phone: '+91 98888 77777',
    allergies: 'Sulfa drugs',
    medicalNotes: 'Direct OPD consult patient registration by attending doctor',
  };

  const res = await fetch(`${baseUrl}/patients`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenDoctorA}`,
    },
    body: JSON.stringify(payload),
  });

  assert.equal(res.status, 201);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.data.firstName, 'Suresh');
  assert.equal(data.data.allergies, 'Sulfa drugs');

  // Clean up temporary patient so subsequent aggregate tests remain unaffected
  await Patient.destroy({ where: { id: data.data.id } });
});

test('PATCH /api/patients/:id - Doctor CAN update patient clinical and demographic fields (200)', async () => {
  const res = await fetch(`${baseUrl}/patients/${patientA1.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenDoctorA}`,
    },
    body: JSON.stringify({
      allergies: 'Penicillin allergy noted by Dr. Alpha',
      medicalNotes: 'Patient presented with seasonal cough, prescribed bronchodilator.',
      phone: '+91 99999 88888',
    }),
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.data.allergies, 'Penicillin allergy noted by Dr. Alpha');
  assert.equal(data.data.phone, '+91 99999 88888');
});

test('PATCH /api/patients/:id/status - Doctor CANNOT deactivate patient status (403)', async () => {
  const res = await fetch(`${baseUrl}/patients/${patientA1.id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenDoctorA}`,
    },
    body: JSON.stringify({ isActive: false }),
  });

  assert.equal(res.status, 403);
});

test('PATCH /api/patients/:id - Disallows modifying immutable fields (uhid, hospitalId, id)', async () => {
  const res = await fetch(`${baseUrl}/patients/${patientA1.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenAdminA}`,
    },
    body: JSON.stringify({
      uhid: 'HACKED-999',
      hospitalId: hospitalB.id,
    }),
  });

  assert.equal(res.status, 400);
});

test('PATCH /api/patients/:id/status - Receptionist CANNOT deactivate patient (403)', async () => {
  const res = await fetch(`${baseUrl}/patients/${patientA1.id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenReceptionistA}`,
    },
    body: JSON.stringify({ isActive: false }),
  });

  assert.equal(res.status, 403);
});

test('PATCH /api/patients/:id/status - Hospital Admin CAN deactivate and reactivate patient', async () => {
  // Deactivate
  const deactRes = await fetch(`${baseUrl}/patients/${patientA1.id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenAdminA}`,
    },
    body: JSON.stringify({ isActive: false }),
  });

  assert.equal(deactRes.status, 200);
  const deactData = await deactRes.json();
  assert.equal(deactData.data.isActive, false);

  // Reactivate
  const reactRes = await fetch(`${baseUrl}/patients/${patientA1.id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenAdminA}`,
    },
    body: JSON.stringify({ isActive: true }),
  });

  assert.equal(reactRes.status, 200);
  const reactData = await reactRes.json();
  assert.equal(reactData.data.isActive, true);
});

// ==========================================
// 5. MANDATORY CROSS-TENANT ISOLATION TESTS (Section 38)
// ==========================================
test('TENANT ISOLATION - Admin A sees only Hospital A patients (A1, A2) and NOT Hospital B patient (B1)', async () => {
  const res = await fetch(`${baseUrl}/patients`, {
    headers: { Authorization: `Bearer ${tokenAdminA}` },
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  const patientIds = data.data.patients.map((p) => p.id);

  assert.ok(patientIds.includes(patientA1.id), 'Admin A must see Patient A1');
  assert.ok(patientIds.includes(patientA2.id), 'Admin A must see Patient A2');
  assert.ok(!patientIds.includes(patientB1.id), 'Admin A must NEVER see Patient B1');
});

test('TENANT ISOLATION - Admin B sees only Hospital B patient (B1) and NOT Hospital A patients', async () => {
  const res = await fetch(`${baseUrl}/patients`, {
    headers: { Authorization: `Bearer ${tokenAdminB}` },
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  const patientIds = data.data.patients.map((p) => p.id);

  assert.ok(patientIds.includes(patientB1.id), 'Admin B must see Patient B1');
  assert.ok(!patientIds.includes(patientA1.id), 'Admin B must NOT see Patient A1');
  assert.ok(!patientIds.includes(patientA2.id), 'Admin B must NOT see Patient A2');
});

test('TENANT ISOLATION - Admin A -> GET /api/patients/:idB returns 404 (does NOT leak existence)', async () => {
  const res = await fetch(`${baseUrl}/patients/${patientB1.id}`, {
    headers: { Authorization: `Bearer ${tokenAdminA}` },
  });

  assert.equal(res.status, 404);
  const data = await res.json();
  assert.equal(data.message, 'Patient not found');
});

test('TENANT ISOLATION - Admin A -> PATCH /api/patients/:idB returns 404', async () => {
  const res = await fetch(`${baseUrl}/patients/${patientB1.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenAdminA}`,
    },
    body: JSON.stringify({ firstName: 'AttemptedCrossTenantUpdate' }),
  });

  assert.equal(res.status, 404);
  const data = await res.json();
  assert.equal(data.message, 'Patient not found');
});

test('TENANT ISOLATION - Admin A -> PATCH /api/patients/:idB/status returns 404', async () => {
  const res = await fetch(`${baseUrl}/patients/${patientB1.id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenAdminA}`,
    },
    body: JSON.stringify({ isActive: false }),
  });

  assert.equal(res.status, 404);
  const data = await res.json();
  assert.equal(data.message, 'Patient not found');
});

// ==========================================
// 6. Search, Filter, and Pagination Tests
// ==========================================
test('GET /api/patients - Search by UHID (case-insensitive)', async () => {
  const res = await fetch(`${baseUrl}/patients?search=alph-000001`, {
    headers: { Authorization: `Bearer ${tokenAdminA}` },
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.data.patients.length, 1);
  assert.equal(data.data.patients[0].id, patientA1.id);
});

test('GET /api/patients - Search by Name (case-insensitive)', async () => {
  const res = await fetch(`${baseUrl}/patients?search=priya`, {
    headers: { Authorization: `Bearer ${tokenAdminA}` },
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.data.patients.length, 1);
  assert.equal(data.data.patients[0].id, patientA2.id);
});

test('GET /api/patients - Filter by gender and bloodGroup', async () => {
  const res = await fetch(`${baseUrl}/patients?gender=MALE&bloodGroup=O_POSITIVE`, {
    headers: { Authorization: `Bearer ${tokenAdminA}` },
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.data.patients.length, 1);
  assert.equal(data.data.patients[0].id, patientA1.id);
});

test('GET /api/patients - Pagination limit capped at 100', async () => {
  const res = await fetch(`${baseUrl}/patients?limit=500`, {
    headers: { Authorization: `Bearer ${tokenAdminA}` },
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.data.pagination.limit, 100);
});

// ==========================================
// 7. Hospital Admin Dashboard Metrics
// ==========================================
test('GET /api/hospital-admin/dashboard - Returns aggregate metrics strictly for authenticated hospital', async () => {
  const res = await fetch(`${baseUrl}/hospital-admin/dashboard`, {
    headers: { Authorization: `Bearer ${tokenAdminA}` },
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.data.metrics.totalPatients, 2);
  assert.equal(data.data.metrics.activePatients, 2);
  assert.equal(data.data.metrics.newPatientsThisMonth, 2);
  assert.equal(data.data.metrics.totalStaff, 4); // Admin, Recep, Doctor, Nurse
  assert.equal(data.data.metrics.totalDoctors, 1);
  assert.equal(data.data.metrics.totalNurses, 1);
  assert.equal(data.data.metrics.totalReceptionists, 1);
  assert.equal(data.data.hospital.id, hospitalA.id);
  assert.equal(data.data.hospital.name, 'Hospital Alpha Care');
});
