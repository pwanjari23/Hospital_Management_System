import test from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, stopTestServer, setupTestDatabase } from './testHelper.js';
import { generateAccessToken } from '../src/utils/jwt.js';
import { Hospital, HospitalSetting } from '../src/models/index.js';

let baseUrl;
let superAdminToken;
let doctorToken;
let existingHospital;

test.before(async () => {
  const db = await setupTestDatabase();
  const server = await startTestServer();
  baseUrl = server.baseUrl;

  superAdminToken = generateAccessToken({
    userId: db.superAdmin.id,
    role: 'SUPER_ADMIN',
    scope: 'PLATFORM',
  });

  doctorToken = generateAccessToken({
    userId: db.doctorUser.id,
    role: 'DOCTOR',
    scope: 'HOSPITAL',
  });

  // Ensure deterministic base hospital for detail/patch tests
  const oldHospital = await Hospital.findOne({ where: { slug: 'crud-base-hospital' } });
  if (oldHospital) {
    await HospitalSetting.destroy({ where: { hospitalId: oldHospital.id } });
    await Hospital.destroy({ where: { id: oldHospital.id } });
  }

  existingHospital = await Hospital.create({
    name: 'Crud Base Hospital',
    slug: 'crud-base-hospital',
    city: 'Nagpur',
    status: 'ACTIVE',
  });
  await HospitalSetting.create({
    hospitalId: existingHospital.id,
    key: 'hospitalName',
    value: 'Crud Base Hospital',
  });
});

test.after(async () => {
  if (existingHospital) {
    await HospitalSetting.destroy({ where: { hospitalId: existingHospital.id } });
    await Hospital.destroy({ where: { id: existingHospital.id } });
  }
  await stopTestServer();
});

test('POST /api/hospitals - Super Admin creates hospital with transaction & settings', async () => {
  const uniqueName = `Unique Care Hospital ${Date.now()}`;
  const res = await fetch(`${baseUrl}/hospitals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${superAdminToken}`,
    },
    body: JSON.stringify({
      name: uniqueName,
      email: 'contact@uniquecare.com',
      phone: '+91 9876543210',
      address: '123 Health Ave',
      city: 'Nagpur',
      state: 'Maharashtra',
      country: 'India',
      postalCode: '440001',
    }),
  });

  const body = await res.json();
  assert.equal(res.status, 201);
  assert.equal(body.success, true);
  assert.equal(body.data.name, uniqueName);
  assert.equal(body.data.city, 'Nagpur');
  assert.equal(body.data.status, 'ACTIVE');

  // Verify settings were created in same transaction
  assert.ok(Array.isArray(body.data.settings));
  assert.ok(body.data.settings.length >= 4);
  const primaryColorSetting = body.data.settings.find((s) => s.key === 'primaryColor');
  assert.equal(primaryColorSetting.value, '#2563EB');
});

test('POST /api/hospitals - Duplicate hospital name is allowed with unique incremented slug', async () => {
  const sharedName = `Shared Name Hospital ${Date.now()}`;

  // First hospital with this name
  const res1 = await fetch(`${baseUrl}/hospitals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${superAdminToken}`,
    },
    body: JSON.stringify({
      name: sharedName,
      city: 'Nagpur',
    }),
  });
  const body1 = await res1.json();
  assert.equal(res1.status, 201);

  // Second hospital with exact same name
  const res2 = await fetch(`${baseUrl}/hospitals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${superAdminToken}`,
    },
    body: JSON.stringify({
      name: sharedName,
      city: 'Pune',
    }),
  });
  const body2 = await res2.json();
  assert.equal(res2.status, 201);
  assert.equal(body2.data.name, sharedName);
  assert.notEqual(body1.data.slug, body2.data.slug);
  assert.ok(body2.data.slug.startsWith(body1.data.slug));
});

test('POST /api/hospitals - Missing name returns 400 validation error', async () => {
  const res = await fetch(`${baseUrl}/hospitals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${superAdminToken}`,
    },
    body: JSON.stringify({
      city: 'Nagpur',
    }),
  });

  const body = await res.json();
  assert.equal(res.status, 400);
  assert.equal(body.success, false);
  assert.ok(body.errors?.name);
});

