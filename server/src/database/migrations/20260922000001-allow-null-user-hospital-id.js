/**
 * Migration: Allow NULL for users.hospital_id (to support Platform Super Admin)
 * and add partial unique index for platform users where hospital_id IS NULL.
 */
export const up = async (queryInterface, _Sequelize) => {
  // 1. Explicitly drop NOT NULL constraint on hospital_id
  await queryInterface.sequelize.query(
    'ALTER TABLE "users" ALTER COLUMN "hospital_id" DROP NOT NULL;'
  );

  // 2. Add partial unique index: UNIQUE(email) WHERE hospital_id IS NULL if not exists
  await queryInterface.sequelize.query(
    'CREATE UNIQUE INDEX IF NOT EXISTS "users_platform_email_unique" ON "users" ("email") WHERE "hospital_id" IS NULL;'
  );
};

export const down = async (queryInterface, _Sequelize) => {
  // 1. Remove partial unique index
  await queryInterface.sequelize.query('DROP INDEX IF EXISTS "users_platform_email_unique";');

  // 2. Revert hospital_id to NOT NULL
  await queryInterface.sequelize.query(
    'ALTER TABLE "users" ALTER COLUMN "hospital_id" SET NOT NULL;'
  );
};
