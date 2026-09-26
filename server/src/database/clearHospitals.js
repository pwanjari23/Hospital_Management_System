import { Op } from 'sequelize';
import {
  sequelize,
  Hospital,
  User,
  HospitalSetting,
  UserRole,
  Patient,
  HospitalSequence,
} from '../models/index.js';

async function clearHospitals() {
  const transaction = await sequelize.transaction();
  try {
    console.log('--- Starting Clean-Up of Hospital Data ---');

    // 1. Identify all tenant-scoped users (hospitalId is NOT NULL)
    const tenantUsers = await User.findAll({
      where: {
        hospitalId: { [Op.ne]: null },
      },
      attributes: ['id', 'email', 'name', 'hospitalId'],
      transaction,
    });
    console.log(`Found ${tenantUsers.length} tenant-scoped user(s) to remove.`);

    const tenantUserIds = tenantUsers.map((u) => u.id);

    if (tenantUserIds.length > 0) {
      // 2. Delete user_roles associated with tenant users
      const deletedUserRoles = await UserRole.destroy({
        where: {
          userId: { [Op.in]: tenantUserIds },
        },
        transaction,
      });
      console.log(`Deleted ${deletedUserRoles} user-role junction records.`);

      // 3. Delete tenant users
      const deletedUsers = await User.destroy({
        where: {
          id: { [Op.in]: tenantUserIds },
        },
        transaction,
      });
      console.log(`Deleted ${deletedUsers} tenant user records.`);
    }

    // 4. Delete all patients
    const deletedPatients = await Patient.destroy({
      where: {},
      transaction,
    });
    console.log(`Deleted ${deletedPatients} patient records.`);

    // 5. Delete all hospital sequences
    const deletedSequences = await HospitalSequence.destroy({
      where: {},
      transaction,
    });
    console.log(`Deleted ${deletedSequences} hospital sequence records.`);

    // 6. Delete all hospital settings
    const deletedSettings = await HospitalSetting.destroy({
      where: {},
      transaction,
    });
    console.log(`Deleted ${deletedSettings} hospital settings records.`);

    // 7. Delete all hospitals
    const deletedHospitals = await Hospital.destroy({
      where: {},
      transaction,
    });
    console.log(`Deleted ${deletedHospitals} hospital records.`);

    // Commit the transaction
    await transaction.commit();
    console.log('--- Successfully Committed Database Changes ---');

    // Verification
    const remainingHospitals = await Hospital.count();
    const remainingSettings = await HospitalSetting.count();
    const remainingTenantUsers = await User.count({
      where: { hospitalId: { [Op.ne]: null } },
    });
    const remainingSuperAdmins = await User.findAll({
      where: { hospitalId: null },
      attributes: ['id', 'email', 'name', 'status'],
    });

    console.log('\n--- Verification State ---');
    console.log(`Remaining Hospitals: ${remainingHospitals}`);
    console.log(`Remaining Hospital Settings: ${remainingSettings}`);
    console.log(`Remaining Tenant Users: ${remainingTenantUsers}`);
    console.log(`Preserved Super Admins (${remainingSuperAdmins.length}):`);
    remainingSuperAdmins.forEach((admin) => {
      console.log(` - [${admin.status}] ${admin.name} <${admin.email}> (ID: ${admin.id})`);
    });

    process.exit(0);
  } catch (error) {
    await transaction.rollback();
    console.error('Error during hospital clean up, transaction rolled back:', error);
    process.exit(1);
  }
}

clearHospitals();
