import test from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, stopTestServer, setupTestDatabase } from './testHelper.js';
import { generateAccessToken } from '../src/utils/jwt.js';

let baseUrl;
let validToken;
let superAdminUser;

test.before(async () => {
  const db = await setupTestDatabase();
  superAdminUser = db.superAdmin;
  const server = await startTestServer();
  baseUrl = server.baseUrl;

  validToken = generateAccessToken({
    userId: superAdminUser.id,
    role: 'SUPER_ADMIN',
    scope: 'PLATFORM',
  });
});

test.after(async () => {
  await stopTestServer();
});

test('GET /api/auth/me - Authenticated request returns user profile', async () => {
  const res = await fetch(`${baseUrl}/auth/me`, {
    headers: {
      Authorization: `Bearer ${validToken}`,
    },
  });

  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.id, superAdminUser.id);
  assert.equal(body.data.email, 'admin@example.com');
  assert.equal(body.data.role, 'SUPER_ADMIN');
  assert.equal(body.data.scope, 'PLATFORM');
  assert.equal(body.data.passwordHash, undefined);
});

test('GET /api/auth/me - Missing Authorization header returns 401', async () => {
  const res = await fetch(`${baseUrl}/auth/me`);
  const body = await res.json();
  assert.equal(res.status, 401);
  assert.equal(body.success, false);
});

test('GET /api/auth/me - Malformed Bearer header returns 401', async () => {
  const res = await fetch(`${baseUrl}/auth/me`, {
    headers: {
      Authorization: 'Basic invalidcredentials',
    },
  });
  const body = await res.json();
  assert.equal(res.status, 401);
  assert.equal(body.success, false);
});

test('GET /api/auth/me - Invalid JWT signature returns 401', async () => {
  const res = await fetch(`${baseUrl}/auth/me`, {
    headers: {
      Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
    },
  });
  const body = await res.json();
  assert.equal(res.status, 401);
  assert.equal(body.success, false);
});

test('POST /api/auth/logout - Valid token successfully logs out', async () => {
  const res = await fetch(`${baseUrl}/auth/logout`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${validToken}`,
    },
  });

  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.message, 'Logged out successfully');
});

test('POST /api/auth/logout - Missing token returns 401', async () => {
  const res = await fetch(`${baseUrl}/auth/logout`, {
    method: 'POST',
  });
  const body = await res.json();
  assert.equal(res.status, 401);
  assert.equal(body.success, false);
});
