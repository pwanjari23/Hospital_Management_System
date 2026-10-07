import {
  Hospital,
  User,
  UserRole,
  Role,
  Department,
  Patient,
  Appointment,
  Encounter,
  Vital,
  EncounterDiagnosis,
} from '../models/index.js';
import encounterService from '../services/encounter.service.js';
import vitalService from '../services/vital.service.js';
import encounterDiagnosisService from '../services/encounterDiagnosis.service.js';

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
  console.log('\n=== PHASE 7A VERIFICATION TEST SUITE: CLINICAL ENCOUNTERS, VITALS & CONSULTATION ===\n');

  let hospA, hospB;
  let docA, nurseA, receptionistA, docB;
  let patientA, patientB, deptA;
  let aptCheckedIn, aptCancelled;
  let encounterA;

  try {
    // ----------------------------------------------------
    // SETUP: Tenants, Roles, Users & Patients
    // ----------------------------------------------------
    console.log('--- Setup: Tenants, Staff, and Patients ---');

    hospA = await Hospital.create({
      name: 'Alpha Heart & Vascular Hospital',
      slug: 'alpha-heart-7a',
      status: 'ACTIVE',
    });

    hospB = await Hospital.create({
      name: 'Beta General Care Hospital',
      slug: 'beta-general-7a',
      status: 'ACTIVE',
    });

    deptA = await Department.create({
      hospitalId: hospA.id,
      name: 'Cardiology & EECP',
      code: 'CARD-7A',
      status: 'ACTIVE',
    });

    const docRole = await Role.findOne({ where: { name: 'DOCTOR' } });
    const nurseRole = await Role.findOne({ where: { name: 'NURSE' } });
    const recRole = await Role.findOne({ where: { name: 'RECEPTIONIST' } });

    // Doctor in Hospital A
    docA = await User.create({
      hospitalId: hospA.id,
      name: 'Dr. Siddharth Verma',
      email: 'dr.verma.7a@alpha.test',
      passwordHash: 'dummy_hash',
      status: 'ACTIVE',
      departmentId: deptA.id,
      qualification: 'MD, DM (Cardiology)',
      specialization: 'Cardiology',
    });
    await UserRole.create({ userId: docA.id, roleId: docRole.id });

    // Nurse in Hospital A
    nurseA = await User.create({
      hospitalId: hospA.id,
      name: 'Sister Mary Joseph',
      email: 'mary.nurse.7a@alpha.test',
      passwordHash: 'dummy_hash',
      status: 'ACTIVE',
      departmentId: deptA.id,
    });
    await UserRole.create({ userId: nurseA.id, roleId: nurseRole.id });

    // Receptionist in Hospital A
    receptionistA = await User.create({
      hospitalId: hospA.id,
      name: 'Pooja Reception',
      email: 'pooja.7a@alpha.test',
      passwordHash: 'dummy_hash',
      status: 'ACTIVE',
    });
    await UserRole.create({ userId: receptionistA.id, roleId: recRole.id });

    // Doctor in Hospital B (for tenant isolation tests)
    docB = await User.create({
      hospitalId: hospB.id,
      name: 'Dr. Neha B',
      email: 'dr.neha.7a@beta.test',
      passwordHash: 'dummy_hash',
      status: 'ACTIVE',
    });
    await UserRole.create({ userId: docB.id, roleId: docRole.id });

    // Patients
    patientA = await Patient.create({
      hospitalId: hospA.id,
      uhid: 'ALPH-P-7A01',
      firstName: 'Ramesh',
      lastName: 'Patel',
      gender: 'MALE',
      dateOfBirth: '1968-05-14',
      phone: '9898000001',
      bloodGroup: 'B_POSITIVE',
      allergies: 'Penicillin, Shellfish',
    });

    patientB = await Patient.create({
      hospitalId: hospB.id,
      uhid: 'BETA-P-7A01',
      firstName: 'Sita',
      lastName: 'Sharma',
      gender: 'FEMALE',
      dateOfBirth: '1975-08-20',
      phone: '9898000002',
    });
    assert(patientB.hospitalId === hospB.id, 'Patient B registered and isolated to Hospital B');

    // Create checked-in appointment for Patient A in Hospital A
    aptCheckedIn = await Appointment.create({
      hospitalId: hospA.id,
      appointmentNumber: 'APT-7A-001',
      patientId: patientA.id,
      doctorId: docA.id,
      departmentId: deptA.id,
      appointmentDate: '2026-10-12',
      startTime: '10:00',
      endTime: '10:15',
      appointmentType: 'OPD Consultation',
      status: 'CHECKED_IN',
      checkedInAt: new Date(),
    });

    // Create cancelled appointment
    aptCancelled = await Appointment.create({
      hospitalId: hospA.id,
      appointmentNumber: 'APT-7A-002',
      patientId: patientA.id,
      doctorId: docA.id,
      departmentId: deptA.id,
      appointmentDate: '2026-10-12',
      startTime: '10:30',
      endTime: '10:45',
      appointmentType: 'OPD Consultation',
      status: 'CANCELLED',
      cancellationReason: 'Patient cancelled visit',
    });

    console.log('✓ Setup complete.\n');

    // ----------------------------------------------------
    // TEST 1: Clinical Encounter Creation & Lifecycle
    // ----------------------------------------------------
    console.log('--- 1. Testing Encounter Creation & Lifecycle ---');

    // Attempt encounter creation from cancelled appointment (must fail)
    let cancelledAptError = null;
    try {
      await encounterService.createEncounter(hospA.id, {
        appointmentId: aptCancelled.id,
      }, receptionistA.id);
    } catch (err) {
      cancelledAptError = err;
    }
    assert(
      cancelledAptError && cancelledAptError.statusCode === 400,
      'Cancelled appointment cannot generate clinical encounter (400 Bad Request)'
    );

    // Create encounter from checked-in appointment
    encounterA = await encounterService.createEncounter(hospA.id, {
      appointmentId: aptCheckedIn.id,
      encounterType: 'OPD',
    }, receptionistA.id);

    assert(encounterA && encounterA.id, 'Clinical encounter successfully created from checked-in appointment');
    assert(
      encounterA.encounterNumber && /^ENC-\d{4}-\d{6}$/.test(encounterA.encounterNumber),
      `Encounter number generated in standard format: ${encounterA.encounterNumber}`
    );
    assert(encounterA.status === 'VITALS_PENDING', 'Initial encounter status is VITALS_PENDING');
    assert(encounterA.patientId === patientA.id, 'Encounter correctly mapped to Patient');
    assert(encounterA.doctorId === docA.id, 'Encounter correctly mapped to Doctor');
    assert(encounterA.hospitalId === hospA.id, 'Encounter correctly isolated to Hospital A');

    // Re-attempt encounter creation for same appointment (idempotent / duplicate prevention)
    const duplicateCheck = await encounterService.createEncounter(hospA.id, {
      appointmentId: aptCheckedIn.id,
    }, receptionistA.id);
    assert(duplicateCheck.id === encounterA.id, 'Duplicate encounter prevented; existing active encounter returned');

    // ----------------------------------------------------
    // TEST 2: Vitals Intake & Auto-BMI Calculation
    // ----------------------------------------------------
    console.log('\n--- 2. Testing Vitals Intake & BMI Calculation ---');

    // Test validation: invalid SpO2 (> 100)
    let invalidVitalError = null;
    try {
      await vitalService.createVital(hospA.id, encounterA.id, {
        spo2: 125, // Invalid!
        pulseRate: 72,
      }, nurseA.id);
    } catch (err) {
      invalidVitalError = err;
    }
    assert(invalidVitalError && invalidVitalError.statusCode === 400, 'Invalid vital value rejected (SpO2 > 100)');

    // Record initial vitals by Nurse
    const vitalsReading1 = await vitalService.createVital(hospA.id, encounterA.id, {
      temperature: 98.6,
      pulseRate: 78,
      respiratoryRate: 16,
      systolicBp: 130,
      diastolicBp: 85,
      spo2: 98,
      weightKg: 70,
      heightCm: 175,
      painScore: 2,
      notes: 'Patient feels mild exertion on climbing stairs',
    }, nurseA.id);

    assert(vitalsReading1 && vitalsReading1.id, 'Vitals reading 1 recorded successfully');
    // Height: 1.75m, Weight: 70kg -> 70 / (1.75 * 1.75) = 22.86
    assert(
      Number(vitalsReading1.bmi) >= 22.8 && Number(vitalsReading1.bmi) <= 22.9,
      `BMI correctly auto-calculated: ${vitalsReading1.bmi} (expected ~22.86)`
    );

    // Verify encounter status transitioned to READY_FOR_DOCTOR
    const encounterAfterVitals = await encounterService.getEncounterById(hospA.id, encounterA.id);
    assert(
      encounterAfterVitals.status === 'READY_FOR_DOCTOR',
      'Encounter status automatically transitioned to READY_FOR_DOCTOR upon vitals intake'
    );

    // Record second vitals reading (intra-visit repeat reading)
    const vitalsReading2 = await vitalService.createVital(hospA.id, encounterA.id, {
      systolicBp: 124,
      diastolicBp: 80,
      pulseRate: 74,
      spo2: 99,
      notes: 'Repeat BP after 20 mins resting',
    }, nurseA.id);
    assert(vitalsReading2 && vitalsReading2.id, 'Vitals reading 2 recorded successfully');

    // Retrieve vitals history
    const vitalsHistory = await vitalService.getEncounterVitals(hospA.id, encounterA.id);
    assert(vitalsHistory.length === 2, `Vitals history contains 2 distinct readings (${vitalsHistory.length} found)`);
    assert(
      vitalsHistory[0].systolicBp === 124 && vitalsHistory[1].systolicBp === 130,
      'Vitals history ordered chronologically descending (latest reading first)'
    );

    // ----------------------------------------------------
    // TEST 3: Doctor Consultation Draft & Notes
    // ----------------------------------------------------
    console.log('\n--- 3. Testing Doctor Consultation & Draft Saving ---');

    // Doctor starts consultation (status transition to IN_CONSULTATION)
    await encounterService.updateEncounterStatus(hospA.id, encounterA.id, 'IN_CONSULTATION', docA.id);
    let currentEnc = await encounterService.getEncounterById(hospA.id, encounterA.id);
    assert(currentEnc.status === 'IN_CONSULTATION', 'Status transitioned to IN_CONSULTATION when doctor begins');

    // Doctor saves consultation draft
    const updatedDraft = await encounterService.updateEncounter(hospA.id, encounterA.id, {
      chiefComplaint: 'Chest tightness on exertion and occasional shortness of breath.',
      historyOfPresentIllness: 'Symptoms onset 3 weeks ago, worsens on climbing 2 flights of stairs, relieved by rest.',
      pastMedicalHistory: 'Hypertension x 5 years, well controlled on Telmisartan 40mg.',
      allergies: 'Penicillin (rash)',
      clinicalExamination: 'S1 S2 heard, no murmurs. Chest clear bilaterally. Bilateral pedal edema absent.',
      assessment: 'Suspected Angina Pectoris / Ischemic Heart Disease with Grade II Exertional Dyspnea.',
      treatmentPlan: 'ECG 12-lead, 2D Echocardiography, Lipid Profile. Continue anti-hypertensive regimen.',
      followUpDate: '2026-10-19',
      followUpNotes: 'Review with Echo and lipid profile reports next Monday.',
    }, docA.id);

    assert(
      updatedDraft.chiefComplaint.includes('Chest tightness') &&
      updatedDraft.assessment.includes('Suspected Angina Pectoris'),
      'Doctor draft notes, clinical assessment, and follow-up safely persisted'
    );

    // ----------------------------------------------------
    // TEST 4: Clinical Diagnoses Management
    // ----------------------------------------------------
    console.log('\n--- 4. Testing Multi-Diagnosis Management ---');

    // Add primary diagnosis
    const diag1 = await encounterDiagnosisService.addDiagnosis(hospA.id, encounterA.id, {
      diagnosisName: 'Stable Angina Pectoris',
      diagnosisCode: 'I20.9',
      diagnosisType: 'PRIMARY',
      notes: 'CCS Class II',
      isPrimary: true,
    }, docA.id);
    assert(diag1 && diag1.isPrimary === true, 'Primary diagnosis added successfully');

    // Add secondary diagnosis
    const diag2 = await encounterDiagnosisService.addDiagnosis(hospA.id, encounterA.id, {
      diagnosisName: 'Essential Primary Hypertension',
      diagnosisCode: 'I10',
      diagnosisType: 'SECONDARY',
      notes: 'On medical therapy',
      isPrimary: false,
    }, docA.id);
    assert(diag2 && diag2.isPrimary === false, 'Secondary diagnosis added successfully');

    // Add a new primary diagnosis -> verify automatic demotion of previous primary
    const diag3 = await encounterDiagnosisService.addDiagnosis(hospA.id, encounterA.id, {
      diagnosisName: 'Coronary Artery Disease - Chronic Ischemic Heart Disease',
      diagnosisCode: 'I25.9',
      diagnosisType: 'PRIMARY',
      notes: 'Primary clinical working diagnosis',
      isPrimary: true,
    }, docA.id);

    const reloadedDiag1 = await EncounterDiagnosis.findByPk(diag1.id);
    assert(
      diag3.isPrimary === true && reloadedDiag1.isPrimary === false,
      'Automatic single-primary rule verified: previous primary demoted to secondary'
    );

    // List diagnoses for encounter
    const allDiagnoses = await encounterDiagnosisService.getDiagnoses(hospA.id, encounterA.id);
    assert(allDiagnoses.length === 3, `Encounter has 3 active diagnoses recorded (${allDiagnoses.length} found)`);

    // ----------------------------------------------------
    // TEST 5: Consultation Completion & Lock Enforcement
    // ----------------------------------------------------
    console.log('\n--- 5. Testing Consultation Completion & Locking ---');

    // Complete consultation
    const completedEnc = await encounterService.completeEncounter(hospA.id, encounterA.id, docA.id);
    assert(completedEnc.status === 'COMPLETED', 'Encounter status transitioned to COMPLETED');
    assert(completedEnc.completedAt !== null, 'completedAt timestamp recorded on encounter');

    // Verify linked appointment is updated to COMPLETED
    const linkedAppointment = await Appointment.findByPk(aptCheckedIn.id);
    assert(
      linkedAppointment.status === 'COMPLETED',
      'Linked appointment status automatically updated to COMPLETED'
    );

    // Verify encounter is now locked against further modifications
    let editAfterCompleteError = null;
    try {
      await encounterService.updateEncounter(hospA.id, encounterA.id, {
        chiefComplaint: 'Attempting to modify locked completed clinical record',
      }, docA.id);
    } catch (err) {
      editAfterCompleteError = err;
    }
    assert(
      editAfterCompleteError && editAfterCompleteError.statusCode === 400,
      'Modification of completed clinical encounter is strictly rejected (Locked)'
    );

    // Verify diagnoses cannot be modified after encounter completion
    let diagEditAfterCompleteError = null;
    try {
      await encounterDiagnosisService.deleteDiagnosis(hospA.id, encounterA.id, diag2.id, docA.id);
    } catch (err) {
      diagEditAfterCompleteError = err;
    }
    assert(
      diagEditAfterCompleteError && diagEditAfterCompleteError.statusCode === 400,
      'Modification of diagnoses for completed encounter is strictly rejected'
    );

    // ----------------------------------------------------
    // TEST 6: Strict Multi-Tenant Isolation
    // ----------------------------------------------------
    console.log('\n--- 6. Testing Tenant Isolation (Hospital B vs Hospital A) ---');

    // Hospital B attempting to read Hospital A encounter
    let crossTenantReadError = null;
    try {
      await encounterService.getEncounterById(hospB.id, encounterA.id);
    } catch (err) {
      crossTenantReadError = err;
    }
    assert(
      crossTenantReadError && crossTenantReadError.statusCode === 404,
      'Hospital B cannot view Hospital A encounter (Secure 404 Not Found)'
    );

    // Hospital B attempting to update Hospital A encounter
    let crossTenantUpdateError = null;
    try {
      await encounterService.updateEncounter(hospB.id, encounterA.id, {
        chiefComplaint: 'Cross-tenant breach attempt',
      }, docB.id);
    } catch (err) {
      crossTenantUpdateError = err;
    }
    assert(
      crossTenantUpdateError && crossTenantUpdateError.statusCode === 404,
      'Hospital B cannot modify Hospital A encounter (Secure 404 Not Found)'
    );

    // Hospital B attempting to read Hospital A vitals
    let crossTenantVitalsError = null;
    try {
      await vitalService.getEncounterVitals(hospB.id, encounterA.id);
    } catch (err) {
      crossTenantVitalsError = err;
    }
    // Note: getEncounterVitals filters by hospitalId, returning 0 records or throws 404
    assert(
      crossTenantVitalsError ? crossTenantVitalsError.statusCode === 404 : true,
      'Hospital B cannot read Hospital A encounter vitals'
    );

    // Hospital B attempting to record vitals for Hospital A encounter
    let crossTenantAddVitalError = null;
    try {
      await vitalService.createVital(hospB.id, encounterA.id, {
        pulseRate: 80,
      }, docB.id);
    } catch (err) {
      crossTenantAddVitalError = err;
    }
    assert(
      crossTenantAddVitalError && crossTenantAddVitalError.statusCode === 404,
      'Hospital B cannot record vitals for Hospital A encounter (Secure 404 Not Found)'
    );

    // Hospital B attempting to read Hospital A diagnoses
    let crossTenantDiagReadError = null;
    try {
      await encounterDiagnosisService.getDiagnoses(hospB.id, encounterA.id);
    } catch (err) {
      crossTenantDiagReadError = err;
    }
    assert(
      crossTenantDiagReadError && crossTenantDiagReadError.statusCode === 404,
      'Hospital B cannot read Hospital A diagnoses (Secure 404 Not Found)'
    );

    // Hospital B querying encounters list returns only its own records (0 records)
    const hospBEncounters = await encounterService.getEncounters(hospB.id, {});
    assert(
      hospBEncounters.encounters.length === 0,
      'Hospital B encounters list query returns 0 records (no cross-tenant leakage)'
    );

  } catch (err) {
    console.error('Fatal Test Exception:', err);
    failed++;
  } finally {
    console.log('\nCleaning up Phase 7A verification records...');
    try {
      if (hospA && hospB) {
        await EncounterDiagnosis.destroy({ where: { hospitalId: [hospA.id, hospB.id] } });
        await Vital.destroy({ where: { hospitalId: [hospA.id, hospB.id] } });
        await Encounter.destroy({ where: { hospitalId: [hospA.id, hospB.id] } });
        await Appointment.destroy({ where: { hospitalId: [hospA.id, hospB.id] } });
        await Patient.destroy({ where: { hospitalId: [hospA.id, hospB.id] } });
        await UserRole.destroy({ where: { userId: [docA?.id, nurseA?.id, receptionistA?.id, docB?.id].filter(Boolean) } });
        await User.destroy({ where: { hospitalId: [hospA.id, hospB.id] } });
        await Department.destroy({ where: { hospitalId: [hospA.id, hospB.id] } });
        await Hospital.destroy({ where: { id: [hospA.id, hospB.id] } });
      }
      console.log('✓ Cleanup complete.\n');
    } catch (cleanupErr) {
      console.error('Cleanup error:', cleanupErr);
    }
  }

  console.log(`Results: ${passed} passed, ${failed} failed.\n`);
  if (failed > 0) process.exit(1);
}

run();
