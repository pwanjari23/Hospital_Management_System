import {
  Hospital,
  User,
  Role,
  UserRole,
  Department,
  Patient,
  Bed,
  IpdAdmission,
  IpdBedTransfer,
  HospitalSequence,
  sequelize,
} from '../models/index.js';
import ipdService from '../services/ipd.service.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function run() {
  console.log('\n=== PHASE 9A VERIFICATION TEST SUITE: IPD ADMISSION, WARD & BED MANAGEMENT ===\n');

  let hospA, hospB;
  let adminA, recepA, docA, nurseA, pharmA, labA;
  let patientA1, patientA2, patientB1;
  let deptA;
  let wardGenA, wardIcuA, wardGenB;
  let bed101A, bed102A, bed103A, bedIcu1A;
  let admissionA1;

  try {
    // ----------------------------------------------------
    // SETUP: Tenants, Staff, Roles, Patients & Masters
    // ----------------------------------------------------
    console.log('--- Setup: Tenants, Staff, Roles, Patients & Masters ---');

    hospA = await Hospital.create({
      name: 'Alpha Apex Hospital 9A',
      slug: `alpha-apex-9a-${Date.now()}`,
      status: 'ACTIVE',
    });

    hospB = await Hospital.create({
      name: 'Beta Beacon Hospital 9A',
      slug: `beta-beacon-9a-${Date.now()}`,
      status: 'ACTIVE',
    });

    // Roles
    const [adminRole] = await Role.findOrCreate({
      where: { name: 'HOSPITAL_ADMIN' },
      defaults: { description: 'Hospital Administrator', scope: 'HOSPITAL' },
    });
    const [recepRole] = await Role.findOrCreate({
      where: { name: 'RECEPTIONIST' },
      defaults: { description: 'Receptionist', scope: 'HOSPITAL' },
    });
    const [docRole] = await Role.findOrCreate({
      where: { name: 'DOCTOR' },
      defaults: { description: 'Doctor', scope: 'HOSPITAL' },
    });
    const [nurseRole] = await Role.findOrCreate({
      where: { name: 'NURSE' },
      defaults: { description: 'Nurse', scope: 'HOSPITAL' },
    });
    const [pharmRole] = await Role.findOrCreate({
      where: { name: 'PHARMACIST' },
      defaults: { description: 'Pharmacist', scope: 'HOSPITAL' },
    });
    const [labRole] = await Role.findOrCreate({
      where: { name: 'LAB_STAFF' },
      defaults: { description: 'Lab Staff', scope: 'HOSPITAL' },
    });

    // Users
    adminA = await User.create({
      hospitalId: hospA.id,
      name: 'Admin Alpha 9A',
      email: `admin.alpha.9a.${Date.now()}@hospital.test`,
      passwordHash: 'dummyhash',
      status: 'ACTIVE',
    });
    await UserRole.create({ userId: adminA.id, roleId: adminRole.id });

    recepA = await User.create({
      hospitalId: hospA.id,
      name: 'Receptionist Rachel 9A',
      email: `recep.rachel.9a.${Date.now()}@hospital.test`,
      passwordHash: 'dummyhash',
      status: 'ACTIVE',
    });
    await UserRole.create({ userId: recepA.id, roleId: recepRole.id });

    docA = await User.create({
      hospitalId: hospA.id,
      name: 'Dr. David 9A',
      email: `dr.david.9a.${Date.now()}@hospital.test`,
      passwordHash: 'dummyhash',
      status: 'ACTIVE',
    });
    await UserRole.create({ userId: docA.id, roleId: docRole.id });

    nurseA = await User.create({
      hospitalId: hospA.id,
      name: 'Nurse Nancy 9A',
      email: `nurse.nancy.9a.${Date.now()}@hospital.test`,
      passwordHash: 'dummyhash',
      status: 'ACTIVE',
    });
    await UserRole.create({ userId: nurseA.id, roleId: nurseRole.id });

    pharmA = await User.create({
      hospitalId: hospA.id,
      name: 'Pharmacist Phil 9A',
      email: `pharm.phil.9a.${Date.now()}@hospital.test`,
      passwordHash: 'dummyhash',
      status: 'ACTIVE',
    });
    await UserRole.create({ userId: pharmA.id, roleId: pharmRole.id });

    labA = await User.create({
      hospitalId: hospA.id,
      name: 'Lab Larry 9A',
      email: `lab.larry.9a.${Date.now()}@hospital.test`,
      passwordHash: 'dummyhash',
      status: 'ACTIVE',
    });
    await UserRole.create({ userId: labA.id, roleId: labRole.id });

    // Department
    deptA = await Department.create({
      hospitalId: hospA.id,
      name: 'General Medicine 9A',
      code: `GEN-${Date.now().toString().slice(-4)}`,
      status: 'ACTIVE',
    });

    // Patients
    patientA1 = await Patient.create({
      hospitalId: hospA.id,
      uhid: `UHID-9A-001-${Date.now().toString().slice(-4)}`,
      firstName: 'Aarav',
      lastName: 'Sharma',
      gender: 'MALE',
      dateOfBirth: '1985-06-15',
      phone: '9876543210',
    });

    patientA2 = await Patient.create({
      hospitalId: hospA.id,
      uhid: `UHID-9A-002-${Date.now().toString().slice(-4)}`,
      firstName: 'Priya',
      lastName: 'Verma',
      gender: 'FEMALE',
      dateOfBirth: '1992-09-20',
      phone: '9876543211',
    });

    patientB1 = await Patient.create({
      hospitalId: hospB.id,
      uhid: `UHID-9B-001-${Date.now().toString().slice(-4)}`,
      firstName: 'Rohan',
      lastName: 'Mehta',
      gender: 'MALE',
      dateOfBirth: '1980-03-10',
      phone: '9876543212',
    });

    console.log('Setup completed successfully.\n');

    // ==============================================================
    // SECTION 1: WARD MANAGEMENT
    // ==============================================================
    console.log('--- Section 1: Ward Management ---');

    // Test 1: Create Ward successfully
    wardGenA = await ipdService.createWard(
      hospA.id,
      {
        wardCode: 'GW-01',
        wardName: 'General Male Ward',
        wardType: 'GENERAL',
        floor: '1st Floor',
        departmentId: deptA.id,
        genderPolicy: 'MALE',
        description: 'Main general male ward',
      },
      adminA
    );
    assert(
      wardGenA && wardGenA.wardCode === 'GW-01' && wardGenA.isActive === true,
      'Test 1: Ward created successfully with correct code and status'
    );

    // Test 2: Duplicate ward code rejection within same hospital
    let dupWardErr = false;
    try {
      await ipdService.createWard(
        hospA.id,
        {
          wardCode: 'gw-01', // case insensitive duplicate
          wardName: 'Duplicate General Ward',
          wardType: 'GENERAL',
        },
        adminA
      );
    } catch (err) {
      dupWardErr = err.statusCode === 400;
    }
    assert(dupWardErr, 'Test 2: Duplicate ward code rejected within same hospital');

    // Test 3: Same ward code allowed in different hospital (multi-tenant isolation)
    wardGenB = await ipdService.createWard(
      hospB.id,
      {
        wardCode: 'GW-01',
        wardName: 'Hospital B General Ward',
        wardType: 'GENERAL',
      },
      adminA
    );
    assert(
      wardGenB && wardGenB.hospitalId === hospB.id && wardGenB.wardCode === 'GW-01',
      'Test 3: Same ward code permitted in another tenant hospital'
    );

    // Test 4: Create additional ICU ward in Hospital A
    wardIcuA = await ipdService.createWard(
      hospA.id,
      {
        wardCode: 'ICU-01',
        wardName: 'Intensive Care Unit A',
        wardType: 'ICU',
        floor: '2nd Floor',
      },
      adminA
    );
    assert(wardIcuA && wardIcuA.wardType === 'ICU', 'Test 4: Additional ICU ward created');

    // Test 5: Ward update
    const updatedWard = await ipdService.updateWard(
      hospA.id,
      wardGenA.id,
      {
        description: 'Updated description for General Male Ward',
      },
      adminA
    );
    assert(
      updatedWard.description === 'Updated description for General Male Ward',
      'Test 5: Ward updated successfully'
    );

    // Test 6: Ward list query filters by tenant
    const wardsA = await ipdService.getWards(hospA.id);
    assert(
      wardsA.length === 2 && wardsA.every((w) => w.hospitalId === hospA.id),
      'Test 6: Wards list strictly scoped to Hospital A'
    );

    // ==============================================================
    // SECTION 2: BED MANAGEMENT & AVAILABILITY
    // ==============================================================
    console.log('\n--- Section 2: Bed Management & Availability ---');

    // Test 7: Create Bed successfully
    bed101A = await ipdService.createBed(
      hospA.id,
      {
        wardId: wardGenA.id,
        bedNumber: 'B-101',
        bedType: 'STANDARD',
        status: 'AVAILABLE',
      },
      adminA
    );
    assert(
      bed101A && bed101A.bedNumber === 'B-101' && bed101A.status === 'AVAILABLE',
      'Test 7: Bed B-101 created successfully with status AVAILABLE'
    );

    // Test 8: Duplicate bed number in same ward rejected
    let dupBedErr = false;
    try {
      await ipdService.createBed(
        hospA.id,
        {
          wardId: wardGenA.id,
          bedNumber: 'b-101',
          bedType: 'STANDARD',
        },
        adminA
      );
    } catch (err) {
      dupBedErr = err.statusCode === 400;
    }
    assert(dupBedErr, 'Test 8: Duplicate bed number in same ward rejected');

    // Test 9: Same bed number in different ward allowed
    bedIcu1A = await ipdService.createBed(
      hospA.id,
      {
        wardId: wardIcuA.id,
        bedNumber: 'B-101', // same bed number, different ward
        bedType: 'ICU',
      },
      adminA
    );
    assert(
      bedIcu1A && bedIcu1A.wardId === wardIcuA.id,
      'Test 9: Same bed number allowed in a different ward'
    );

    // Test 10: Cannot create bed directly with OCCUPIED status
    let directOccupiedErr = false;
    try {
      await ipdService.createBed(
        hospA.id,
        {
          wardId: wardGenA.id,
          bedNumber: 'B-102',
          status: 'OCCUPIED',
        },
        adminA
      );
    } catch (err) {
      directOccupiedErr = err.statusCode === 400;
    }
    assert(directOccupiedErr, 'Test 10: Direct creation of bed with OCCUPIED status rejected');

    // Test 11: Create beds B-102 and B-103
    bed102A = await ipdService.createBed(
      hospA.id,
      {
        wardId: wardGenA.id,
        bedNumber: 'B-102',
        bedType: 'STANDARD',
      },
      adminA
    );

    bed103A = await ipdService.createBed(
      hospA.id,
      {
        wardId: wardGenA.id,
        bedNumber: 'B-103',
        bedType: 'STANDARD',
      },
      adminA
    );
    assert(bed102A && bed103A, 'Test 11: Additional beds B-102 and B-103 created');

    // Test 12: Bed status transition to MAINTENANCE
    const maintBed = await ipdService.updateBedStatus(
      hospA.id,
      bed103A.id,
      { status: 'MAINTENANCE', notes: 'Scheduled sterilization' },
      adminA
    );
    assert(
      maintBed.status === 'MAINTENANCE' && maintBed.notes === 'Scheduled sterilization',
      'Test 12: Bed status transitioned to MAINTENANCE'
    );

    // Test 13: Bed status transition to BLOCKED then back to AVAILABLE
    const blockedBed = await ipdService.updateBedStatus(
      hospA.id,
      bed103A.id,
      { status: 'BLOCKED', notes: 'Temporarily blocked' },
      adminA
    );
    assert(blockedBed.status === 'BLOCKED', 'Test 13: Bed status transitioned to BLOCKED');

    const unblockedBed = await ipdService.updateBedStatus(
      hospA.id,
      bed103A.id,
      { status: 'AVAILABLE', notes: 'Unblocked for admissions' },
      adminA
    );
    assert(unblockedBed.status === 'AVAILABLE', 'Test 14: Bed status reverted to AVAILABLE');

    // Test 15: Filter beds by ward and availability
    const availBeds = await ipdService.getBeds(hospA.id, {
      wardId: wardGenA.id,
      status: 'AVAILABLE',
    });
    assert(
      availBeds.length === 3 && availBeds.every((b) => b.status === 'AVAILABLE'),
      'Test 15: Beds query correctly filters available beds in General Ward'
    );

    // ==============================================================
    // SECTION 3: IPD ADMISSION & ATOMIC BED ALLOCATION
    // ==============================================================
    console.log('\n--- Section 3: IPD Admission & Atomic Bed Allocation ---');

    // Test 16: Create IPD Admission successfully
    admissionA1 = await ipdService.createAdmission(
      hospA.id,
      {
        patientId: patientA1.id,
        admittingDoctorId: docA.id,
        departmentId: deptA.id,
        wardId: wardGenA.id,
        bedId: bed101A.id,
        admissionType: 'PLANNED',
        reasonForAdmission: 'Severe acute gastroenteritis requiring IV rehydration',
        provisionalDiagnosis: 'Acute Gastroenteritis',
        emergencyCase: false,
      },
      recepA
    );
    assert(
      admissionA1 && admissionA1.status === 'ADMITTED',
      'Test 16: IPD Admission created successfully with status ADMITTED'
    );

    // Test 17: Sequential admission number format IPD-YYYY-XXXXXX
    const currentYear = new Date().getFullYear();
    const expectedPrefix = `IPD-${currentYear}-`;
    assert(
      admissionA1.admissionNumber.startsWith(expectedPrefix),
      `Test 17: Admission number generated correctly with format ${expectedPrefix}XXXXXX`
    );

    // Test 18: HospitalSequence row exists for IPD
    const ipdSeq = await HospitalSequence.findOne({
      where: { hospitalId: hospA.id, sequenceType: 'IPD' },
    });
    assert(
      ipdSeq && Number(ipdSeq.lastValue) >= 1,
      'Test 18: HospitalSequence tracks IPD sequence properly'
    );

    // Test 19: Bed status atomically transitions to OCCUPIED
    const allocatedBed = await Bed.findByPk(bed101A.id);
    assert(
      allocatedBed.status === 'OCCUPIED',
      'Test 19: Bed B-101 status atomically transitioned to OCCUPIED'
    );

    // Test 20: Patient association attached on admission
    assert(
      admissionA1.patient && admissionA1.patient.id === patientA1.id,
      'Test 20: Patient demographic association attached to admission'
    );

    // Test 21: Doctor association attached on admission
    assert(
      admissionA1.admittingDoctor && admissionA1.admittingDoctor.id === docA.id,
      'Test 21: Admitting doctor association attached to admission'
    );

    // Test 22: Duplicate active admission rejected for same patient
    let dupActiveAdmErr = false;
    try {
      await ipdService.createAdmission(
        hospA.id,
        {
          patientId: patientA1.id, // Patient already admitted
          admittingDoctorId: docA.id,
          wardId: wardGenA.id,
          bedId: bed102A.id,
          admissionType: 'EMERGENCY',
        },
        recepA
      );
    } catch (err) {
      dupActiveAdmErr = err.statusCode === 400;
    }
    assert(
      dupActiveAdmErr,
      'Test 22: Duplicate active admission for same patient strictly rejected'
    );

    // Test 23: Cannot admit patient to an already OCCUPIED bed
    let occupiedBedAdmErr = false;
    try {
      await ipdService.createAdmission(
        hospA.id,
        {
          patientId: patientA2.id,
          admittingDoctorId: docA.id,
          wardId: wardGenA.id,
          bedId: bed101A.id, // Already occupied by patientA1
          admissionType: 'PLANNED',
        },
        recepA
      );
    } catch (err) {
      occupiedBedAdmErr = err.statusCode === 409;
    }
    assert(
      occupiedBedAdmErr,
      'Test 23: Attempt to admit to an OCCUPIED bed fails with 409 Conflict'
    );

    // Test 24: Cannot admit patient to a MAINTENANCE bed
    await ipdService.updateBedStatus(hospA.id, bed103A.id, { status: 'MAINTENANCE' }, adminA);
    let maintBedAdmErr = false;
    try {
      await ipdService.createAdmission(
        hospA.id,
        {
          patientId: patientA2.id,
          admittingDoctorId: docA.id,
          wardId: wardGenA.id,
          bedId: bed103A.id, // Maintenance
        },
        recepA
      );
    } catch (err) {
      maintBedAdmErr = err.statusCode === 409;
    }
    assert(maintBedAdmErr, 'Test 24: Attempt to admit to a MAINTENANCE bed fails with 409 Conflict');
    // Revert bed103A back to AVAILABLE
    await ipdService.updateBedStatus(hospA.id, bed103A.id, { status: 'AVAILABLE' }, adminA);

    // Test 25: Cross-tenant patient admission rejected
    let crossTenantPatientErr = false;
    try {
      await ipdService.createAdmission(
        hospA.id,
        {
          patientId: patientB1.id, // Belongs to Hospital B
          admittingDoctorId: docA.id,
          wardId: wardGenA.id,
          bedId: bed102A.id,
        },
        recepA
      );
    } catch (err) {
      crossTenantPatientErr = err.statusCode === 404;
    }
    assert(crossTenantPatientErr, 'Test 25: Admitting a cross-tenant patient rejected with 404');

    // Test 26: Cannot directly change status of occupied bed B-101
    let modOccupiedBedErr = false;
    try {
      await ipdService.updateBedStatus(hospA.id, bed101A.id, { status: 'AVAILABLE' }, adminA);
    } catch (err) {
      modOccupiedBedErr = err.statusCode === 400;
    }
    assert(modOccupiedBedErr, 'Test 26: Direct status modification of an OCCUPIED bed rejected');

    // Test 27: Cannot deactivate ward containing occupied bed
    let deactWardWithOccupiedErr = false;
    try {
      await ipdService.updateWard(hospA.id, wardGenA.id, { isActive: false }, adminA);
    } catch (err) {
      deactWardWithOccupiedErr = err.statusCode === 400;
    }
    assert(
      deactWardWithOccupiedErr,
      'Test 27: Ward deactivation rejected when ward contains occupied beds'
    );

    // ==============================================================
    // SECTION 4: CONCURRENT BED ALLOCATION SIMULATION
    // ==============================================================
    console.log('\n--- Section 4: Concurrency & Atomicity Tests ---');

    // Test 28: Simultaneous bed allocation race test
    // Create a 3rd patient to race with patientA2 for bed102A
    const patientA3 = await Patient.create({
      hospitalId: hospA.id,
      uhid: `UHID-9A-003-${Date.now().toString().slice(-4)}`,
      firstName: 'Vikram',
      lastName: 'Singhania',
      gender: 'MALE',
      dateOfBirth: '1978-11-22',
      phone: '9876543213',
    });

    const [raceResult1, raceResult2] = await Promise.allSettled([
      ipdService.createAdmission(
        hospA.id,
        {
          patientId: patientA2.id,
          admittingDoctorId: docA.id,
          wardId: wardGenA.id,
          bedId: bed102A.id,
          admissionType: 'EMERGENCY',
          reasonForAdmission: 'Emergency respiratory distress',
        },
        recepA
      ),
      ipdService.createAdmission(
        hospA.id,
        {
          patientId: patientA3.id,
          admittingDoctorId: docA.id,
          wardId: wardGenA.id,
          bedId: bed102A.id,
          admissionType: 'EMERGENCY',
          reasonForAdmission: 'Severe cardiac chest pain',
        },
        recepA
      ),
    ]);

    const successCount = [raceResult1, raceResult2].filter((r) => r.status === 'fulfilled').length;
    const rejectedCount = [raceResult1, raceResult2].filter((r) => r.status === 'rejected').length;

    assert(
      successCount === 1 && rejectedCount === 1,
      'Test 28: Concurrency race condition: Exactly 1 admission succeeded and 1 was safely rejected'
    );

    // Verify bed102A is occupied exactly once
    const bed102Check = await Bed.findByPk(bed102A.id);
    assert(
      bed102Check.status === 'OCCUPIED',
      'Test 29: Raced bed B-102 is consistently in OCCUPIED status'
    );

    // ==============================================================
    // SECTION 5: BED TRANSFER WORKFLOW & HISTORY
    // ==============================================================
    console.log('\n--- Section 5: Bed Transfer Workflow & History ---');

    // Test 30: Valid bed transfer: Transfer patientA1 from B-101 (General) to B-101 (ICU)
    const transferredAdm = await ipdService.transferBed(
      hospA.id,
      admissionA1.id,
      {
        toWardId: wardIcuA.id,
        toBedId: bedIcu1A.id,
        transferReason: 'Patient condition deteriorated, transfer to ICU required',
        notes: 'Transferred under Dr. David supervision',
      },
      docA
    );
    assert(
      transferredAdm && transferredAdm.wardId === wardIcuA.id && transferredAdm.bedId === bedIcu1A.id,
      'Test 30: Bed transfer completed successfully: Admission points to ICU ward and bed'
    );

    // Test 31: Previous bed B-101 becomes AVAILABLE
    const sourceBedAfter = await Bed.findByPk(bed101A.id);
    assert(
      sourceBedAfter.status === 'AVAILABLE',
      'Test 31: Source bed B-101 atomically released to AVAILABLE status'
    );

    // Test 32: Destination bed B-101 (ICU) becomes OCCUPIED
    const destBedAfter = await Bed.findByPk(bedIcu1A.id);
    assert(
      destBedAfter.status === 'OCCUPIED',
      'Test 32: Destination bed (ICU B-101) atomically marked OCCUPIED'
    );

    // Test 33: Immutable transfer history record created
    const transferHistory = await ipdService.getAdmissionTransfers(hospA.id, admissionA1.id);
    assert(
      transferHistory.length === 1 &&
        transferHistory[0].fromWardId === wardGenA.id &&
        transferHistory[0].toWardId === wardIcuA.id &&
        transferHistory[0].fromBedId === bed101A.id &&
        transferHistory[0].toBedId === bedIcu1A.id &&
        transferHistory[0].transferReason === 'Patient condition deteriorated, transfer to ICU required',
      'Test 33: Immutable IpdBedTransfer record created with complete audit data'
    );

    // Test 34: Transfer rejected if destination bed is OCCUPIED
    let transferToOccupiedErr = false;
    try {
      await ipdService.transferBed(
        hospA.id,
        admissionA1.id,
        {
          toWardId: wardGenA.id,
          toBedId: bed102A.id, // Currently occupied from race test
          transferReason: 'Move back to general',
        },
        docA
      );
    } catch (err) {
      transferToOccupiedErr = err.statusCode === 409;
    }
    assert(
      transferToOccupiedErr,
      'Test 34: Transfer rejected with 409 Conflict if destination bed is OCCUPIED'
    );

    // Test 35: Transfer rejected if destination bed is the same as current bed
    let transferToSameBedErr = false;
    try {
      await ipdService.transferBed(
        hospA.id,
        admissionA1.id,
        {
          toWardId: wardIcuA.id,
          toBedId: bedIcu1A.id,
          transferReason: 'Same bed test',
        },
        docA
      );
    } catch (err) {
      transferToSameBedErr = err.statusCode === 400;
    }
    assert(transferToSameBedErr, 'Test 35: Transfer to the same bed rejected');

    // Test 36: Transfer rollback on failure: Beds remain in initial state
    const bedIcuCheck = await Bed.findByPk(bedIcu1A.id);
    const bed102CheckAfter = await Bed.findByPk(bed102A.id);
    assert(
      bedIcuCheck.status === 'OCCUPIED' && bed102CheckAfter.status === 'OCCUPIED',
      'Test 36: Failed transfer left all bed statuses unchanged (atomic rollback)'
    );

    // Test 37: Second transfer: Transfer patient back from ICU to General B-101
    await ipdService.transferBed(
      hospA.id,
      admissionA1.id,
      {
        toWardId: wardGenA.id,
        toBedId: bed101A.id,
        transferReason: 'Patient stabilized, stepped down to General Ward',
      },
      nurseA
    );
    const multiTransfers = await ipdService.getAdmissionTransfers(hospA.id, admissionA1.id);
    assert(
      multiTransfers.length === 2,
      'Test 37: Multiple transfers correctly tracked chronologically (history length = 2)'
    );

    // Verify bed states after second transfer
    const bed101Reoccupied = await Bed.findByPk(bed101A.id);
    const bedIcuReleased = await Bed.findByPk(bedIcu1A.id);
    assert(
      bed101Reoccupied.status === 'OCCUPIED' && bedIcuReleased.status === 'AVAILABLE',
      'Test 38: Bed states accurately reflect return transfer (B-101 OCCUPIED, ICU AVAILABLE)'
    );

    // ==============================================================
    // SECTION 6: ADMISSION DETAILS & CANCELLATION
    // ==============================================================
    console.log('\n--- Section 6: Admission Details & Cancellation ---');

    // Test 39: Fetch full admission details
    const fullAdm = await ipdService.getAdmissionById(hospA.id, admissionA1.id);
    assert(
      fullAdm &&
        fullAdm.bedTransfers.length === 2 &&
        fullAdm.patient.uhid === patientA1.uhid &&
        fullAdm.ward.wardCode === 'GW-01',
      'Test 39: Admission details include patient, ward, bed, and transfer timeline'
    );

    // Test 40: Admission cancellation releases bed
    const cancelledAdm = await ipdService.cancelAdmission(
      hospA.id,
      admissionA1.id,
      { reason: 'Admitted by clerical error' },
      recepA
    );
    assert(
      cancelledAdm.status === 'CANCELLED',
      'Test 40: Admission status transitioned to CANCELLED'
    );

    // Test 41: Bed released upon cancellation
    const bedAfterCancel = await Bed.findByPk(bed101A.id);
    assert(
      bedAfterCancel.status === 'AVAILABLE',
      'Test 41: Bed B-101 released to AVAILABLE status upon admission cancellation'
    );

    // ==============================================================
    // SECTION 7: PATIENT IPD HISTORY
    // ==============================================================
    console.log('\n--- Section 7: Patient IPD History ---');

    // Test 42: Patient IPD history returns all historical admissions
    const patientHistory = await ipdService.getPatientAdmissions(hospA.id, patientA1.id);
    assert(
      patientHistory.length === 1 && patientHistory[0].id === admissionA1.id,
      'Test 42: Patient IPD history returns chronological admissions list'
    );

    // Test 43: Patient can be readmitted after previous admission is cancelled/discharged
    const admissionA1Second = await ipdService.createAdmission(
      hospA.id,
      {
        patientId: patientA1.id,
        admittingDoctorId: docA.id,
        wardId: wardGenA.id,
        bedId: bed101A.id,
        admissionType: 'PLANNED',
        reasonForAdmission: 'Readmission for observation',
      },
      recepA
    );
    assert(
      admissionA1Second && admissionA1Second.status === 'ADMITTED',
      'Test 43: Patient successfully readmitted following previous cancellation'
    );

    const updatedHistory = await ipdService.getPatientAdmissions(hospA.id, patientA1.id);
    assert(
      updatedHistory.length === 2,
      'Test 44: Patient IPD history now contains 2 chronological admission records'
    );

    // ==============================================================
    // SECTION 8: IPD DASHBOARD & VISUAL BED BOARD
    // ==============================================================
    console.log('\n--- Section 8: IPD Dashboard & Visual Bed Board ---');

    // Test 45: IPD Dashboard metrics
    const metrics = await ipdService.getIpdDashboardMetrics(hospA.id);
    assert(
      metrics &&
        metrics.totalBeds >= 4 &&
        metrics.occupiedBeds >= 2 &&
        metrics.availableBeds >= 1 &&
        metrics.currentAdmissions >= 2 &&
        metrics.transfersToday >= 2,
      `Test 45: IPD Dashboard metrics accurate (Total: ${metrics.totalBeds}, Occupied: ${metrics.occupiedBeds}, Available: ${metrics.availableBeds}, Transfers: ${metrics.transfersToday})`
    );

    // Test 46: Ward-wise occupancy calculations in dashboard
    assert(
      Array.isArray(metrics.wardOccupancy) &&
        metrics.wardOccupancy.some((w) => w.wardCode === 'GW-01' && w.occupancyRate > 0),
      'Test 46: Ward-wise occupancy calculations accurately returned'
    );

    // Test 47: Visual Bed Board data structure
    const bedBoard = await ipdService.getBedBoard(hospA.id);
    const genWardBoard = bedBoard.find((w) => w.wardCode === 'GW-01');
    assert(
      genWardBoard &&
        genWardBoard.beds.length >= 3 &&
        genWardBoard.beds.some((b) => b.status === 'OCCUPIED' && b.currentAdmission !== null),
      'Test 47: Bed Board returns wards with beds and current admission patient context'
    );

    // ==============================================================
    // SECTION 9: TENANT ISOLATION
    // ==============================================================
    console.log('\n--- Section 9: Strict Tenant Isolation ---');

    // Test 48: Cross-tenant ward lookup blocked
    let crossWardErr = false;
    try {
      await ipdService.getWardById(hospB.id, wardGenA.id);
    } catch (err) {
      crossWardErr = err.statusCode === 404;
    }
    assert(crossWardErr, 'Test 48: Cross-tenant ward lookup blocked with 404');

    // Test 49: Cross-tenant bed lookup blocked
    let crossBedErr = false;
    try {
      await ipdService.getBedById(hospB.id, bed101A.id);
    } catch (err) {
      crossBedErr = err.statusCode === 404;
    }
    assert(crossBedErr, 'Test 49: Cross-tenant bed lookup blocked with 404');

    // Test 50: Cross-tenant admission lookup blocked
    let crossAdmErr = false;
    try {
      await ipdService.getAdmissionById(hospB.id, admissionA1.id);
    } catch (err) {
      crossAdmErr = err.statusCode === 404;
    }
    assert(crossAdmErr, 'Test 50: Cross-tenant admission lookup blocked with 404');

    // Test 51: Cross-tenant bed transfer blocked
    let crossTransferErr = false;
    try {
      await ipdService.transferBed(
        hospB.id,
        admissionA1.id,
        {
          toWardId: wardGenB.id,
          toBedId: bed101A.id,
        },
        adminA
      );
    } catch (err) {
      crossTransferErr = err.statusCode === 404;
    }
    assert(crossTransferErr, 'Test 51: Cross-tenant bed transfer blocked with 404');

    // Test 52: Cross-tenant patient admissions history isolated
    const patientAdmissionsB = await ipdService.getPatientAdmissions(hospB.id, patientA1.id);
    assert(
      patientAdmissionsB.length === 0,
      'Test 52: Cross-tenant patient admissions returns empty array for Hospital B'
    );

    // ==============================================================
    // SECTION 10: AUDIT LOGGING & DATA PRESERVATION
    // ==============================================================
    console.log('\n--- Section 10: Audit Logging & Historical Preservation ---');

    // Test 53: Audit fields populated on admissions
    const auditedAdm = await IpdAdmission.findByPk(admissionA1Second.id);
    assert(
      auditedAdm.createdBy === recepA.id && auditedAdm.hospitalId === hospA.id,
      'Test 53: Audit fields (createdBy, hospitalId) captured on IpdAdmission'
    );

    // Test 54: Audit fields populated on transfer records
    const auditedTransfer = await IpdBedTransfer.findOne({
      where: { admissionId: admissionA1.id },
    });
    assert(
      auditedTransfer &&
        auditedTransfer.transferredBy === docA.id &&
        auditedTransfer.transferredAt !== null,
      'Test 54: Audit fields (transferredBy, transferredAt) captured on IpdBedTransfer'
    );

    // Test 55: Transfer records are never deleted on admission update
    const totalTransfers = await IpdBedTransfer.count({
      where: { admissionId: admissionA1.id },
    });
    assert(
      totalTransfers === 2,
      'Test 55: Transfer records are immutable and preserved permanently'
    );

    // ==============================================================
    // SUMMARY
    // ==============================================================
    console.log('\n==================================================');
    console.log(`PHASE 9A TESTS COMPLETED: ${passed} passed, ${failed} failed`);
    console.log('==================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('\nUNHANDLED EXCEPTION DURING PHASE 9A VERIFICATION:\n', err);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

run();
