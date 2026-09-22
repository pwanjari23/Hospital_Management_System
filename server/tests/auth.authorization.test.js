import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import env from '../src/config/env.js';
import { startTestServer, stopTestServer, setupTestDatabase } from './testHelper.js';
import { generateAccessToken } from '../src/utils/jwt.js';
import { requireSuperAdmin } from '../src/middleware/auth.middleware.js';
import { User } from '../src/models/index.js';

let baseUrl;
let dbFixtures;

test.before(async () => {
  dbFixtures = await setupTestDatabase();
  const server = await startTestServer();
  baseUrl = server.baseUrl;
});

test.after(async () => {
  await stopTestServer();
});

test('Authorization - requireSuperAdmin permits valid Platform Super Admin', () => {
  const req = {
    user: {
      id: dbFixtures.superAdmin.id,
      email: 'admin@example.com',
      hospitalId: null,
      status: 'ACTIVE',
      roles: [{ name: 'SUPER_ADMIN', scope: 'PLATFORM' }],
    },
  };
  let nextCalled = false;
  const res = {};
  const next = () => {
    nextCalled = true;
  };

  requireSuperAdmin(req, res, next);
  assert.equal(nextCalled, true);
});

test('Authorization - requireSuperAdmin denies user with non-platform hospitalId', () => {
  const req = {
    user: {
      id: 'fake-id',
      email: 'admin@example.com',
      hospitalId: dbFixtures.hospital.id, // Not null!
      status: 'ACTIVE',
      roles: [{ name: 'SUPER_ADMIN', scope: 'PLATFORM' }],
    },
  };
  let statusCode = null;
  let responseData = null;
  const res = {
    status: (code) => {
      statusCode = code;
      return {
        json: (data) => {
          responseData = data;
        },
      };
    },
  };
  const next = () => {};

  requireSuperAdmin(req, res, next);
  assert.equal(statusCode, 403);
  assert.equal(responseData.success, false);
});

test('Authorization - requireSuperAdmin denies non-SUPER_ADMIN role', () => {
  const req = {
    user: {
      id: dbFixtures.doctorUser.id,
      email: 'doctor.alice@example.com',
      hospitalId: null,
      status: 'ACTIVE',
      roles: [{ name: 'DOCTOR', scope: 'HOSPITAL' }],
    },
  };
  let statusCode = null;
  let responseData = null;
  const res = {
    status: (code) => {
      statusCode = code;
      return {
        json: (data) => {
          responseData = data;
        },
      };
    },
  };
  const next = () => {};

  requireSuperAdmin(req, res, next);
  assert.equal(statusCode, 403);
  assert.equal(responseData.success, false);
});

test('Authorization - Expired access token is rejected with 401', async () => {
  // Generate intentionally expired token
  const expiredToken = jwt.sign(
    { userId: dbFixtures.superAdmin.id, role: 'SUPER_ADMIN', scope: 'PLATFORM' },
    env.jwt.accessSecret,
    { expiresIn: '0s' }
  );

  // Give 10ms for clock
  await new Promise((r) => setTimeout(r, 20));

  const res = await fetch(`${baseUrl}/auth/me`, {
    headers: {
      Authorization: `Bearer ${expiredToken}`,
    },
  });

  const body = await res.json();
  assert.equal(res.status, 401);
  assert.equal(body.success, false);
  assert.match(body.message, /expired/i);
});

test('Database Constraint - Duplicate Platform Super Admin email is rejected by partial unique index', async () => {
  // admin@example.com already exists with hospitalId: null
  let threw = false;
  try {
    await User.create({
      name: 'Duplicate Admin',
      email: 'admin@example.com',
      passwordHash: 'dummy_hash',
      hospitalId: null,
      status: 'ACTIVE',
    });
  } catch (err) {
    threw = true;
    assert.ok(err.name === 'SequelizeUniqueConstraintError' || err.message.includes('unique'));
  }
  assert.equal(threw, true, 'Duplicate platform user with same email should be rejected');
});
