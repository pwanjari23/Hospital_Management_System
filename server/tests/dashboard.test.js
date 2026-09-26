import test from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, stopTestServer, setupTestDatabase } from './testHelper.js';
import { generateAccessToken } from '../src/utils/jwt.js';
import { Hospital } from '../src/models/index.js';

let baseUrl;
let superAdminToken;
let doctorToken;

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
});

test.after(async () => {
  await stopTestServer();
});

test('GET /api/super-admin/dashboard - Returns real aggregate metrics and recent hospitals', async () => {
  const res = await fetch(`${baseUrl}/super-admin/dashboard`, {
    headers: { Authorization: `Bearer ${superAdminToken}` },
  });

  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.success, true);

  const { metrics, recentHospitals } = body.data;
  assert.ok(typeof metrics.totalHospitals === 'number');
  assert.ok(typeof metrics.activeHospitals === 'number');
  assert.ok(typeof metrics.inactiveHospitals === 'number');
  assert.ok(typeof metrics.addedThisMonth === 'number');

  // Verify counts match PostgreSQL
  const dbTotal = await Hospital.count();
  const dbActive = await Hospital.count({ where: { status: 'ACTIVE' } });
  const dbInactive = await Hospital.count({ where: { status: 'INACTIVE' } });

  assert.equal(metrics.totalHospitals, dbTotal);
  assert.equal(metrics.activeHospitals, dbActive);
  assert.equal(metrics.inactiveHospitals, dbInactive);
  assert.equal(metrics.totalHospitals, metrics.activeHospitals + metrics.inactiveHospitals);

  // Recent hospitals checks
  assert.ok(Array.isArray(recentHospitals));
  assert.ok(recentHospitals.length <= 5);

  if (recentHospitals.length >= 2) {
    const firstDate = new Date(recentHospitals[0].createdAt).getTime();
    const secondDate = new Date(recentHospitals[1].createdAt).getTime();
    assert.ok(firstDate >= secondDate, 'Recent hospitals must be ordered by createdAt DESC');
  }
});

test('GET /api/super-admin/dashboard - Missing token returns 401', async () => {
  const res = await fetch(`${baseUrl}/super-admin/dashboard`);
  const body = await res.json();
  assert.equal(res.status, 401);
  assert.equal(body.success, false);
});

test('GET /api/super-admin/dashboard - Non-Super-Admin receives 403 Forbidden', async () => {
  const res = await fetch(`${baseUrl}/super-admin/dashboard`, {
    headers: { Authorization: `Bearer ${doctorToken}` },
  });

  const body = await res.json();
  assert.equal(res.status, 403);
  assert.equal(body.success, false);
});
