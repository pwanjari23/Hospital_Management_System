import test from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, stopTestServer, setupTestDatabase } from './testHelper.js';
import { generateAccessToken } from '../src/utils/jwt.js';
import { Hospital, HospitalSetting, User, UserRole, Role } from '../src/models/index.js';

let baseUrl;
let superAdminToken;
let createdHospitalId;
let adminEmailAddress;
const testPassword = 'AdminSecret2026!';

test.before(async () => {
  const db = await setupTestDatabase();
  const server = await startTestServer();
  baseUrl = server.baseUrl;

  superAdminToken = generateAccessToken({
    userId: db.superAdmin.id,
    role: 'SUPER_ADMIN',
    scope: 'PLATFORM',
  });
});

test.after(async () => {
  if (createdHospitalId) {
    const users = await User.findAll({ where: { hospitalId: createdHospitalId } });
    for (const u of users) {
      await UserRole.destroy({ where: { userId: u.id } });
      await User.destroy({ where: { id: u.id } });
    }
    await HospitalSetting.destroy({ where: { hospitalId: createdHospitalId } });
    await Hospital.destroy({ where: { id: createdHospitalId } });
  }
  await stopTestServer();
});

test('POST /api/hospitals - Atomically creates hospital and provisions initial admin', async () => {
  const uniqueSuffix = Date.now();
  adminEmailAddress = `admin.${uniqueSuffix}@integratedcare.org`;

  const payload = {
    name: `Integrated Care ${uniqueSuffix}`,
    slug: `integrated-care-${uniqueSuffix}`,
    email: `contact.${uniqueSuffix}@integratedcare.org`,
    phone: '+91 99887 76655',
    city: 'Hyderabad',
    state: 'Telangana',
    country: 'India',
    adminName: 'Chief Administrator',
    adminEmail: adminEmailAddress,
    adminPassword: testPassword,
  };

  const res = await fetch(`${baseUrl}/hospitals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${superAdminToken}`,
    },
    body: JSON.stringify(payload),
  });

  assert.equal(res.status, 201);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(data.data.id);
  assert.equal(data.data.name, payload.name);
  assert.ok(data.data.adminUser, 'adminUser should be present in response');
  assert.equal(data.data.adminUser.email, adminEmailAddress);
  assert.equal(data.data.adminUser.role, 'HOSPITAL_ADMIN');

  createdHospitalId = data.data.id;

  // Verify settings seeded
  const settings = await HospitalSetting.findAll({ where: { hospitalId: createdHospitalId } });
  const settingKeys = settings.map((s) => s.key);
  assert.ok(settingKeys.includes('module_pharmacy'));
  assert.ok(settingKeys.includes('module_inpatient'));
  assert.ok(settingKeys.includes('module_billing'));
});

test('GET /api/hospitals/:id/users - Super Admin retrieves hospital roster', async () => {
  const res = await fetch(`${baseUrl}/hospitals/${createdHospitalId}/users`, {
    headers: {
      Authorization: `Bearer ${superAdminToken}`,
    },
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(Array.isArray(data.data));
  assert.ok(data.data.length >= 1);
  assert.equal(data.data[0].email, adminEmailAddress);
});

test('POST /api/hospitals/:id/users - Provisions a new staff user (DOCTOR)', async () => {
  const doctorEmail = `doc.${Date.now()}@integratedcare.org`;
  const res = await fetch(`${baseUrl}/hospitals/${createdHospitalId}/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${superAdminToken}`,
    },
    body: JSON.stringify({
      name: 'Dr. John Watson',
      email: doctorEmail,
      password: 'DoctorSecret2026!',
      role: 'DOCTOR',
    }),
  });

  assert.equal(res.status, 201);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.data.email, doctorEmail);
  assert.equal(data.data.roles[0].name, 'DOCTOR');
});

test('PUT /api/hospitals/:id/settings - Updates module toggles', async () => {
  const res = await fetch(`${baseUrl}/hospitals/${createdHospitalId}/settings`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${superAdminToken}`,
    },
    body: JSON.stringify({
      settings: {
        module_pharmacy: false,
        module_laboratory: true,
      },
    }),
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(Array.isArray(data.data));
  const pharmacy = data.data.find((s) => s.key === 'module_pharmacy');
  const lab = data.data.find((s) => s.key === 'module_laboratory');
  assert.equal(pharmacy?.value, 'false');
  assert.equal(lab?.value, 'true');
});

test('POST /api/auth/hospital-login - Newly provisioned admin can log in', async () => {
  const res = await fetch(`${baseUrl}/auth/hospital-login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: adminEmailAddress,
      password: testPassword,
    }),
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(data.data.accessToken);
  assert.equal(data.data.user.email, adminEmailAddress);
  assert.equal(data.data.user.role, 'HOSPITAL_ADMIN');
  assert.equal(data.data.user.hospitalId, createdHospitalId);
});
