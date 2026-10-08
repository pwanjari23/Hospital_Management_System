/**
 * Migration: Add Performance Indexes for Reporting & Analytics (Phase 10)
 * Safely adds composite and filtered indexes on frequently queried reporting columns.
 */

export async function up(queryInterface) {
  const { sequelize } = queryInterface;

  // 1. IPD Admissions (hospital_id, admission_date)
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS "ipd_admissions_hospital_id_admission_date_idx"
    ON "ipd_admissions" ("hospital_id", "admission_date");
  `);

  // 2. Encounters (hospital_id, created_at)
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS "encounters_hospital_id_created_at_idx"
    ON "encounters" ("hospital_id", "created_at");
  `);

  // 3. Encounters (hospital_id, encounter_type)
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS "encounters_hospital_id_encounter_type_idx"
    ON "encounters" ("hospital_id", "encounter_type");
  `);

  // 4. Patients (hospital_id, created_at)
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS "patients_hospital_id_created_at_idx"
    ON "patients" ("hospital_id", "created_at");
  `);

  // 5. Invoices (hospital_id, status)
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS "invoices_hospital_id_status_idx"
    ON "invoices" ("hospital_id", "status");
  `);

  // 6. Payments (hospital_id, payment_date)
  await sequelize.query(`
    CREATE INDEX IF NOT EXISTS "payments_hospital_id_payment_date_idx"
    ON "payments" ("hospital_id", "payment_date");
  `);
}

export async function down(queryInterface) {
  const { sequelize } = queryInterface;

  await sequelize.query('DROP INDEX IF EXISTS "payments_hospital_id_payment_date_idx";');
  await sequelize.query('DROP INDEX IF EXISTS "invoices_hospital_id_status_idx";');
  await sequelize.query('DROP INDEX IF EXISTS "patients_hospital_id_created_at_idx";');
  await sequelize.query('DROP INDEX IF EXISTS "encounters_hospital_id_encounter_type_idx";');
  await sequelize.query('DROP INDEX IF EXISTS "encounters_hospital_id_created_at_idx";');
  await sequelize.query('DROP INDEX IF EXISTS "ipd_admissions_hospital_id_admission_date_idx";');
}
