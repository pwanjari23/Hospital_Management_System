import {
  Hospital,
  User,
  Role,
  UserRole,
  Department,
  Patient,
  Bed,
  Ward,
  IpdAdmission,
  DischargeSummary,
  Encounter,
  Prescription,
  PrescriptionItem,
  Investigation,
  InvestigationOrder,
  Medicine,
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
  console.log('\n=== PHASE 9B VERIFICATION TEST SUITE: INPATIENT CLINICAL CARE & DISCHARGE ===\n');

  let hospA, hospB;
  let adminA, docA, nurseA, docB;
  let patientA1, patientA2, patientB1;
  let deptA;
  let wardA, bed101A, bed102A;
  let admissionA1, admissionA2;

  try {
    // ----------------------------------------------------
    // SETUP: Tenants, Staff, Roles, Patients, Wards & Beds
    // ----------------------------------------------------
    console.log('--- Setup: Tenants, Staff, Roles, Patients & IPD Foundation ---');

    hospA = await Hospital.create({
      name: 'Alpha Apex Hospital 9B',
      slug: `alpha-apex-9b-${Date.now()}`,
      status: 'ACTIVE',
    });

    hospB = await Hospital.create({
      name: 'Beta Beacon Hospital 9B',
      slug: `beta-beacon-9b-${Date.now()}`,
      status: 'ACTIVE',
    });

    // Roles
    const [adminRole] = await Role.findOrCreate({
      where: { name: 'HOSPITAL_ADMIN' },
      defaults: { description: 'Hospital Administrator', scope: 'HOSPITAL' },
    });
    const [docRole] = await Role.findOrCreate({
      where: { name: 'DOCTOR' },
      defaults: { description: 'Doctor', scope: 'HOSPITAL' },
    });
    const [nurseRole] = await Role.findOrCreate({
      where: { name: 'NURSE' },
      defaults: { description: 'Nurse', scope: 'HOSPITAL' },
    });

    // Users Hosp A
    adminA = await User.create({
      hospitalId: hospA.id,
      name: 'Admin Alpha 9B',
      email: `admin.alpha.9b.${Date.now()}@hospital.test`,
      passwordHash: 'dummyhash',
      status: 'ACTIVE',
    });
    await UserRole.create({ userId: adminA.id, roleId: adminRole.id });

    docA = await User.create({
      hospitalId: hospA.id,
      name: 'Dr. David Alpha 9B',
      email: `doc.david.9b.${Date.now()}@hospital.test`,
      passwordHash: 'dummyhash',
      status: 'ACTIVE',
    });
    await UserRole.create({ userId: docA.id, roleId: docRole.id });

    nurseA = await User.create({
      hospitalId: hospA.id,
      name: 'Nurse Nancy 9B',
      email: `nurse.nancy.9b.${Date.now()}@hospital.test`,
      passwordHash: 'dummyhash',
      status: 'ACTIVE',
    });
    await UserRole.create({ userId: nurseA.id, roleId: nurseRole.id });

    // Users Hosp B
    docB = await User.create({
      hospitalId: hospB.id,
      name: 'Dr. Dan Beta 9B',
      email: `doc.dan.9b.${Date.now()}@hospital.test`,
      passwordHash: 'dummyhash',
      status: 'ACTIVE',
    });
    await UserRole.create({ userId: docB.id, roleId: docRole.id });

    // Patients
    patientA1 = await Patient.create({
      hospitalId: hospA.id,
      firstName: 'Alice',
      lastName: 'Inpatient',
      uhid: `UHID-9B-A1-${Date.now()}`,
      gender: 'FEMALE',
      dateOfBirth: '1988-04-12',
      phone: '9876543210',
    });

    patientA2 = await Patient.create({
      hospitalId: hospA.id,
      firstName: 'Arthur',
      lastName: 'Wardstay',
      uhid: `UHID-9B-A2-${Date.now()}`,
      gender: 'MALE',
      dateOfBirth: '1975-09-20',
      phone: '9876543211',
    });

    patientB1 = await Patient.create({
      hospitalId: hospB.id,
      firstName: 'Bob',
      lastName: 'BetaPatient',
      uhid: `UHID-9B-B1-${Date.now()}`,
      gender: 'MALE',
      dateOfBirth: '1992-11-05',
      phone: '9876543212',
    });

    // Department & Ward Hosp A
    deptA = await Department.create({
      hospitalId: hospA.id,
      name: 'General Medicine 9B',
      code: `GM9B-${Date.now()}`.slice(0, 10),
      isActive: true,
    });

    wardA = await Ward.create({
      hospitalId: hospA.id,
      wardCode: `MED-A-${Date.now()}`.slice(0, 20),
      wardName: 'Medical Care Ward A',
      wardType: 'GENERAL',
      isActive: true,
    });

    bed101A = await Bed.create({
      hospitalId: hospA.id,
      wardId: wardA.id,
      bedNumber: '101-A',
      bedType: 'STANDARD',
      status: 'AVAILABLE',
      isActive: true,
    });

    bed102A = await Bed.create({
      hospitalId: hospA.id,
      wardId: wardA.id,
      bedNumber: '102-A',
      bedType: 'STANDARD',
      status: 'AVAILABLE',
      isActive: true,
    });

    // Create active admissions
    admissionA1 = await ipdService.createAdmission(
      hospA.id,
      {
        patientId: patientA1.id,
        admittingDoctorId: docA.id,
        wardId: wardA.id,
        bedId: bed101A.id,
        departmentId: deptA.id,
        admissionType: 'PLANNED',
        reasonForAdmission: 'Severe community acquired pneumonia',
        provisionalDiagnosis: 'Right lower lobe pneumonia',
      },
      docA
    );

    admissionA2 = await ipdService.createAdmission(
      hospA.id,
      {
        patientId: patientA2.id,
        admittingDoctorId: docA.id,
        wardId: wardA.id,
        bedId: bed102A.id,
        departmentId: deptA.id,
        admissionType: 'EMERGENCY',
        reasonForAdmission: 'Acute gastroenteritis with dehydration',
        provisionalDiagnosis: 'Acute gastroenteritis',
      },
      docA
    );

    assert(admissionA1 && admissionA1.id, 'Admission A1 created successfully with status ADMITTED');
    assert(admissionA2 && admissionA2.id, 'Admission A2 created successfully with status ADMITTED');

    // Cross-tenant patient admission prevention
    try {
      await ipdService.createAdmission(
        hospA.id,
        {
          patientId: patientB1.id,
          admittingDoctorId: docA.id,
          wardId: wardA.id,
          bedId: bed101A.id,
          admissionType: 'ELECTIVE',
          reasonForAdmission: 'Cross-tenant admission attempt',
        },
        docA
      );
      assert(false, 'Should NOT be able to admit patient from another hospital');
    } catch (err) {
      assert(err.statusCode === 404, 'Cross-tenant patient admission blocked with 404');
    }

    // ====================================================
    // GROUP 1: INPATIENT VITALS & BMI CALCULATION (Tests 1-8)
    // ====================================================
    console.log('\n--- Group 1: Inpatient Vitals & BMI Calculations ---');

    const vital1 = await ipdService.createInpatientVital(
      hospA.id,
      admissionA1.id,
      {
        temperature: 100.4,
        pulseRate: 98,
        systolicBp: 120,
        diastolicBp: 80,
        spo2: 96,
        respiratoryRate: 20,
        weightKg: 70,
        heightCm: 175,
        painScore: 2,
        notes: 'Patient resting in bed, comfortable',
      },
      nurseA
    );

    assert(vital1 && vital1.id, 'Inpatient vital recorded successfully');
    assert(vital1.ipdAdmissionId === admissionA1.id, 'Vital linked correctly to IPD admission');
    assert(vital1.patientId === patientA1.id, 'Vital linked correctly to patient');
    assert(Number(vital1.bmi) === 22.9, `Automatic server-side BMI calculated accurately (${vital1.bmi} === 22.9)`);

    // Record second vitals entry for trend tracking
    const vital2 = await ipdService.createInpatientVital(
      hospA.id,
      admissionA1.id,
      {
        temperature: 98.6,
        pulseRate: 76,
        systolicBp: 118,
        diastolicBp: 78,
        spo2: 99,
        respiratoryRate: 16,
        notes: 'Temperature normalized after medication',
      },
      nurseA
    );

    assert(vital2 && vital2.id, 'Second vital entry recorded successfully');

    const vitalsList = await ipdService.getAdmissionVitals(hospA.id, admissionA1.id);
    assert(Array.isArray(vitalsList) && vitalsList.length >= 2, `Retrieved multiple vitals (${vitalsList.length}) for admission`);
    assert(vitalsList[0].recordedAt >= vitalsList[1].recordedAt, 'Vitals ordered by recordedAt descending');

    // Cross-tenant vitals isolation
    try {
      await ipdService.createInpatientVital(
        hospB.id,
        admissionA1.id,
        { pulseRate: 80 },
        docB
      );
      assert(false, 'Cross-tenant vital creation should be rejected');
    } catch (err) {
      assert(err.statusCode === 404, 'Cross-tenant vital creation securely rejected with 404');
    }

    // ====================================================
    // GROUP 2: DOCTOR PROGRESS NOTES (SOAP) (Tests 9-19)
    // ====================================================
    console.log('\n--- Group 2: Doctor Daily Progress Notes (SOAP) ---');

    const progress1 = await ipdService.createProgressNote(
      hospA.id,
      admissionA1.id,
      {
        subjective: 'Patient reports reduced cough, productive with clear sputum, good appetite.',
        objective: 'Chest auscultation: minimal rhonchi at right base. Afebrile. SpO2 98% on room air.',
        assessment: 'Resolving lobar pneumonia, responding well to antibiotics.',
        plan: 'Switch IV antibiotics to oral azithromycin tomorrow. Ambulate as tolerated.',
        status: 'DRAFT',
      },
      docA
    );

    assert(progress1 && progress1.id, 'Doctor progress note created successfully');
    assert(progress1.status === 'DRAFT', 'Initial note created as DRAFT');
    assert(progress1.doctorId === docA.id, 'Doctor ID assigned correctly');
    assert(progress1.assessment.includes('Resolving lobar pneumonia'), 'Assessment content preserved accurately');

    // Retrieve note by ID
    const retrievedNote = await ipdService.getProgressNoteById(hospA.id, progress1.id);
    assert(retrievedNote && retrievedNote.id === progress1.id, 'Retrieved progress note by noteId');

    // Update draft progress note
    const updatedDraft = await ipdService.updateProgressNote(
      hospA.id,
      progress1.id,
      {
        plan: 'Switch IV antibiotics to oral azithromycin tomorrow. Ambulate as tolerated. Check discharge readiness in 24h.',
      },
      docA
    );
    assert(updatedDraft.plan.includes('Check discharge readiness'), 'Draft progress note updated successfully');

    // Finalize note
    const finalizedNote = await ipdService.finalizeProgressNote(hospA.id, progress1.id, docA);
    assert(finalizedNote.status === 'FINALIZED', 'Progress note status transitioned to FINALIZED');
    assert(finalizedNote.finalizedAt !== null, 'finalizedAt timestamp set upon finalization');
    assert(finalizedNote.finalizedBy === docA.id, 'finalizedBy doctor ID recorded');

    // Immutability Protection: Cannot modify finalized progress note
    try {
      await ipdService.updateProgressNote(
        hospA.id,
        progress1.id,
        { assessment: 'Tampered assessment' },
        docA
      );
      assert(false, 'Finalized progress note should NOT be editable');
    } catch (err) {
      assert(err.statusCode === 400 && err.message.includes('Finalized'), 'Finalized progress note edit rejected (Immutability enforced)');
    }

    // Already finalized re-finalization protection
    try {
      await ipdService.finalizeProgressNote(hospA.id, progress1.id, docA);
      assert(false, 'Re-finalizing already finalized note should fail');
    } catch (err) {
      assert(err.statusCode === 400, 'Re-finalizing already finalized progress note safely blocked');
    }

    // Cross-tenant progress note access
    try {
      await ipdService.getProgressNoteById(hospB.id, progress1.id);
      assert(false, 'Cross-tenant progress note retrieval should fail');
    } catch (err) {
      assert(err.statusCode === 404, 'Cross-tenant progress note query securely blocked with 404');
    }

    // ====================================================
    // GROUP 3: NURSING NOTES WORKFLOW (Tests 20-29)
    // ====================================================
    console.log('\n--- Group 3: Nursing Daily Notes Workflow ---');

    const nurseNote1 = await ipdService.createNursingNote(
      hospA.id,
      admissionA1.id,
      {
        observations: 'Patient resting comfortably. Vitals stable. Tolerating soft diet well.',
        painScale: 1,
        mobility: 'Assisted ambulation in corridor',
        diet: 'Regular',
        intakeOutput: 'In: 1500ml, Out: 1200ml',
        nursingInterventions: 'Oral medication administered. Chest physiotherapy performed.',
        safetyObservations: 'Bed rails up, call light within easy reach.',
        status: 'DRAFT',
      },
      nurseA
    );

    assert(nurseNote1 && nurseNote1.id, 'Nursing note created successfully');
    assert(nurseNote1.nurseId === nurseA.id, 'Nurse ID recorded correctly');
    assert(nurseNote1.painScale === 1, 'Pain scale recorded accurately');
    assert(nurseNote1.status === 'DRAFT', 'Nursing note saved as DRAFT');

    // Retrieve nursing notes for admission
    const nursingList = await ipdService.getNursingNotes(hospA.id, admissionA1.id);
    assert(Array.isArray(nursingList) && nursingList.length >= 1, 'Retrieved nursing notes list for admission');

    // Update draft nursing note
    const updatedNurseDraft = await ipdService.updateNursingNote(
      hospA.id,
      nurseNote1.id,
      {
        diet: 'Soft diabetic diet',
      },
      nurseA
    );
    assert(updatedNurseDraft.diet === 'Soft diabetic diet', 'Draft nursing note updated successfully');

    // Finalize nursing note
    const finalizedNurseNote = await ipdService.finalizeNursingNote(hospA.id, nurseNote1.id, nurseA);
    assert(finalizedNurseNote.status === 'FINALIZED', 'Nursing note finalized successfully');
    assert(finalizedNurseNote.finalizedBy === nurseA.id, 'finalizedBy nurse ID recorded');

    // Nursing note immutability: Cannot modify finalized nursing note
    try {
      await ipdService.updateNursingNote(
        hospA.id,
        nurseNote1.id,
        { observations: 'Modified after finalization' },
        nurseA
      );
      assert(false, 'Finalized nursing note should NOT be editable');
    } catch (err) {
      assert(err.statusCode === 400 && err.message.includes('Finalized'), 'Finalized nursing note modification rejected (Immutability enforced)');
    }

    // Cross-tenant nursing note isolation
    try {
      await ipdService.getNursingNoteById(hospB.id, nurseNote1.id);
      assert(false, 'Cross-tenant nursing note access should fail');
    } catch (err) {
      assert(err.statusCode === 404, 'Cross-tenant nursing note securely blocked with 404');
    }

    // ====================================================
    // GROUP 4: CLINICAL CONTEXT & TIMELINE (Tests 30-36)
    // ====================================================
    console.log('\n--- Group 4: Inpatient Context (Prescriptions, Labs) & Chronological Timeline ---');

    // Create an inpatient encounter for patient A1
    const encA1 = await Encounter.create({
      hospitalId: hospA.id,
      patientId: patientA1.id,
      doctorId: docA.id,
      ipdAdmissionId: admissionA1.id,
      encounterNumber: `ENC-9B-${Date.now()}`.slice(0, 50),
      encounterType: 'IPD',
      status: 'IN_CONSULTATION',
    });

    // Create a clinical prescription for patient A1
    const medicineA = await Medicine.create({
      hospitalId: hospA.id,
      name: `Azithromycin 500mg 9B ${Date.now()}`,
      dosageForm: 'TABLET',
      strength: '500mg',
      unit: 'mg',
      status: 'ACTIVE',
    });

    const rx = await Prescription.create({
      hospitalId: hospA.id,
      patientId: patientA1.id,
      encounterId: encA1.id,
      doctorId: docA.id,
      prescriptionNumber: `RX-9B-${Date.now()}`.slice(0, 50),
      status: 'FINALIZED',
    });

    await PrescriptionItem.create({
      hospitalId: hospA.id,
      prescriptionId: rx.id,
      medicineId: medicineA.id,
      medicineName: medicineA.name,
      dosage: '500mg',
      frequency: 'OD',
      duration: '5 days',
      route: 'ORAL',
    });

    const admissionPrescriptions = await ipdService.getAdmissionPrescriptions(hospA.id, admissionA1.id);
    assert(Array.isArray(admissionPrescriptions) && admissionPrescriptions.length >= 1, 'Inpatient prescriptions retrieved cleanly');
    assert(admissionPrescriptions[0].items.length >= 1, 'Prescription items and medicine detail included');

    // Create an investigation order for patient A1
    const invA = await Investigation.create({
      hospitalId: hospA.id,
      name: `Chest X-Ray PA View 9B ${Date.now()}`,
      code: `CXR9B-${Date.now()}`.slice(0, 10),
      category: 'RADIOLOGY',
      defaultCharge: 500,
      status: 'ACTIVE',
    });

    await InvestigationOrder.create({
      hospitalId: hospA.id,
      patientId: patientA1.id,
      encounterId: encA1.id,
      doctorId: docA.id,
      investigationId: invA.id,
      investigationName: invA.name,
      orderNumber: `ORD-9B-${Date.now()}`.slice(0, 50),
      priority: 'ROUTINE',
      status: 'ORDERED',
    });

    const admissionInvestigations = await ipdService.getAdmissionInvestigations(hospA.id, admissionA1.id);
    assert(Array.isArray(admissionInvestigations) && admissionInvestigations.length >= 1, 'Inpatient investigations retrieved cleanly');

    // Chronological unified clinical timeline
    const timelineEvents = await ipdService.getAdmissionTimeline(hospA.id, admissionA1.id);
    assert(Array.isArray(timelineEvents) && timelineEvents.length >= 4, `Unified timeline returned ${timelineEvents.length} events`);

    const hasAdmissionEvent = timelineEvents.some((e) => e.eventType === 'ADMISSION');
    const hasVitalEvent = timelineEvents.some((e) => e.eventType === 'VITALS');
    const hasProgressEvent = timelineEvents.some((e) => e.eventType === 'DOCTOR_PROGRESS');
    const hasNursingEvent = timelineEvents.some((e) => e.eventType === 'NURSING_NOTE');

    assert(hasAdmissionEvent, 'Timeline includes ADMISSION event');
    assert(hasVitalEvent, 'Timeline includes VITALS event');
    assert(hasProgressEvent, 'Timeline includes DOCTOR_PROGRESS event');
    assert(hasNursingEvent, 'Timeline includes NURSING_NOTE event');

    // ====================================================
    // GROUP 5: DISCHARGE SUMMARY PREPARATION (Tests 37-44)
    // ====================================================
    console.log('\n--- Group 5: Discharge Summary Preparation & Medications ---');

    const dischargeDraft = await ipdService.createOrUpdateDischargeSummary(
      hospA.id,
      admissionA1.id,
      {
        finalDiagnosis: 'Community-Acquired Pneumonia, resolved',
        hospitalCourse: 'Patient admitted with lobar pneumonia. Responded completely to parenteral followed by oral antibiotic regimen. Complete clinical recovery.',
        significantFindings: 'Afebrility achieved by day 2. Clear chest examination prior to discharge.',
        treatmentGiven: 'IV Ceftriaxone 1g BD x 3 days, followed by oral Azithromycin 500mg OD.',
        conditionAtDischarge: 'Clinically Stable & Afebrile',
        disposition: 'HOME',
        dischargeInstructions: 'Maintain adequate oral fluid intake. Complete remaining course of antibiotics. Avoid smoking and dust exposure.',
        dietInstructions: 'Normal balanced diet.',
        warningSigns: 'Report immediately to emergency if recurrence of high fever, chest pain, or breathing difficulty.',
        followUpDate: '2026-10-15',
        followUpInstructions: 'Review in Medicine OPD with Dr. David after 7 days.',
        medications: [
          {
            medicineId: medicineA.id,
            medicineName: 'Azithromycin 500mg',
            dosage: '500mg',
            frequency: 'Once Daily (OD)',
            route: 'ORAL',
            duration: '3 days',
            instructions: 'Take 1 hour before food',
          },
        ],
      },
      docA
    );

    assert(dischargeDraft && dischargeDraft.id, 'Discharge summary draft created successfully');
    assert(dischargeDraft.status === 'DRAFT', 'Initial summary status is DRAFT');
    assert(dischargeDraft.dischargeSummaryNumber.startsWith('DIS-'), `Discharge summary number generated (${dischargeDraft.dischargeSummaryNumber})`);
    assert(dischargeDraft.finalDiagnosis === 'Community-Acquired Pneumonia, resolved', 'Final diagnosis stored accurately');
    assert(Array.isArray(dischargeDraft.medications) && dischargeDraft.medications.length === 1, 'Discharge medications saved and linked');

    // Admission status updated to DISCHARGE_PENDING
    const admissionAfterDraft = await IpdAdmission.findByPk(admissionA1.id);
    assert(admissionAfterDraft.status === 'DISCHARGE_PENDING', 'Admission status updated to DISCHARGE_PENDING upon discharge summary drafting');

    // Retrieve discharge summary
    const retrievedSummary = await ipdService.getDischargeSummary(hospA.id, admissionA1.id);
    assert(retrievedSummary && retrievedSummary.id === dischargeDraft.id, 'Discharge summary retrieved successfully');

    // Cross-tenant discharge summary access
    try {
      await ipdService.getDischargeSummary(hospB.id, admissionA1.id);
      assert(false, 'Cross-tenant discharge summary access should fail');
    } catch (err) {
      assert(err.statusCode === 404, 'Cross-tenant discharge summary securely blocked with 404');
    }

    // ====================================================
    // GROUP 6: ATOMIC DISCHARGE & BED RELEASE (Tests 45-55)
    // ====================================================
    console.log('\n--- Group 6: Atomic Discharge & Bed Release Transaction ---');

    // Verify bed is currently OCCUPIED before discharge
    const bedBeforeDischarge = await Bed.findByPk(bed101A.id);
    assert(bedBeforeDischarge.status === 'OCCUPIED', 'Bed 101-A is confirmed OCCUPIED before final discharge');

    // Execute Final Discharge Transaction
    const dischargedAdmission = await ipdService.finalizeDischargeAndReleaseBed(
      hospA.id,
      admissionA1.id,
      {
        finalDiagnosis: 'Community-Acquired Pneumonia, resolved',
        conditionAtDischarge: 'Excellent / Recovered',
        disposition: 'HOME',
      },
      docA
    );

    assert(dischargedAdmission.status === 'DISCHARGED', 'Admission status updated atomically to DISCHARGED');
    assert(dischargedAdmission.dischargedAt !== null, 'dischargedAt timestamp recorded on admission');

    // Authoritative check on bed status after discharge
    const bedAfterDischarge = await Bed.findByPk(bed101A.id);
    assert(bedAfterDischarge.status === 'AVAILABLE', 'Assigned Bed 101-A atomically released to AVAILABLE');

    // Check discharge summary status is now FINALIZED
    const finalizedSummary = await DischargeSummary.findOne({
      where: { hospitalId: hospA.id, admissionId: admissionA1.id },
    });
    assert(finalizedSummary.status === 'FINALIZED', 'Discharge summary marked FINALIZED');
    assert(finalizedSummary.finalizedAt !== null, 'Discharge summary finalizedAt timestamp recorded');
    assert(finalizedSummary.finalizedBy === docA.id, 'Discharge summary finalizedBy doctor ID recorded');

    // Immutability Protection: Cannot update finalized discharge summary
    try {
      await ipdService.createOrUpdateDischargeSummary(
        hospA.id,
        admissionA1.id,
        { finalDiagnosis: 'Tampered Final Diagnosis' },
        docA
      );
      assert(false, 'Finalized discharge summary should NOT be editable');
    } catch (err) {
      assert(err.statusCode === 400 && err.message.includes('Finalized'), 'Finalized discharge summary edit rejected (Immutability enforced)');
    }

    // Double Discharge Prevention: Cannot discharge an already discharged admission
    try {
      await ipdService.finalizeDischargeAndReleaseBed(
        hospA.id,
        admissionA1.id,
        {},
        docA
      );
      assert(false, 'Double discharge must be rejected');
    } catch (err) {
      assert(err.statusCode === 400 && err.message.includes('already discharged'), 'Double discharge attempt cleanly rejected with 400');
    }

    // Cannot add vitals to discharged admission
    try {
      await ipdService.createInpatientVital(
        hospA.id,
        admissionA1.id,
        { pulseRate: 72 },
        nurseA
      );
      assert(false, 'Adding vitals to discharged admission should fail');
    } catch (err) {
      assert(err.statusCode === 400 && err.message.includes('discharged'), 'Vitals recording on discharged admission prevented');
    }

    // Cannot add doctor progress to discharged admission
    try {
      await ipdService.createProgressNote(
        hospA.id,
        admissionA1.id,
        { assessment: 'Post discharge note' },
        docA
      );
      assert(false, 'Adding progress note to discharged admission should fail');
    } catch (err) {
      assert(err.statusCode === 400 && err.message.includes('discharged'), 'Doctor progress recording on discharged admission prevented');
    }

    // Cannot add nursing notes to discharged admission
    try {
      await ipdService.createNursingNote(
        hospA.id,
        admissionA1.id,
        { observations: 'Post discharge nursing note' },
        nurseA
      );
      assert(false, 'Adding nursing note to discharged admission should fail');
    } catch (err) {
      assert(err.statusCode === 400 && err.message.includes('discharged'), 'Nursing note recording on discharged admission prevented');
    }

    // Cross-tenant discharge attempt blocked
    try {
      await ipdService.finalizeDischargeAndReleaseBed(
        hospB.id,
        admissionA2.id,
        {},
        docB
      );
      assert(false, 'Cross-tenant discharge attempt should fail');
    } catch (err) {
      assert(err.statusCode === 404, 'Cross-tenant discharge attempt blocked with 404');
    }

    // ====================================================
    // GROUP 7: CANCELLED ADMISSION PROTECTIONS (Tests 56-59)
    // ====================================================
    console.log('\n--- Group 7: Cancelled Stay Protections ---');

    await ipdService.cancelAdmission(hospA.id, admissionA2.id, { reason: 'Patient transfer to another facility' }, adminA);
    const cancelledAdmission = await IpdAdmission.findByPk(admissionA2.id);
    assert(cancelledAdmission.status === 'CANCELLED', 'Admission A2 cancelled successfully');

    try {
      await ipdService.finalizeDischargeAndReleaseBed(hospA.id, admissionA2.id, {}, docA);
      assert(false, 'Cannot discharge a cancelled admission');
    } catch (err) {
      assert(err.statusCode === 400 && err.message.includes('cancelled'), 'Discharge of cancelled admission blocked');
    }

    try {
      await ipdService.createInpatientVital(hospA.id, admissionA2.id, { pulseRate: 80 }, nurseA);
      assert(false, 'Cannot record vitals on cancelled admission');
    } catch (err) {
      assert(err.statusCode === 400 && err.message.includes('cancelled'), 'Vitals on cancelled admission blocked');
    }

    try {
      await ipdService.createProgressNote(hospA.id, admissionA2.id, { subjective: 'Checking on cancelled stay' }, docA);
      assert(false, 'Cannot record progress notes on cancelled admission');
    } catch (err) {
      assert(err.statusCode === 400 && err.message.includes('cancelled'), 'Progress note on cancelled admission blocked');
    }

    // ====================================================
    // GROUP 8: DASHBOARD METRICS EXTENSION (Tests 60-62)
    // ====================================================
    console.log('\n--- Group 8: IPD Dashboard Metrics Extension ---');

    const metrics = await ipdService.getIpdDashboardMetrics(hospA.id);
    assert(typeof metrics.todayDischarges === 'number' && metrics.todayDischarges >= 1, `Dashboard metrics include todayDischarges (${metrics.todayDischarges})`);
    assert(typeof metrics.dischargePending === 'number', `Dashboard metrics include dischargePending (${metrics.dischargePending})`);
    assert(metrics.occupiedBeds === 0, `Bed census accurate: occupiedBeds is 0 after discharge and cancellation (${metrics.occupiedBeds})`);

  } catch (error) {
    console.error('UNEXPECTED SUITE ERROR:', error?.message || error);
    if (error?.original) console.error('DB ERROR DETAIL:', error.original.message);
    if (error?.stack) console.error(error.stack);
    failed++;
  } finally {
    console.log('\n====================================================');
    console.log(`PHASE 9B VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    await sequelize.close();
    process.exit(failed > 0 ? 1 : 0);
  }
}

run();