test('POST /api/hospitals - Invalid email format returns 400', async () => {
  const res = await fetch(`${baseUrl}/hospitals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${superAdminToken}`,
    },
    body: JSON.stringify({
      name: 'Valid Name Hospital',
      email: 'not-an-email',
    }),
  });

  const body = await res.json();
  assert.equal(res.status, 400);
  assert.equal(body.success, false);
  assert.ok(body.errors?.email);
});

test('POST /api/hospitals - Non-Super-Admin receives 403 Forbidden', async () => {
  const res = await fetch(`${baseUrl}/hospitals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${doctorToken}`,
    },
    body: JSON.stringify({
      name: 'Unauthorized Hospital',
    }),
  });

  const body = await res.json();
  assert.equal(res.status, 403);
  assert.equal(body.success, false);
});

test('POST /api/hospitals - Unauthenticated request receives 401', async () => {
  const res = await fetch(`${baseUrl}/hospitals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'No Token Hospital' }),
  });

  const body = await res.json();
  assert.equal(res.status, 401);
  assert.equal(body.success, false);
});

test('GET /api/hospitals/:id - Retrieves full hospital details with settings', async () => {
  const res = await fetch(`${baseUrl}/hospitals/${existingHospital.id}`, {
    headers: { Authorization: `Bearer ${superAdminToken}` },
  });

  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.id, existingHospital.id);
  assert.equal(body.data.name, 'Crud Base Hospital');
  assert.ok(Array.isArray(body.data.settings));
});

test('GET /api/hospitals/:id - Returns 404 for non-existent hospital UUID', async () => {
  const res = await fetch(`${baseUrl}/hospitals/00000000-0000-0000-0000-000000000999`, {
    headers: { Authorization: `Bearer ${superAdminToken}` },
  });

  const body = await res.json();
  assert.equal(res.status, 404);
  assert.equal(body.success, false);
  assert.equal(body.message, 'Hospital not found');
});

test('PATCH /api/hospitals/:id - Updates whitelisted fields', async () => {
  const res = await fetch(`${baseUrl}/hospitals/${existingHospital.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${superAdminToken}`,
    },
    body: JSON.stringify({
      city: 'Mumbai',
      phone: '+91 1122334455',
    }),
  });

  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.city, 'Mumbai');
  assert.equal(body.data.phone, '+91 1122334455');
});

test('PATCH /api/hospitals/:id - Rejects forbidden/internal fields', async () => {
  const res = await fetch(`${baseUrl}/hospitals/${existingHospital.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${superAdminToken}`,
    },
    body: JSON.stringify({
      id: '00000000-0000-0000-0000-000000000001',
      status: 'SUSPENDED',
    }),
  });

  const body = await res.json();
  assert.equal(res.status, 400);
  assert.equal(body.success, false);
});

test('PATCH /api/hospitals/:id - Rejects empty PATCH with 400', async () => {
  const res = await fetch(`${baseUrl}/hospitals/${existingHospital.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${superAdminToken}`,
    },
    body: JSON.stringify({}),
  });

  const body = await res.json();
  assert.equal(res.status, 400);
  assert.equal(body.success, false);
});

test('PATCH /api/hospitals/:id/status - Transitions ACTIVE to INACTIVE without data deletion', async () => {
  const res = await fetch(`${baseUrl}/hospitals/${existingHospital.id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${superAdminToken}`,
    },
    body: JSON.stringify({ status: 'INACTIVE' }),
  });

  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.status, 'INACTIVE');

  // Verify hospital and settings remain intact in database
  const inDb = await Hospital.findByPk(existingHospital.id);
  assert.ok(inDb !== null);
  assert.equal(inDb.status, 'INACTIVE');

  const settingsCount = await HospitalSetting.count({ where: { hospitalId: existingHospital.id } });
  assert.ok(settingsCount >= 1, 'Hospital settings must remain intact upon deactivation');
});

test('PATCH /api/hospitals/:id/status - Transitions INACTIVE back to ACTIVE', async () => {
  const res = await fetch(`${baseUrl}/hospitals/${existingHospital.id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${superAdminToken}`,
    },
    body: JSON.stringify({ status: 'ACTIVE' }),
  });

  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.status, 'ACTIVE');
});

test('PATCH /api/hospitals/:id/status - Rejects invalid status string', async () => {
  const res = await fetch(`${baseUrl}/hospitals/${existingHospital.id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${superAdminToken}`,
    },
    body: JSON.stringify({ status: 'INVALID_STATUS' }),
  });

  const body = await res.json();
  assert.equal(res.status, 400);
  assert.equal(body.success, false);
});
