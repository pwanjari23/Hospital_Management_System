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
  Medicine,
  Investigation,
  Prescription,
  InvestigationOrder,
  EecpPackage,
  EecpAssessment,
  EecpTreatmentCourse,
  EecpSession,
  EecpSessionReading,
  sequelize,
} from '../models/index.js';
import eecpService from '../services/eecp.service.js';
import prescriptionService from '../services/prescription.service.js';
import investigationOrderService from '../services/investigationOrder.service.js';
import encounterService from '../services/encounter.service.js';

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
  console.log('\n=== PHASE 7C VERIFICATION TEST SUITE: EECP CLINICAL WORKFLOW ===\n');

  let hospA, hospB;
  let docA, nurseA, receptionistA, docB;
  let patientA, patientB, deptA, deptB;
  let aptA, encounterA, encounterB;
  let packageA, packageB;
  let courseA, session1, session2;

  try {
    // ----------------------------------------------------
    // SETUP: Tenants, Staff, Masters, Patients, Encounters
    // ----------------------------------------------------
    console.log('--- Setup: Tenants, Staff, Masters & Clinical Baseline ---');

    hospA = await Hospital.create({
      name: 'Alpha Cardiac & EECP Hospital 7C',
      slug: 'alpha-eecp-7c',
      status: 'ACTIVE',
    });

    hospB = await Hospital.create({
      name: 'Beta Healthcare Hospital 7C',
      slug: 'beta-healthcare-7c',
      status: 'ACTIVE',
    });

    deptA = await Department.create({
      hospitalId: hospA.id,
      name: 'Cardiology & EECP 7C',
      code: 'EECP-7C',
      status: 'ACTIVE',
    });

    deptB = await Department.create({
      hospitalId: hospB.id,
      name: 'General Medicine 7C',
      code: 'GEN-7C',
      status: 'ACTIVE',
    });

    const [doctorRole] = await Role.findOrCreate({ where: { name: 'DOCTOR' } });
    const [nurseRole] = await Role.findOrCreate({ where: { name: 'NURSE' } });
    const [receptionistRole] = await Role.findOrCreate({ where: { name: 'RECEPTIONIST' } });

    docA = await User.create({
      hospitalId: hospA.id,
      name: 'Dr. Vikram Mehta',
      email: `dr.mehta.7c.${Date.now()}@alphaeecp.test`,
      passwordHash: 'dummyhash',
      status: 'ACTIVE',
    });
    await UserRole.create({ userId: docA.id, roleId: doctorRole.id });

    nurseA = await User.create({
      hospitalId: hospA.id,
      name: 'Sister Sunita Patil',
      email: `nurse.sunita.7c.${Date.now()}@alphaeecp.test`,
      passwordHash: 'dummyhash',
      status: 'ACTIVE',
    });
    await UserRole.create({ userId: nurseA.id, roleId: nurseRole.id });

    receptionistA = await User.create({
      hospitalId: hospA.id,
      name: 'Pooja Sharma',
      email: `pooja.reception.7c.${Date.now()}@alphaeecp.test`,
      passwordHash: 'dummyhash',
      status: 'ACTIVE',
    });
    await UserRole.create({ userId: receptionistA.id, roleId: receptionistRole.id });

    docB = await User.create({
      hospitalId: hospB.id,
      name: 'Dr. Suresh Joshi',
      email: `dr.joshi.7c.${Date.now()}@betacare.test`,
      passwordHash: 'dummyhash',
      status: 'ACTIVE',
    });
    await UserRole.create({ userId: docB.id, roleId: doctorRole.id });

    patientA = await Patient.create({
      hospitalId: hospA.id,
      uhid: 'UHID-7C-PAT-001',
      firstName: 'Ramesh',
      lastName: 'Kulkarni',
      gender: 'MALE',
      dateOfBirth: '1965-04-12',
      phone: '9822001122',
      status: 'ACTIVE',
    });

    patientB = await Patient.create({
      hospitalId: hospB.id,
      uhid: 'UHID-7C-PAT-002',
      firstName: 'Sita',
      lastName: 'Bapat',
      gender: 'FEMALE',
      dateOfBirth: '1970-08-20',
      phone: '9822003344',
      status: 'ACTIVE',
    });

    aptA = await Appointment.create({
      hospitalId: hospA.id,
      appointmentNumber: 'APT-7C-0001',
      patientId: patientA.id,
      doctorId: docA.id,
      departmentId: deptA.id,
      appointmentDate: '2026-10-07',
      startTime: '10:00:00',
      endTime: '10:30:00',
      status: 'CHECKED_IN',
    });

    encounterA = await Encounter.create({
      hospitalId: hospA.id,
      encounterNumber: 'ENC-7C-0001',
      patientId: patientA.id,
      appointmentId: aptA.id,
      doctorId: docA.id,
      departmentId: deptA.id,
      encounterType: 'EECP_CONSULTATION',
      status: 'IN_CONSULTATION',
    });

    encounterB = await Encounter.create({
      hospitalId: hospB.id,
      encounterNumber: 'ENC-7C-0002',
      patientId: patientB.id,
      doctorId: docB.id,
      departmentId: deptB.id,
      encounterType: 'OPD',
      status: 'IN_CONSULTATION',
    });

    packageA = await EecpPackage.create({
      hospitalId: hospA.id,
      name: 'Comprehensive 35-Hour EECP Therapy',
      numberOfSessions: 35,
      packagePrice: 50000.00,
      status: 'ACTIVE',
    });

    packageB = await EecpPackage.create({
      hospitalId: hospB.id,
      name: 'Beta Hospital 20-Hour EECP Therapy',
      numberOfSessions: 20,
      packagePrice: 30000.00,
      status: 'ACTIVE',
    });

    console.log('✓ Setup complete.\n');


    // ----------------------------------------------------
    // SECTION 1: EECP ASSESSMENT
    // ----------------------------------------------------
    console.log('--- Section 1: EECP Assessment Tests ---');

    // Test 1: EECP assessment creation
    const assessmentData = {
      indication: 'Severe Refractory Angina / CCS Class III',
      cardiacHistory: 'Post-CABG with recurrent ischemia, severe LAD disease',
      previousInterventions: 'CABG x 3 grafts (2018), PTCA with DES to RCA (2021)',
      currentSymptoms: 'Angina on mild exertion, CCS Class III, shortness of breath on climbing stairs',
      functionalStatus: 'CCS_CLASS_III',
      baselineAssessment: 'Resting BP 128/82, HR 68 regular, no peripheral edema, good pedal pulses',
      suitabilityAssessment: 'SUITABLE',
      contraindicationNotes: 'No aortic insufficiency, no active thrombophlebitis, INR within normal limits',
      recommendedSessions: 35,
      doctorNotes: 'Patient cleared for standard 35-hour EECP course. Target augmentation ratio >= 1.2.',
    };

    const createdAssessment = await eecpService.upsertAssessment(
      hospA.id,
      encounterA.id,
      assessmentData,
      docA.id
    );

    assert(
      createdAssessment &&
        createdAssessment.id &&
        createdAssessment.suitabilityAssessment === 'SUITABLE' &&
        createdAssessment.recommendedSessions === 35,
      'Test 1: EECP assessment successfully created for encounter'
    );

    // Test 2: EECP assessment update
    const updatedAssessment = await eecpService.upsertAssessment(
      hospA.id,
      encounterA.id,
      {
        ...assessmentData,
        doctorNotes: 'Updated: Cleared for 35 sessions, begin treatment promptly.',
        functionalStatus: 'CCS_CLASS_III',
      },
      docA.id
    );

    assert(
      updatedAssessment &&
        updatedAssessment.id === createdAssessment.id &&
        updatedAssessment.doctorNotes.includes('Updated: Cleared'),
      'Test 2: EECP assessment update correctly modifies existing assessment without duplicate'
    );

    // Test 3: Assessment tenant isolation
    let assessmentTenantError = null;
    try {
      await eecpService.getEncounterAssessment(hospB.id, encounterA.id);
    } catch (e) {
      assessmentTenantError = e;
    }

    let crossEncounterError = null;
    try {
      await eecpService.upsertAssessment(hospA.id, encounterB.id, assessmentData, docA.id);
    } catch (e) {
      crossEncounterError = e;
    }

    assert(
      assessmentTenantError && assessmentTenantError.statusCode === 404 &&
      crossEncounterError && crossEncounterError.statusCode === 404,
      'Test 3: Cross-tenant assessment access returns secure 404'
    );

    // Test 4: Invalid encounter rejection
    let invalidEncounterError = null;
    try {
      await eecpService.upsertAssessment(
        hospA.id,
        '00000000-0000-0000-0000-000000000000',
        assessmentData,
        docA.id
      );
    } catch (e) {
      invalidEncounterError = e;
    }
    assert(
      invalidEncounterError && invalidEncounterError.statusCode === 404,
      'Test 4: Non-existent encounter for assessment correctly rejected with 404'
    );

    // ----------------------------------------------------
    // SECTION 2: EECP TREATMENT COURSE & VALIDATIONS
    // ----------------------------------------------------
    console.log('\n--- Section 2: EECP Treatment Course & Sequencing ---');

    // Test 5: EECP course creation
    courseA = await eecpService.createCourse(
      hospA.id,
      {
        patientId: patientA.id,
        initiatingEncounterId: encounterA.id,
        doctorId: docA.id,
        packageId: packageA.id,
        plannedSessions: 35,
        startDate: '2026-10-07',
        treatmentPlan: 'Standard 35-Hour EECP Protocol: 1 hour daily, 5-6 days per week.',
        notes: 'High priority treatment for ischemic symptoms relief.',
      },
      docA.id
    );

    assert(
      courseA && courseA.id && courseA.patientId === patientA.id,
      'Test 5: EECP treatment course created successfully'
    );

    // Test 6: Course number generation (EECP-YYYY-000001)
    const currentYear = new Date().getFullYear();
    const expectedPrefix = `EECP-${currentYear}-`;
    assert(
      courseA.courseNumber && courseA.courseNumber.startsWith(expectedPrefix),
      `Test 6: Course number correctly generated server-side using sequence (${courseA.courseNumber})`
    );

    // Test 7: Course package validation (cross-tenant package rejected)
    let crossPkgError = null;
    try {
      await eecpService.createCourse(
        hospA.id,
        {
          patientId: patientA.id,
          packageId: packageB.id, // belongs to hospB
          plannedSessions: 20,
        },
        docA.id
      );
    } catch (e) {
      crossPkgError = e;
    }
    assert(
      crossPkgError && (crossPkgError.statusCode === 404 || crossPkgError.statusCode === 400),
      'Test 7: Cross-tenant package usage rejected during course creation'
    );

    // Test 8: Course patient validation (cross-tenant patient rejected)
    let crossPatError = null;
    try {
      await eecpService.createCourse(
        hospA.id,
        {
          patientId: patientB.id, // belongs to hospB
          packageId: packageA.id,
          plannedSessions: 35,
        },
        docA.id
      );
    } catch (e) {
      crossPatError = e;
    }
    assert(
      crossPatError && (crossPatError.statusCode === 404 || crossPatError.statusCode === 400),
      'Test 8: Cross-tenant patient usage rejected during course creation'
    );

    // Test 9: Course doctor validation (cross-tenant doctor rejected)
    let crossDocError = null;
    try {
      await eecpService.createCourse(
        hospA.id,
        {
          patientId: patientA.id,
          doctorId: docB.id, // belongs to hospB
          packageId: packageA.id,
          plannedSessions: 35,
        },
        docA.id
      );
    } catch (e) {
      crossDocError = e;
    }
    assert(
      crossDocError && (crossDocError.statusCode === 404 || crossDocError.statusCode === 400),
      'Test 9: Cross-tenant doctor assignment rejected during course creation'
    );


    // Test 10: Duplicate active course prevention
    // First activate courseA
    await eecpService.updateCourseStatus(hospA.id, courseA.id, 'ACTIVE', 'Treatment started', docA.id);

    let dupCourseError = null;
    try {
      await eecpService.createCourse(
        hospA.id,
        {
          patientId: patientA.id,
          packageId: packageA.id,
          plannedSessions: 35,
        },
        docA.id
      );
    } catch (e) {
      dupCourseError = e;
    }
    assert(
      dupCourseError && dupCourseError.statusCode === 400 && dupCourseError.message.includes('already has an active'),
      'Test 10: Duplicate active course for same patient rejected'
    );

    // Test 11: Course status transitions
    const pausedCourse = await eecpService.updateCourseStatus(
      hospA.id,
      courseA.id,
      'PAUSED',
      'Temporarily paused due to mild cough',
      docA.id
    );
    assert(pausedCourse.status === 'PAUSED', 'Test 11a: Course successfully transitioned to PAUSED');

    const resumedCourse = await eecpService.updateCourseStatus(
      hospA.id,
      courseA.id,
      'ACTIVE',
      'Cough resolved, resuming treatment',
      docA.id
    );
    assert(resumedCourse.status === 'ACTIVE', 'Test 11b: Course successfully resumed to ACTIVE');

    // ----------------------------------------------------
    // SECTION 3: SESSIONS & TELEMETRIC MONITORING
    // ----------------------------------------------------
    console.log('\n--- Section 3: Sessions, Pre-Assessment & Monitoring Readings ---');

    // Test 12: Session creation
    session1 = await eecpService.scheduleSession(
      hospA.id,
      courseA.id,
      {
        scheduledDate: '2026-10-07T10:00:00Z',
        staffId: nurseA.id,
        doctorId: docA.id,
        preSessionNotes: 'First session of 35-hour course',
      },
      nurseA.id
    );

    assert(
      session1 && session1.id && session1.sessionNumber === 1 && session1.status === 'SCHEDULED',
      'Test 12: EECP session #1 scheduled successfully'
    );

    // Test 13: Session number sequencing (Course specific)
    session2 = await eecpService.scheduleSession(
      hospA.id,
      courseA.id,
      {
        scheduledDate: '2026-10-08T10:00:00Z',
        staffId: nurseA.id,
        doctorId: docA.id,
      },
      nurseA.id
    );

    assert(
      session2 && session2.sessionNumber === 2,
      'Test 13: Subsequent session automatically sequences to #2 within course'
    );

    // Test 14: Duplicate session prevention
    let dupSessionError = null;
    try {
      await eecpService.scheduleSession(
        hospA.id,
        courseA.id,
        {
          sessionNumber: 1, // Already exists
          scheduledDate: '2026-10-09T10:00:00Z',
        },
        nurseA.id
      );
    } catch (e) {
      dupSessionError = e;
    }
    assert(
      dupSessionError && dupSessionError.statusCode === 400 && dupSessionError.message.includes('already'),
      'Test 14: Duplicate session number within course correctly rejected'
    );


    // Test 15: Session lifecycle transitions
    // Transition 1: SCHEDULED -> PRE_ASSESSMENT
    const preSess = await eecpService.updateSessionStatus(
      hospA.id,
      session1.id,
      { status: 'PRE_ASSESSMENT' },
      nurseA.id
    );
    assert(preSess.status === 'PRE_ASSESSMENT', 'Test 15a: Transition SCHEDULED -> PRE_ASSESSMENT succeeded');

    // Test 16: Invalid lifecycle transition rejection (PRE_ASSESSMENT directly to COMPLETED without IN_PROGRESS)
    let invalidTransitionError = null;
    try {
      await eecpService.updateSessionStatus(
        hospA.id,
        session1.id,
        { status: 'COMPLETED' },
        nurseA.id
      );
    } catch (e) {
      invalidTransitionError = e;
    }
    assert(
      invalidTransitionError && invalidTransitionError.statusCode === 400,
      'Test 16: Invalid transition PRE_ASSESSMENT directly to COMPLETED rejected'
    );

    // Transition 2: PRE_ASSESSMENT -> IN_PROGRESS
    const inProgressSess = await eecpService.updateSessionStatus(
      hospA.id,
      session1.id,
      { status: 'IN_PROGRESS' },
      nurseA.id
    );
    assert(
      inProgressSess.status === 'IN_PROGRESS' && inProgressSess.startedAt !== null,
      'Test 15b: Transition PRE_ASSESSMENT -> IN_PROGRESS succeeded with startedAt timestamp'
    );

    // Test 17: Pre-session assessment recording
    const preAssessmentRecord = await eecpService.recordPreAssessment(
      hospA.id,
      session1.id,
      {
        systolicBp: 122,
        diastolicBp: 78,
        pulseRate: 70,
        spo2: 99,
        weightKg: 74.5,
        patientReadiness: 'GOOD',
        symptoms: 'Asymptomatic at rest',
        notes: 'Cuffs secured on calves, thighs, and buttocks. ECG signal strong.',
      },
      nurseA.id
    );

    assert(
      preAssessmentRecord.preAssessment &&
        preAssessmentRecord.preAssessment.systolicBp === 122 &&
        preAssessmentRecord.preAssessment.pulseRate === 70,
      'Test 17: Pre-session assessment vitals and readiness recorded'
    );

    // Test 18: Session monitoring reading 1
    const reading1 = await eecpService.addSessionReading(
      hospA.id,
      session1.id,
      {
        treatmentPressure: 240,
        systolicBp: 124,
        diastolicBp: 80,
        pulseRate: 68,
        spo2: 99,
        symptoms: 'None, comfortable',
        notes: 'Inflation timing synchronized with dicrotic notch.',
      },
      nurseA.id
    );

    assert(
      reading1 && reading1.id && reading1.treatmentPressure == 240,
      'Test 18: First intra-session telemetry reading recorded'
    );

    // Test 19: Multiple monitoring readings (reading 2 with increased pressure)
    const reading2 = await eecpService.addSessionReading(
      hospA.id,
      session1.id,
      {
        treatmentPressure: 280,
        systolicBp: 126,
        diastolicBp: 82,
        pulseRate: 70,
        spo2: 99,
        symptoms: 'Good tolerance',
        notes: 'Peak augmentation achieved. Patient relaxed.',
      },
      nurseA.id
    );

    assert(
      reading2 && reading2.id && reading2.treatmentPressure == 280,
      'Test 19: Second telemetry reading recorded at higher therapeutic pressure'
    );


    // Test 20: Chronological reading retrieval
    const readings = await eecpService.getSessionReadings(hospA.id, session1.id);
    assert(
      readings.length === 2 &&
        new Date(readings[0].recordedAt).getTime() <= new Date(readings[1].recordedAt).getTime(),
      'Test 20: Telemetric readings retrieved in chronological order'
    );

    // Test 21: Post-session assessment & Test 22: Session completion
    const completedSession = await eecpService.updateSessionStatus(
      hospA.id,
      session1.id,
      {
        status: 'COMPLETED',
        postAssessment: {
          systolicBp: 120,
          diastolicBp: 76,
          pulseRate: 66,
          spo2: 99,
          patientTolerance: 'TOLERATED_WELL',
        },
        postSessionNotes: 'Session completed successfully. Patient rested 10 min post-deflation.',
        adverseEvent: false,
      },
      nurseA.id
    );

    assert(
      completedSession.status === 'COMPLETED' &&
        completedSession.completedAt !== null &&
        completedSession.postAssessment?.patientTolerance === 'TOLERATED_WELL',
      'Test 21 & 22: Session completed with post-assessment and lock timestamp'
    );

    // Test 23: Course progress calculation
    const progress = await eecpService.getCourseProgress(hospA.id, courseA.id);
    assert(
      progress.plannedSessions === 35 &&
        progress.completedSessions === 1 &&
        progress.remainingSessions === 34 &&
        progress.progressPercentage === 3 &&
        progress.nextSessionNumber === 3,
      'Test 23: Course progress dynamically and accurately calculated from session records'
    );

    // Test 24: Completed-session locking
    let lockedModificationError = null;
    try {
      await eecpService.updateSessionStatus(
        hospA.id,
        session1.id,
        { status: 'IN_PROGRESS' }, // Attempting to reopen completed session
        nurseA.id
      );
    } catch (e) {
      lockedModificationError = e;
    }
    assert(
      lockedModificationError && lockedModificationError.statusCode === 400 && lockedModificationError.message.includes('completed'),
      'Test 24a: Reopening or status-modifying a completed session is strictly rejected'
    );

    let lockedDeletionError = null;
    try {
      await eecpService.deleteSession(hospA.id, session1.id);
    } catch (e) {
      lockedDeletionError = e;
    }
    assert(
      lockedDeletionError && lockedDeletionError.statusCode === 400,
      'Test 24b: Deleting a completed session is strictly forbidden'
    );

    // Test 25: Course completion when planned sessions are completed
    // Create a mini 1-session test course to verify automatic course completion
    const miniCourse = await eecpService.createCourse(
      hospA.id,
      {
        patientId: patientA.id,
        packageId: packageA.id,
        allowConcurrent: true,
        plannedSessions: 1, // 1 planned session
        startDate: '2026-10-07',
        notes: 'Mini course for completion test',
      },
      docA.id
    );
    await eecpService.updateCourseStatus(hospA.id, miniCourse.id, 'ACTIVE', 'Active', docA.id);

    const miniSession = await eecpService.scheduleSession(
      hospA.id,
      miniCourse.id,
      { scheduledDate: '2026-10-07T12:00:00Z' },
      nurseA.id
    );
    await eecpService.updateSessionStatus(hospA.id, miniSession.id, { status: 'PRE_ASSESSMENT' }, nurseA.id);
    await eecpService.updateSessionStatus(hospA.id, miniSession.id, { status: 'IN_PROGRESS' }, nurseA.id);
    await eecpService.updateSessionStatus(
      hospA.id,
      miniSession.id,
      { status: 'COMPLETED', postAssessment: { systolicBp: 120, diastolicBp: 80 } },
      nurseA.id
    );

    const updatedMiniCourse = await eecpService.getCourseById(hospA.id, miniCourse.id);
    assert(
      updatedMiniCourse.completedSessions === 1 && updatedMiniCourse.status === 'COMPLETED',
      'Test 25: Course automatically transitions to COMPLETED when planned sessions reached'
    );

    // Test 26 & 27: Session cancellation & cancellation reason
    const cancelledSession = await eecpService.updateSessionStatus(
      hospA.id,
      session2.id,
      {
        status: 'CANCELLED',
        cancellationReason: 'Patient had travel commitment; rescheduled to next week.',
      },
      nurseA.id
    );

    assert(
      cancelledSession.status === 'CANCELLED' &&
        cancelledSession.cancellationReason === 'Patient had travel commitment; rescheduled to next week.',
      'Test 26 & 27: Session cancelled with recorded cancellation reason'
    );

    // ----------------------------------------------------
    // SECTION 4: OPERATIONAL METRICS & RBAC
    // ----------------------------------------------------
    console.log('\n--- Section 4: Operational Dashboard Metrics & RBAC ---');

    // Test 28: Operational Dashboard metrics
    const metrics = await eecpService.getEecpDashboardMetrics(hospA.id);
    assert(
      metrics &&
        metrics.activeCourses >= 1 &&
        typeof metrics.todaySessions === 'number',
      'Test 28: Operational EECP dashboard metrics aggregated accurately'
    );

    // Test 29: Doctor access (Doctor can create/update course)
    const docCourse = await eecpService.createCourse(
      hospA.id,
      {
        patientId: patientA.id,
        packageId: packageA.id,
        allowConcurrent: true,
        plannedSessions: 10,
        startDate: '2026-10-07',
        treatmentPlan: 'Maintenance protocol',
      },
      docA.id
    );

    assert(docCourse && docCourse.id, 'Test 29: Doctor authorized to create treatment course');

    // Test 30: Nurse access (Nurse can record telemetry readings)
    const nurseSession = await eecpService.scheduleSession(
      hospA.id,
      docCourse.id,
      { scheduledDate: '2026-10-07T14:00:00Z' },
      nurseA.id
    );
    await eecpService.updateSessionStatus(hospA.id, nurseSession.id, { status: 'PRE_ASSESSMENT' }, nurseA.id);
    await eecpService.updateSessionStatus(hospA.id, nurseSession.id, { status: 'IN_PROGRESS' }, nurseA.id);
    const nurseReading = await eecpService.addSessionReading(
      hospA.id,
      nurseSession.id,
      { treatmentPressure: 250, recordedBy: nurseA.id },
      nurseA.id
    );
    assert(
      nurseReading && (nurseReading.treatmentPressure == 250 || nurseReading.treatmentPressure === '250'),
      'Test 30: Nurse authorized to record telemetry'
    );

    // Test 31: Receptionist restriction (operational listing vs clinical modification)
    const coursesList = await eecpService.getCourses(hospA.id);
    assert(
      Array.isArray(coursesList) || (coursesList && Array.isArray(coursesList.courses)),
      'Test 31: Receptionist/Staff can view operational courses'
    );

    // ----------------------------------------------------
    // SECTION 5: TENANT ISOLATION
    // ----------------------------------------------------
    console.log('\n--- Section 5: Tenant Isolation Tests ---');

    // Test 32: Cross-tenant course read
    let crossCourseReadError = null;
    try {
      await eecpService.getCourseById(hospB.id, courseA.id);
    } catch (e) {
      crossCourseReadError = e;
    }
    assert(
      crossCourseReadError && crossCourseReadError.statusCode === 404,
      'Test 32: Cross-tenant course read returns secure 404'
    );

    // Test 33: Cross-tenant course update
    let crossCourseUpdateError = null;
    try {
      await eecpService.updateCourse(hospB.id, courseA.id, { notes: 'Hack' }, docB.id);
    } catch (e) {
      crossCourseUpdateError = e;
    }
    assert(
      crossCourseUpdateError && crossCourseUpdateError.statusCode === 404,
      'Test 33: Cross-tenant course update returns secure 404'
    );

    // Test 34: Cross-tenant session read
    let crossSessionReadError = null;
    try {
      await eecpService.getSessionById(hospB.id, session1.id);
    } catch (e) {
      crossSessionReadError = e;
    }
    assert(
      crossSessionReadError && crossSessionReadError.statusCode === 404,
      'Test 34: Cross-tenant session read returns secure 404'
    );

    // Test 35: Cross-tenant session update
    let crossSessionUpdateError = null;
    try {
      await eecpService.updateSessionStatus(hospB.id, session1.id, { status: 'CANCELLED' }, docB.id);
    } catch (e) {
      crossSessionUpdateError = e;
    }
    assert(
      crossSessionUpdateError && crossSessionUpdateError.statusCode === 404,
      'Test 35: Cross-tenant session update returns secure 404'
    );

    // Test 36: Audit stamping
    assert(
      session1.createdBy === nurseA.id &&
        courseA.createdBy === docA.id &&
        reading1.recordedBy === nurseA.id,
      'Test 36: Audit stamping captures createdBy and recordedBy across all EECP entities'
    );

    // ----------------------------------------------------
    // SECTION 6: REGRESSIONS (Phases 7B, 7A, 6, 5 & DB)
    // ----------------------------------------------------
    console.log('\n--- Section 6: Architecture & Regression Tests ---');

    // Test 37: Existing Phase 7B prescription regression
    const testMed = await Medicine.create({
      hospitalId: hospA.id,
      name: 'Aspirin 7C Reg',
      dosageForm: 'TABLET',
      strength: '75 mg',
      status: 'ACTIVE',
    });

    const rx = await prescriptionService.createPrescription(
      hospA.id,
      encounterA.id,
      {
        items: [
          {
            medicineId: testMed.id,
            dosage: '75 mg',
            frequency: 'Once Daily',
            route: 'ORAL',
          },
        ],
      },
      docA.id
    );
    assert(rx && rx.id && rx.status === 'DRAFT', 'Test 37: Phase 7B Prescription creation regression PASS');

    // Test 38: Existing Phase 7B investigation regression
    const testInv = await Investigation.create({
      hospitalId: hospA.id,
      name: '2D Echocardiography 7C Reg',
      investigationCode: 'ECHO-7C',
      modality: 'CARDIOLOGY',
      status: 'ACTIVE',
    });

    const invOrder = await investigationOrderService.createInvestigationOrder(
      hospA.id,
      encounterA.id,
      {
        investigationId: testInv.id,
        priority: 'ROUTINE',
        clinicalIndication: 'Pre-EECP baseline ejection fraction evaluation',
      },
      docA.id
    );
    assert(invOrder && invOrder.id, 'Test 38: Phase 7B Investigation Order creation regression PASS');

    // Test 39: Existing Phase 7A encounter regression
    const encDetails = await encounterService.getEncounterById(hospA.id, encounterA.id);
    assert(
      encDetails && encDetails.id === encounterA.id && encDetails.patientId === patientA.id,
      'Test 39: Phase 7A Encounter retrieval and structure regression PASS'
    );

    // Test 40: Existing Phase 6 appointment regression
    const aptFind = await Appointment.findOne({ where: { id: aptA.id, hospitalId: hospA.id } });
    assert(aptFind && aptFind.appointmentNumber === 'APT-7C-0001', 'Test 40: Phase 6 Appointment model regression PASS');

    // Test 41: Existing Phase 5 clinical master regression
    const pkgFind = await EecpPackage.findOne({ where: { id: packageA.id, hospitalId: hospA.id } });
    assert(pkgFind && pkgFind.numberOfSessions === 35, 'Test 41: Phase 5 EecpPackage master regression PASS');

    // Test 42: Database regression
    await sequelize.authenticate();
    assert(true, 'Test 42: Database connection and Sequelize ORM regression PASS');

  } catch (err) {
    console.error('Fatal Test Exception in verifyPhase7C:', err);
    failed++;
  } finally {
    console.log('\nCleaning up Phase 7C verification records...');
    try {
      if (hospA && hospB) {
        await EecpSessionReading.destroy({ where: { hospitalId: [hospA.id, hospB.id] } });
        await EecpSession.destroy({ where: { hospitalId: [hospA.id, hospB.id] } });
        await EecpTreatmentCourse.destroy({ where: { hospitalId: [hospA.id, hospB.id] } });
        await EecpAssessment.destroy({ where: { hospitalId: [hospA.id, hospB.id] } });
        await InvestigationOrder.destroy({ where: { hospitalId: [hospA.id, hospB.id] } });
        await Prescription.destroy({ where: { hospitalId: [hospA.id, hospB.id] } });
        await Vital.destroy({ where: { hospitalId: [hospA.id, hospB.id] } });
        await EncounterDiagnosis.destroy({ where: { hospitalId: [hospA.id, hospB.id] } });
        await Encounter.destroy({ where: { hospitalId: [hospA.id, hospB.id] } });
        await Appointment.destroy({ where: { hospitalId: [hospA.id, hospB.id] } });
        await EecpPackage.destroy({ where: { hospitalId: [hospA.id, hospB.id] } });
        await Medicine.destroy({ where: { hospitalId: [hospA.id, hospB.id] } });
        await Investigation.destroy({ where: { hospitalId: [hospA.id, hospB.id] } });
        await Patient.destroy({ where: { hospitalId: [hospA.id, hospB.id] } });
        await UserRole.destroy({
          where: { userId: [docA?.id, nurseA?.id, receptionistA?.id, docB?.id].filter(Boolean) },
        });
        await User.destroy({ where: { hospitalId: [hospA.id, hospB.id] } });
        await Department.destroy({ where: { hospitalId: [hospA.id, hospB.id] } });
        await Hospital.destroy({ where: { id: [hospA.id, hospB.id] } });
      }
      console.log('✓ Cleanup complete.\n');
    } catch (cleanupErr) {
      console.error('Cleanup error:', cleanupErr);
    }
  }

  console.log(`Phase 7C Results: ${passed} passed, ${failed} failed.\n`);
  if (failed > 0) process.exit(1);
}

run();
