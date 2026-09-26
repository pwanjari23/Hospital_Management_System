import test from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, stopTestServer, setupTestDatabase } from './testHelper.js';
import { generateAccessToken } from '../src/utils/jwt.js';
import { Hospital } from '../src/models/index.js';

let baseUrl;
let superAdminToken;

test.before(async () => {
  const db = await setupTestDatabase();
  const server = await startTestServer();
  baseUrl = server.baseUrl;

  superAdminToken = generateAccessToken({
    userId: db.superAdmin.id,
    role: 'SUPER_ADMIN',
    scope: 'PLATFORM',
  });

  // Seed sample hospitals for filtering/search tests
  await Hospital.findOrCreate({
    where: { slug: 'apollo-gleneagles' },
    defaults: {
      name: 'Apollo Gleneagles Hospital',
      slug: 'apollo-gleneagles',
      city: 'Kolkata',
      status: 'ACTIVE',
    },
  });

  await Hospital.findOrCreate({
    where: { slug: 'fortis-healthcare' },
    defaults: {
      name: 'Fortis Healthcare Center',
      slug: 'fortis-healthcare',
      city: 'Delhi',
      status: 'ACTIVE',
    },
  });

  await Hospital.findOrCreate({
    where: { slug: 'heritage-clinic' },
    defaults: {
      name: 'Heritage Community Clinic',
      slug: 'heritage-clinic',
      city: 'Kolkata',
      status: 'INACTIVE',
    },
  });
});

test.after(async () => {
  await stopTestServer();
});

test('GET /api/hospitals - Returns paginated list with metadata', async () => {
  const res = await fetch(`${baseUrl}/hospitals?page=1&limit=2`, {
    headers: { Authorization: `Bearer ${superAdminToken}` },
  });

  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.hospitals.length, 2);
  assert.equal(body.data.pagination.page, 1);
  assert.equal(body.data.pagination.limit, 2);
  assert.ok(body.data.pagination.total >= 3);
  assert.ok(body.data.pagination.totalPages >= 2);
});

test('GET /api/hospitals - Caps maximum limit at 100', async () => {
  const res = await fetch(`${baseUrl}/hospitals?limit=500`, {
    headers: { Authorization: `Bearer ${superAdminToken}` },
  });

  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.data.pagination.limit, 100);
});

test('GET /api/hospitals - Case-insensitive search by name (iLike)', async () => {
  const res = await fetch(`${baseUrl}/hospitals?search=apollo`, {
    headers: { Authorization: `Bearer ${superAdminToken}` },
  });

  const body = await res.json();
  assert.equal(res.status, 200);
  assert.ok(body.data.hospitals.length >= 1);
  assert.ok(body.data.hospitals.some((h) => h.name.includes('Apollo')));
});

test('GET /api/hospitals - Case-insensitive search by city (iLike)', async () => {
  const res = await fetch(`${baseUrl}/hospitals?search=delhi`, {
    headers: { Authorization: `Bearer ${superAdminToken}` },
  });

  const body = await res.json();
  assert.equal(res.status, 200);
  assert.ok(body.data.hospitals.length >= 1);
  assert.ok(body.data.hospitals.some((h) => h.city === 'Delhi'));
});

test('GET /api/hospitals - Filter by status ACTIVE', async () => {
  const res = await fetch(`${baseUrl}/hospitals?status=ACTIVE`, {
    headers: { Authorization: `Bearer ${superAdminToken}` },
  });

  const body = await res.json();
  assert.equal(res.status, 200);
  assert.ok(body.data.hospitals.length >= 1);
  assert.ok(body.data.hospitals.every((h) => h.status === 'ACTIVE'));
});

test('GET /api/hospitals - Filter by status INACTIVE', async () => {
  const res = await fetch(`${baseUrl}/hospitals?status=INACTIVE`, {
    headers: { Authorization: `Bearer ${superAdminToken}` },
  });

  const body = await res.json();
  assert.equal(res.status, 200);
  assert.ok(body.data.hospitals.length >= 1);
  assert.ok(body.data.hospitals.every((h) => h.status === 'INACTIVE'));
});

test('GET /api/hospitals - Empty result for non-matching query', async () => {
  const res = await fetch(`${baseUrl}/hospitals?search=nonexistent_hospital_name_xyz`, {
    headers: { Authorization: `Bearer ${superAdminToken}` },
  });

  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.data.hospitals.length, 0);
  assert.equal(body.data.pagination.total, 0);
});
