import http from 'http';
import app from '../src/app.js';
import { sequelize, User, Role, Hospital, UserRole } from '../src/models/index.js';
import { hashPassword } from '../src/utils/password.js';

let serverInstance = null;
let serverPort = null;

export const startTestServer = async () => {
  if (!serverInstance) {
    await new Promise((resolve) => {
      serverInstance = http.createServer(app);
      serverInstance.listen(0, '127.0.0.1', () => {
        serverPort = serverInstance.address().port;
        resolve();
      });
    });
  }
  return {
    baseUrl: `http://127.0.0.1:${serverPort}/api`,
  };
};

export const stopTestServer = async () => {
  if (serverInstance) {
    await new Promise((resolve) => serverInstance.close(resolve));
    serverInstance = null;
    serverPort = null;
  }
};

export const setupTestDatabase = async () => {
  await sequelize.authenticate();

  // 1. Ensure SUPER_ADMIN role exists
  const [superAdminRole] = await Role.findOrCreate({
    where: { name: 'SUPER_ADMIN' },
    defaults: {
      name: 'SUPER_ADMIN',
      description: 'Platform super administrator',
      scope: 'PLATFORM',
    },
  });

  // 2. Ensure DOCTOR role exists
  const [doctorRole] = await Role.findOrCreate({
    where: { name: 'DOCTOR' },
    defaults: {
      name: 'DOCTOR',
      description: 'Medical Doctor',
      scope: 'HOSPITAL',
    },
  });

  // 3. Ensure test hospital exists for hospital-scoped users
  const [hospital] = await Hospital.findOrCreate({
    where: { slug: 'test-auth-hospital' },
    defaults: {
      name: 'Test Auth Hospital',
      slug: 'test-auth-hospital',
      status: 'ACTIVE',
    },
  });

  const hashedPw = await hashPassword('SuperAdmin2026!');

  // 4. Ensure active Super Admin
  const [superAdmin] = await User.findOrCreate({
    where: { email: 'admin@example.com', hospitalId: null },
    defaults: {
      name: 'Platform Admin',
      email: 'admin@example.com',
      passwordHash: hashedPw,
      hospitalId: null,
      status: 'ACTIVE',
    },
  });
  await UserRole.findOrCreate({
    where: { userId: superAdmin.id, roleId: superAdminRole.id },
  });

  // 5. Ensure inactive Super Admin
  const [inactiveAdmin] = await User.findOrCreate({
    where: { email: 'inactive.admin@example.com', hospitalId: null },
    defaults: {
      name: 'Inactive Admin',
      email: 'inactive.admin@example.com',
      passwordHash: hashedPw,
      hospitalId: null,
      status: 'INACTIVE',
    },
  });
  await UserRole.findOrCreate({
    where: { userId: inactiveAdmin.id, roleId: superAdminRole.id },
  });

  // 6. Ensure hospital user (non-super-admin, scoped to hospital)
  const [doctorUser] = await User.findOrCreate({
    where: { email: 'doctor.alice@example.com', hospitalId: hospital.id },
    defaults: {
      name: 'Dr. Alice',
      email: 'doctor.alice@example.com',
      passwordHash: hashedPw,
      hospitalId: hospital.id,
      status: 'ACTIVE',
    },
  });
  await UserRole.findOrCreate({
    where: { userId: doctorUser.id, roleId: doctorRole.id },
  });

  return {
    superAdmin,
    inactiveAdmin,
    doctorUser,
    hospital,
  };
};

export default {
  startTestServer,
  stopTestServer,
  setupTestDatabase,
};
