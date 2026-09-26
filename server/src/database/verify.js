import {
  sequelize,
  Hospital,
  User,
  Role,
  Permission,
  RolePermission,
  UserRole,
  HospitalSetting,
} from '../models/index.js';
import { withTransaction } from '../utils/transaction.js';
import { scopeToTenant } from '../utils/tenantContext.js';

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

export const runVerification = async () => {
  console.log('\n============================================================');
  console.log('HMS Database Architecture & Multi-Tenancy Verification Suite');
  console.log('============================================================\n');

  try {
    await sequelize.authenticate();
    console.log('✓ Connected to PostgreSQL database.\n');
  } catch (error) {
    console.error('✗ Cannot run database verification: PostgreSQL is not reachable.');
    console.error(`  Reason: ${error.message}\n`);
    return false;
  }

  const createdHospitalIds = [];

  try {
    // Pre-clean any leftover test records from prior runs
    const existingTestHospitals = await Hospital.findAll({
      where: {
        slug: ['alpha-general-hospital', 'beta-medical-center', 'another-alpha-hospital'],
      },
    });
    if (existingTestHospitals.length > 0) {
      const ids = existingTestHospitals.map((h) => h.id);
      const testUsers = await User.findAll({ where: { hospitalId: ids }, attributes: ['id'] });
      if (testUsers.length > 0) {
        await UserRole.destroy({ where: { userId: testUsers.map((u) => u.id) } });
      }
      await User.destroy({ where: { hospitalId: ids } });
      await HospitalSetting.destroy({ where: { hospitalId: ids } });
      await Hospital.destroy({ where: { id: ids } });
    }

    // -------------------------------------------------------------
    // Suite 1: Hospital Model & Constraints
    // -------------------------------------------------------------
    console.log('--- 1. Testing Hospital Model & Constraints ---');
    const hospitalA = await Hospital.create({
      name: 'Alpha General Hospital',
      slug: 'alpha-general-hospital',
      status: 'ACTIVE',
    });
    createdHospitalIds.push(hospitalA.id);
    assert(Boolean(hospitalA.id), 'Hospital can be created with UUID');
    assert(hospitalA.slug === 'alpha-general-hospital', 'Hospital slug matches');

    // Auto slugification from name
    const hospitalB = await Hospital.create({
      name: 'Beta Medical Center',
    });
    createdHospitalIds.push(hospitalB.id);
    assert(hospitalB.slug === 'beta-medical-center', 'Hospital slug is automatically normalized');

    // Duplicate slug rejection
    await assertThrows(async () => {
      await Hospital.create({
        name: 'Another Alpha Hospital',
        slug: 'alpha-general-hospital',
      });
    }, 'Duplicate hospital slug is rejected');

    // Invalid status rejection
    await assertThrows(async () => {
      await Hospital.create({
        name: 'Invalid Hospital',
        slug: 'invalid-hospital',
        status: 'NON_EXISTENT_STATUS',
      });
    }, 'Invalid hospital status enum is rejected');

    // -------------------------------------------------------------
    // Suite 2: Role & Permission Models
    // -------------------------------------------------------------
    console.log('\n--- 2. Testing Role & Permission Models ---');
    const testRole = await Role.create({
      name: `TEST_CLINICAL_ROLE_${Date.now()}`,
      description: 'Test clinical role',
      scope: 'HOSPITAL',
    });
    assert(Boolean(testRole.id), 'Role can be created with UUID');

    // Duplicate role name rejection
    await assertThrows(async () => {
      await Role.create({
        name: testRole.name,
        scope: 'HOSPITAL',
      });
    }, 'Duplicate role name is rejected');

    // Invalid role scope rejection
    await assertThrows(async () => {
      await Role.create({
        name: `INVALID_ROLE_${Date.now()}`,
        scope: 'INVALID_SCOPE',
      });
    }, 'Invalid role scope enum is rejected');

    await Permission.destroy({ where: { name: 'test.custompermission' } });
    const testPermission = await Permission.create({
      name: 'test.custompermission',
      description: 'Test permission',
    });
    assert(Boolean(testPermission.id), 'Permission can be created with UUID');

    // Duplicate permission name rejection
    await assertThrows(async () => {
      await Permission.create({
        name: testPermission.name,
      });
    }, 'Duplicate permission name is rejected');

    // -------------------------------------------------------------
    // Suite 3: RolePermission Junction
    // -------------------------------------------------------------
    console.log('\n--- 3. Testing RolePermission Junction ---');
    const rolePerm = await RolePermission.create({
      roleId: testRole.id,
      permissionId: testPermission.id,
    });
    assert(
      rolePerm.roleId === testRole.id && rolePerm.permissionId === testPermission.id,
      'RolePermission assignment created'
    );

    // Duplicate role-permission assignment rejection
    await assertThrows(async () => {
      await RolePermission.create({
        roleId: testRole.id,
        permissionId: testPermission.id,
      });
    }, 'Duplicate role-permission assignment is rejected by composite PK');

    // -------------------------------------------------------------
    // Suite 4: User Model & Tenant-Scoped Email Uniqueness
    // -------------------------------------------------------------
    console.log('\n--- 4. Testing User Model & Tenant Email Uniqueness ---');

    // Platform user supports hospitalId = null (from Module 1)
    const platformUser = await User.create({
      name: 'Platform User',
      email: 'platform.test@hospital.com',
      passwordHash: 'dummy_hash_placeholder',
      hospitalId: null,
    });
    assert(platformUser.hospitalId === null, 'Platform user supports hospitalId = null');
    await platformUser.destroy();

    // User created under Hospital A
    const userA = await User.create({
      hospitalId: hospitalA.id,
      name: 'Dr. Alice',
      email: '  Alice@Hospital.COM  ', // Test trimming and lowercase
      passwordHash: 'secure_hash_placeholder_A',
      status: 'ACTIVE',
    });
    assert(
      userA.email === 'alice@hospital.com',
      'User email is normalized (trimmed and lowercased)'
    );

    // passwordHash is hidden by defaultScope and toJSON
    const serializedUser = userA.toJSON();
    assert(
      serializedUser.passwordHash === undefined && serializedUser.password_hash === undefined,
      'passwordHash is excluded from default serialization'
    );

    // Duplicate email within Hospital A MUST fail
    await assertThrows(async () => {
      await User.create({
        hospitalId: hospitalA.id,
        name: 'Dr. Alice Clone',
        email: 'alice@hospital.com',
        passwordHash: 'secure_hash_placeholder_dup',
      });
    }, 'Duplicate email within the same hospital is rejected');

    // Same email in Hospital B MUST succeed (Tenant-scoped uniqueness)
    const userB = await User.create({
      hospitalId: hospitalB.id,
      name: 'Dr. Bob Alice',
      email: 'alice@hospital.com',
      passwordHash: 'secure_hash_placeholder_B',
    });
    assert(
      userB.email === 'alice@hospital.com' && userB.hospitalId === hospitalB.id,
      'Same email address is permitted across different hospital tenants'
    );

    // -------------------------------------------------------------
    // Suite 5: UserRole Junction
    // -------------------------------------------------------------
    console.log('\n--- 5. Testing UserRole Junction ---');
    const userRole = await UserRole.create({
      userId: userA.id,
      roleId: testRole.id,
    });
    assert(
      userRole.userId === userA.id && userRole.roleId === testRole.id,
      'UserRole assignment created'
    );

    // Duplicate user-role assignment rejection
    await assertThrows(async () => {
      await UserRole.create({
        userId: userA.id,
        roleId: testRole.id,
      });
    }, 'Duplicate user-role assignment is rejected by composite PK');

    // -------------------------------------------------------------
    // Suite 6: HospitalSetting Model & Composite Uniqueness
    // -------------------------------------------------------------
    console.log('\n--- 6. Testing HospitalSetting Model ---');
    const settingA = await HospitalSetting.create({
      hospitalId: hospitalA.id,
      key: 'primary_color',
      value: '#0f766e',
    });
    assert(settingA.key === 'primary_color', 'HospitalSetting created');

    // Duplicate (hospitalId, key) must fail
    await assertThrows(async () => {
      await HospitalSetting.create({
        hospitalId: hospitalA.id,
        key: 'primary_color',
        value: '#3b82f6',
      });
    }, 'Duplicate setting key within same hospital is rejected');

    // Same key in Hospital B must succeed
    const settingB = await HospitalSetting.create({
      hospitalId: hospitalB.id,
      key: 'primary_color',
      value: '#3b82f6',
    });
    assert(
      settingB.hospitalId === hospitalB.id,
      'Same setting key permitted across different hospitals'
    );

    // -------------------------------------------------------------
    // Suite 7: Mandatory Cross-Tenant Isolation Test
    // -------------------------------------------------------------
    console.log('\n--- 7. Testing Cross-Tenant Isolation ---');
    // Hospital A context querying User B must return null
    const crossTenantQuery = await User.findOne({
      where: scopeToTenant({ id: userB.id }, hospitalA.id),
    });
    assert(
      crossTenantQuery === null,
      'CROSS-TENANT ISOLATION: Hospital A query for User B returns null'
    );

    // Positive check: Hospital A context querying User A succeeds
    const intraTenantQuery = await User.findOne({
      where: scopeToTenant({ id: userA.id }, hospitalA.id),
    });
    assert(
      intraTenantQuery !== null && intraTenantQuery.id === userA.id,
      'INTRA-TENANT ACCESS: Hospital A query for User A returns valid user'
    );

    // -------------------------------------------------------------
    // Suite 8: Database Transactions (Commit & Rollback)
    // -------------------------------------------------------------
    console.log('\n--- 8. Testing Database Transactions ---');
    let rollbackHospitalId = null;

    try {
      await withTransaction(async (t) => {
        const tempHospital = await Hospital.create(
          {
            name: 'Rollback Hospital',
            slug: `rollback-test-${Date.now()}`,
          },
          { transaction: t }
        );
        rollbackHospitalId = tempHospital.id;

        // Intentionally trigger failure to force rollback
        throw new Error('Simulated transaction failure');
      });
    } catch {
      // Expected catch
    }

    const checkRollback = await Hospital.findByPk(rollbackHospitalId);
    assert(checkRollback === null, 'Transaction rollback successfully reverted record on error');

    // Successful commit test
    const committedHospital = await withTransaction(async (t) => {
      return await Hospital.create(
        {
          name: 'Committed Hospital',
          slug: `committed-test-${Date.now()}`,
        },
        { transaction: t }
      );
    });
    createdHospitalIds.push(committedHospital.id);
    const checkCommit = await Hospital.findByPk(committedHospital.id);
    assert(checkCommit !== null, 'Transaction commit successfully persisted record');

    // -------------------------------------------------------------
    // Clean up temporary test data
    // -------------------------------------------------------------
    console.log('\nCleaning up verification records...');
    await UserRole.destroy({ where: { roleId: testRole.id } });
    await RolePermission.destroy({ where: { roleId: testRole.id } });
    await Role.destroy({ where: { id: testRole.id } });
    await Permission.destroy({ where: { id: testPermission.id } });
    await User.destroy({ where: { hospitalId: createdHospitalIds } });
    await HospitalSetting.destroy({ where: { hospitalId: createdHospitalIds } });
    await Hospital.destroy({ where: { id: createdHospitalIds } });
    console.log('✓ Clean-up complete.\n');

    console.log(`Results: ${passed} passed, ${failed} failed.`);
    return failed === 0;
  } catch (error) {
    console.error('✗ Verification failed with unhandled exception:', error);
    return false;
  }
};

// Execute directly if run via CLI
if (process.argv[1] && process.argv[1].endsWith('verify.js')) {
  runVerification()
    .then((success) => process.exit(success ? 0 : 1))
    .catch(() => process.exit(1));
}

export default runVerification;
