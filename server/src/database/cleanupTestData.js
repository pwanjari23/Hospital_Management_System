import sequelize from '../config/database.js';

async function cleanupHardcodedData() {
  const transaction = await sequelize.transaction();
  try {
    console.log('Starting purge of all hardcoded & test hospital operational data...');

    // Tables to truncate in order of foreign key dependencies
    const tablesToPurge = [
      'notifications',
      'receipts',
      'payments',
      'invoice_items',
      'invoices',
      'billing_services',
      'discharge_medications',
      'discharge_summaries',
      'ipd_bed_transfers',
      'ipd_nursing_notes',
      'ipd_progress_notes',
      'ipd_admissions',
      'beds',
      'wards',
      'investigation_results',
      'investigation_samples',
      'prescription_dispensing_items',
      'prescription_dispensings',
      'pharmacy_stock_transactions',
      'medicine_batches',
      'eecp_session_readings',
      'eecp_sessions',
      'eecp_treatment_courses',
      'eecp_assessments',
      'investigation_orders',
      'prescription_items',
      'prescriptions',
      'encounter_diagnoses',
      'vitals',
      'encounters',
      'appointments',
      'doctor_leaves',
      'doctor_schedules',
      'payment_modes',
      'eecp_packages',
      'treatments',
      'investigations',
      'medicines',
      'patients',
      'hospital_sequences',
      'hospital_settings',
      'departments',
    ];

    for (const table of tablesToPurge) {
      try {
        await sequelize.query(`TRUNCATE TABLE "${table}" CASCADE`, { transaction });
        console.log(`✓ Purged table: ${table}`);
      } catch (err) {
        // Fallback to DELETE if table does not exist or error
        try {
          await sequelize.query(`DELETE FROM "${table}"`, { transaction });
          console.log(`✓ Deleted from table: ${table}`);
        } catch (tableErr) {
          console.log(`- Skipped table (or not found): ${table} (${tableErr.message})`);
        }
      }
    }

    // Find super admin IDs to protect them
    const [superAdmins] = await sequelize.query(
      `SELECT u.id FROM users u 
       JOIN user_roles ur ON u.id = ur.user_id 
       JOIN roles r ON ur.role_id = r.id 
       WHERE r.name = 'SUPER_ADMIN'`,
      { transaction }
    );
    const superAdminIds = superAdmins.map((sa) => `'${sa.id}'`).join(', ');

    if (superAdminIds.length > 0) {
      // Remove all non-superadmin user roles
      await sequelize.query(
        `DELETE FROM user_roles WHERE user_id NOT IN (${superAdminIds})`,
        { transaction }
      );
      // Remove all non-superadmin users
      await sequelize.query(
        `DELETE FROM users WHERE id NOT IN (${superAdminIds})`,
        { transaction }
      );
      console.log('✓ Purged all non-superadmin users (doctors, staff, hospital admins)');
    } else {
      console.log('⚠️ Warning: No super admin found, preserving all users');
    }

    // Now purge all hospitals
    await sequelize.query('DELETE FROM hospitals', { transaction });
    console.log('✓ Purged all dummy/test hospitals');

    await transaction.commit();
    console.log('✅ Cleanup successfully completed. Application is now a clean slate!');
    process.exit(0);
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
}

cleanupHardcodedData();
