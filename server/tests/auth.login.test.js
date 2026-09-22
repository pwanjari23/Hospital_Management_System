import test from 'node:test';
import assert from 'node:assert/strict';
import { startTestServer, stopTestServer, setupTestDatabase } from './testHelper.js';

let baseUrl;

test.before(async () => {
  await setupTestDatabase();
  const server = await startTestServer();
  baseUrl = server.baseUrl;
});

test.after(async () => {
  await stopTestServer();
});

test('POST /api/auth/login - Valid Super Admin login succeeds', async () => {
  const res = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@example.com',
      password: 'SuperAdmin2026!',
    }),
  });

  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.message, 'Login successful');
  assert.ok(body.data.accessToken);
  assert.equal(body.data.user.email, 'admin@example.com');
  assert.equal(body.data.user.role, 'SUPER_ADMIN');
  assert.equal(body.data.user.scope, 'PLATFORM');
  assert.equal(body.data.user.passwordHash, undefined);
  assert.equal(body.data.user.password_hash, undefined);
});

test('POST /api/auth/login - Email is case-insensitive and trimmed', async () => {
  const res = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: '  Admin@Example.COM  ',
      password: 'SuperAdmin2026!',
    }),
  });

  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.user.email, 'admin@example.com');
});

test('POST /api/auth/login - Wrong password returns generic 401', async () => {
  const res = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@example.com',
      password: 'WrongPassword!',
    }),
  });

  const body = await res.json();
  assert.equal(res.status, 401);
  assert.equal(body.success, false);
  assert.equal(body.message, 'Invalid email or password.');
});

test('POST /api/auth/login - Non-existent user returns generic 401', async () => {
  const res = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'unknown@example.com',
      password: 'SuperAdmin2026!',
    }),
  });

  const body = await res.json();
  assert.equal(res.status, 401);
  assert.equal(body.success, false);
  assert.equal(body.message, 'Invalid email or password.');
});

test('POST /api/auth/login - Inactive user returns generic 401', async () => {
  const res = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'inactive.admin@example.com',
      password: 'SuperAdmin2026!',
    }),
  });

  const body = await res.json();
  assert.equal(res.status, 401);
  assert.equal(body.success, false);
  assert.equal(body.message, 'Invalid email or password.');
});

test('POST /api/auth/login - Hospital tenant user cannot log in to Platform Super Admin', async () => {
  const res = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'doctor.alice@example.com',
      password: 'SuperAdmin2026!',
    }),
  });

  const body = await res.json();
  assert.equal(res.status, 401);
  assert.equal(body.success, false);
  assert.equal(body.message, 'Invalid email or password.');
});

test('POST /api/auth/login - Missing email returns 400 validation error', async () => {
  const res = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      password: 'SuperAdmin2026!',
    }),
  });

  const body = await res.json();
  assert.equal(res.status, 400);
  assert.equal(body.success, false);
  assert.ok(body.errors?.email);
});

test('POST /api/auth/login - Invalid email format returns 400 validation error', async () => {
  const res = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'not-an-email',
      password: 'SuperAdmin2026!',
    }),
  });

  const body = await res.json();
  assert.equal(res.status, 400);
  assert.equal(body.success, false);
  assert.ok(body.errors?.email);
});

test('POST /api/auth/login - Missing password returns 400 validation error', async () => {
  const res = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@example.com',
    }),
  });

  const body = await res.json();
  assert.equal(res.status, 400);
  assert.equal(body.success, false);
  assert.ok(body.errors?.password);
});
