import env from '../config/env.js';
import { sequelize, User, Role, UserRole } from '../models/index.js';
import { hashPassword } from '../utils/password.js';

export const seedSuperAdmin = async () => {
  console.log('\n--- Seeding Platform Super Admin ---');

  const { name, email, password } = env.superAdmin;

  if (!email || !password) {
    console.error(
      '✗ Error: SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be configured in environment variables.'
    );
    process.exit(1);
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    await sequelize.authenticate();

    // 1. Locate the SUPER_ADMIN role with PLATFORM scope
    const superAdminRole = await Role.findOne({
      where: {
        name: 'SUPER_ADMIN',
        scope: 'PLATFORM',
      },
    });

    if (!superAdminRole) {
      console.error(
        '✗ Error: SUPER_ADMIN role with PLATFORM scope does not exist in the database. Please run seeders first (npm run db:seed).'
      );
      process.exit(1);
    }

    // 2. Check if platform user with this email already exists
    const existingPlatformUser = await User.findOne({
      where: {
        email: normalizedEmail,
        hospitalId: null,
      },
      include: [
        {
          model: Role,
          as: 'roles',
          through: { attributes: [] },
        },
      ],
    });

    if (existingPlatformUser) {
      const hasSuperAdminRole = existingPlatformUser.roles?.some(
        (r) => r.name === 'SUPER_ADMIN' && r.scope === 'PLATFORM'
      );

      if (hasSuperAdminRole) {
        console.log(
          `ℹ Platform Super Admin already exists (${normalizedEmail}). Idempotent skip — no changes made.`
        );
        return existingPlatformUser;
      }

      // If user exists but role missing, attach role
      await UserRole.findOrCreate({
        where: {
          userId: existingPlatformUser.id,
          roleId: superAdminRole.id,
        },
      });
      console.log(`✓ Attached SUPER_ADMIN role to existing platform user (${normalizedEmail}).`);
      return existingPlatformUser;
    }

    // 3. Create Super Admin user with hospitalId = null and hashed password
    const hashedPassword = await hashPassword(password);

    const result = await sequelize.transaction(async (t) => {
      const newUser = await User.create(
        {
          name: name || 'Platform Admin',
          email: normalizedEmail,
          passwordHash: hashedPassword,
          hospitalId: null,
          status: 'ACTIVE',
        },
        { transaction: t }
      );

      await UserRole.create(
        {
          userId: newUser.id,
          roleId: superAdminRole.id,
        },
        { transaction: t }
      );

      return newUser;
    });

    console.log(`✓ Successfully created Platform Super Admin:`);
    console.log(`  - ID: ${result.id}`);
    console.log(`  - Email: ${result.email}`);
    console.log(`  - Role: SUPER_ADMIN (PLATFORM scope)`);
    console.log(`  - Hospital: NULL (Platform Root)`);
    return result;
  } catch (error) {
    console.error(`✗ Failed to seed Platform Super Admin: ${error.message}`);
    throw error;
  }
};

// If run directly from CLI
if (process.argv[1]?.endsWith('seedSuperAdmin.js')) {
  seedSuperAdmin()
    .then(async () => {
      await sequelize.close();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error(err);
      await sequelize.close();
      process.exit(1);
    });
}

export default seedSuperAdmin;
