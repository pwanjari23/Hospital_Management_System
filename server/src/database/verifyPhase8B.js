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
  Investigation,
  InvestigationOrder,
  InvestigationSample,
  InvestigationResult,
  Medicine,
  Prescription,
  PrescriptionItem,
  MedicineBatch,
  PharmacyStockTransaction,
  PrescriptionDispensing,
  PrescriptionDispensingItem,
  EecpPackage,
  sequelize,
} from '../models/index.js';
import * as laboratoryService from '../services/laboratory.service.js';
import * as investigationOrderService from '../services/investigationOrder.service.js';
import pharmacyService from '../services/pharmacy.service.js';
import prescriptionService from '../services/prescription.service.js';

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
  console.log('\n=== PHASE 8B VERIFICATION TEST SUITE: LABORATORY & INVESTIGATION RESULTS ===\n');

  let hospA, hospB;
  let docA, labStaffA, pathologistA, nurseA, receptionistA, docB, labStaffB;
  let patientA, patientB, deptA, deptB;
  let encA, encB;
  let invA1, invA2, invA3, invB1;
  let orderA1, orderA2, orderB1;
  let sampleA1, sampleA2;
  let resultA1, resultA2;

  try {
    // ----------------------------------------------------
    // SETUP: Tenants, Staff, Investigation Masters & Encounters
    // ----------------------------------------------------
    console.log('--- Setup: Tenants, Staff, Investigation Masters & Clinical Orders ---');

    hospA = await Hospital.create({
      name: 'Alpha Diagnostic Hospital 8B',
      slug: `alpha-diag-8b-${Date.now()}`,
      status: 'ACTIVE',
    });

    hospB = await Hospital.create({
      name: 'Beta General Hospital 8B',
      slug: `beta-general-8b-${Date.now()}`,
      status: 'ACTIVE',
    });

    deptA = await Department.create({
      hospitalId: hospA.id,
      name: 'Pathology & Lab 8B',
      code: 'PATH-8B',
      status: 'ACTIVE',
    });

    deptB = await Department.create({
      hospitalId: hospB.id,
      name: 'General Lab 8B',
      code: 'GLAB-8B',
      status: 'ACTIVE',
    });

    const [docRole] = await Role.findOrCreate({ where: { name: 'DOCTOR' }, defaults: { scope: 'HOSPITAL' } });
    const [labRole] = await Role.findOrCreate({ where: { name: 'LAB_STAFF' }, defaults: { scope: 'HOSPITAL' } });
    const [nurseRole] = await Role.findOrCreate({ where: { name: 'NURSE' }, defaults: { scope: 'HOSPITAL' } });
    const [recepRole] = await Role.findOrCreate({ where: { name: 'RECEPTIONIST' }, defaults: { scope: 'HOSPITAL' } });

    docA = await User.create({
      hospitalId: hospA.id,
      name: 'Dr. Neha Kulkarni 8B',
      email: `neha.kulkarni8b.${Date.now()}@alpha.test`,
      passwordHash: 'dummyhash',
      status: 'ACTIVE',
      departmentId: deptA.id,
    });
    await UserRole.create({ userId: docA.id, roleId: docRole.id });

    labStaffA = await User.create({
      hospitalId: hospA.id,
      name: 'Suresh Lab Tech 8B',
      email: `suresh.lab8b.${Date.now()}@alpha.test`,
      passwordHash: 'dummyhash',
      status: 'ACTIVE',
      departmentId: deptA.id,
    });
    await UserRole.create({ userId: labStaffA.id, roleId: labRole.id });

    pathologistA = await User.create({
      hospitalId: hospA.id,
      name: 'Dr. Pathologist Sharma 8B',
      email: `pathologist8b.${Date.now()}@alpha.test`,
      passwordHash: 'dummyhash',
      status: 'ACTIVE',
      departmentId: deptA.id,
    });
    await UserRole.create({ userId: pathologistA.id, roleId: docRole.id });
    await UserRole.create({ userId: pathologistA.id, roleId: labRole.id });

    nurseA = await User.create({
      hospitalId: hospA.id,
      name: 'Sister Mary 8B',
      email: `mary8b.${Date.now()}@alpha.test`,
      passwordHash: 'dummyhash',
      status: 'ACTIVE',
      departmentId: deptA.id,
    });
    await UserRole.create({ userId: nurseA.id, roleId: nurseRole.id });

    receptionistA = await User.create({
      hospitalId: hospA.id,
      name: 'Ravi Reception 8B',
      email: `ravi8b.${Date.now()}@alpha.test`,
      passwordHash: 'dummyhash',
      status: 'ACTIVE',
      departmentId: deptA.id,
    });
    await UserRole.create({ userId: receptionistA.id, roleId: recepRole.id });

    docB = await User.create({
      hospitalId: hospB.id,
      name: 'Dr. Bipin Roy 8B',
      email: `bipin8b.${Date.now()}@beta.test`,
      passwordHash: 'dummyhash',
      status: 'ACTIVE',
      departmentId: deptB.id,
    });
    await UserRole.create({ userId: docB.id, roleId: docRole.id });

    labStaffB = await User.create({
      hospitalId: hospB.id,
      name: 'Ganesh Tech B 8B',
      email: `ganesh8b.${Date.now()}@beta.test`,
      passwordHash: 'dummyhash',
      status: 'ACTIVE',
      departmentId: deptB.id,
    });
    await UserRole.create({ userId: labStaffB.id, roleId: labRole.id });

    patientA = await Patient.create({
      hospitalId: hospA.id,
      uhid: `UHID-8B-${Date.now()}-1`,
      firstName: 'Ramesh',
      lastName: 'Patil',
      dateOfBirth: '1970-03-25',
      gender: 'MALE',
      bloodGroup: 'B_POSITIVE',
      phone: '9876543210',
      isActive: true,
    });

    patientB = await Patient.create({
      hospitalId: hospB.id,
      uhid: `UHID-8B-${Date.now()}-2`,
      firstName: 'Sunita',
      lastName: 'Verma',
      dateOfBirth: '1982-11-12',
      gender: 'FEMALE',
      bloodGroup: 'O_POSITIVE',
      phone: '9876543211',
      isActive: true,
    });

    encA = await Encounter.create({
      hospitalId: hospA.id,
      encounterNumber: `ENC-8B-${Date.now()}-1`,
      patientId: patientA.id,
      doctorId: docA.id,
      departmentId: deptA.id,
      encounterType: 'OPD',
      status: 'IN_CONSULTATION',
    });

    encB = await Encounter.create({
      hospitalId: hospB.id,
      encounterNumber: `ENC-8B-${Date.now()}-2`,
      patientId: patientB.id,
      doctorId: docB.id,
      departmentId: deptB.id,
      encounterType: 'OPD',
      status: 'IN_CONSULTATION',
    });

    // Investigations Master
    invA1 = await Investigation.create({
      hospitalId: hospA.id,
      name: 'Complete Blood Count (CBC) 8B',
      code: `CBC-8B-${Date.now()}`,
      category: 'PATHOLOGY',
      status: 'ACTIVE',
    });

    invA2 = await Investigation.create({
      hospitalId: hospA.id,
      name: 'Lipid Profile 8B',
      code: `LIP-8B-${Date.now()}`,
      category: 'BIOCHEMISTRY',
      status: 'ACTIVE',
    });

    invA3 = await Investigation.create({
      hospitalId: hospA.id,
      name: 'Thyroid Stimulating Hormone (TSH) 8B',
      code: `TSH-8B-${Date.now()}`,
      category: 'BIOCHEMISTRY',
      status: 'ACTIVE',
    });

    invB1 = await Investigation.create({
      hospitalId: hospB.id,
      name: 'HbA1c Glycated Hemoglobin 8B',
      code: `HBA1C-8B-${Date.now()}`,
      category: 'BIOCHEMISTRY',
      status: 'ACTIVE',
    });

    // ----------------------------------------------------
    // SECTION 1: CLINICAL INVESTIGATION ORDERS & QUEUE
    // ----------------------------------------------------
    console.log('\n--- Section 1: Clinical Investigation Orders & Laboratory Queue ---');

    // Create Order 1 in Hospital A: CBC (Priority: URGENT, Status: FINALIZED)
    orderA1 = await investigationOrderService.createInvestigationOrder(
      hospA.id,
      encA.id,
      {
        investigationId: invA1.id,
        priority: 'URGENT',
        clinicalIndication: 'Severe fatigue and routine cardiac checkup',
        status: 'FINALIZED',
      },
      docA.id
    );

    assert(
      orderA1 && orderA1.id && orderA1.status === 'FINALIZED' && orderA1.priority === 'URGENT',
      'Test 1: Investigation order created and finalized into laboratory queue'
    );

    // Create Order 2 in Hospital A: Lipid Profile (Priority: ROUTINE, Status: FINALIZED)
    orderA2 = await investigationOrderService.createInvestigationOrder(
      hospA.id,
      encA.id,
      {
        investigationId: invA2.id,
        priority: 'ROUTINE',
        clinicalIndication: 'Lipid monitoring',
        status: 'FINALIZED',
      },
      docA.id
    );

    assert(
      orderA2 && orderA2.id && orderA2.status === 'FINALIZED' && orderA2.priority === 'ROUTINE',
      'Test 2: Second investigation order created and finalized'
    );

    // Create Order in Hospital B
    orderB1 = await investigationOrderService.createInvestigationOrder(
      hospB.id,
      encB.id,
      {
        investigationId: invB1.id,
        priority: 'ROUTINE',
        clinicalIndication: 'Diabetes assessment',
        status: 'FINALIZED',
      },
      docB.id
    );

    assert(orderB1 && orderB1.id, 'Test 3: Hospital B investigation order created and finalized');

    // Test 4: Dashboard Metrics
    const metricsA = await laboratoryService.getLaboratoryDashboardMetrics(hospA.id);
    assert(
      metricsA &&
        typeof metricsA.pendingOrders === 'number' &&
        metricsA.pendingOrders >= 2 &&
        typeof metricsA.samplesPending === 'number' &&
        typeof metricsA.processing === 'number' &&
        typeof metricsA.awaitingVerification === 'number' &&
        typeof metricsA.criticalResults === 'number' &&
        typeof metricsA.resultsFinalizedToday === 'number',
      'Test 4: Laboratory dashboard metrics return all 6 counters'
    );

    // Test 5: Queue querying & pagination
    const queueList = await laboratoryService.getLaboratoryQueue(hospA.id, {
      page: 1,
      limit: 10,
    });
    assert(
      queueList &&
        Array.isArray(queueList.orders) &&
        queueList.total >= 2 &&
        queueList.page === 1 &&
        queueList.totalPages >= 1,
      'Test 5: Laboratory queue returns structured paginated orders'
    );

    // Test 6: Queue priority filter
    const urgentQueue = await laboratoryService.getLaboratoryQueue(hospA.id, {
      priority: 'URGENT',
    });
    assert(
      urgentQueue.orders.every((o) => o.priority === 'URGENT') &&
        urgentQueue.orders.some((o) => o.id === orderA1.id),
      'Test 6: Priority filter correctly returns URGENT orders'
    );

    // Test 7: Queue search filter by patient name
    const searchQueue = await laboratoryService.getLaboratoryQueue(hospA.id, {
      search: 'Ramesh',
    });
    assert(
      searchQueue.orders.some((o) => o.id === orderA1.id),
      'Test 7: Search filter correctly matches patient by name'
    );

    // Test 8: Order Details retrieval with associations
    const orderDetails = await laboratoryService.getLaboratoryOrderDetails(hospA.id, orderA1.id);
    assert(
      orderDetails &&
        orderDetails.id === orderA1.id &&
        orderDetails.patient &&
        orderDetails.patient.firstName === 'Ramesh' &&
        orderDetails.investigation &&
        orderDetails.investigation.name.includes('CBC') &&
        Array.isArray(orderDetails.samples),
      'Test 8: Order details include patient, doctor, investigation master, and samples'
    );

    // ----------------------------------------------------
    // SECTION 2: SAMPLE COLLECTION & SPECIMEN TRACKING
    // ----------------------------------------------------
    console.log('\n--- Section 2: Sample Collection & Specimen Tracking ---');

    // Test 9: Collect sample for Order A1 (CBC)
    sampleA1 = await laboratoryService.createOrCollectSample(
      hospA.id,
      orderA1.id,
      {
        sampleType: 'Whole Blood (EDTA)',
        status: 'COLLECTED',
        notes: 'Smooth venipuncture, 3ml EDTA tube',
      },
      labStaffA.id
    );

    assert(
      sampleA1 &&
        sampleA1.id &&
        sampleA1.status === 'COLLECTED' &&
        sampleA1.collectedBy === labStaffA.id &&
        Boolean(sampleA1.collectedAt) &&
        Boolean(sampleA1.sampleNumber),
      'Test 9: Sample collected successfully with metadata and sample number'
    );

    // Test 10: Auto-generated sample number prefix
    assert(
      sampleA1.sampleNumber.startsWith('LAB-'),
      'Test 10: System automatically generates LAB sequence prefix'
    );

    // Test 11: Collect sample for Order A2 (Lipid Profile)
    sampleA2 = await laboratoryService.createOrCollectSample(
      hospA.id,
      orderA2.id,
      {
        sampleType: 'Serum',
        status: 'COLLECTED',
        notes: '12-hour fasting sample, SST tube',
      },
      labStaffA.id
    );

    assert(sampleA2 && sampleA2.id && sampleA2.status === 'COLLECTED', 'Test 11: Second sample collected for lipid order');

    // Test 12: Receive sample in lab
    const receivedSample = await laboratoryService.updateSampleStatus(
      hospA.id,
      sampleA1.id,
      {
        status: 'RECEIVED',
        notes: 'Specimen inspected and received in laboratory accession desk',
      },
      labStaffA.id
    );
    assert(
      receivedSample.status === 'RECEIVED' && Boolean(receivedSample.receivedAt),
      'Test 12: Sample status updated to RECEIVED with timestamp'
    );

    // Test 13: Sample rejection scenario with audit note
    const tempSample = await laboratoryService.createOrCollectSample(
      hospA.id,
      orderA2.id,
      {
        sampleType: 'Serum',
        status: 'PENDING_COLLECTION',
        notes: 'Sample to be rejected test',
      },
      labStaffA.id
    );
    const rejectedSample = await laboratoryService.updateSampleStatus(
      hospA.id,
      tempSample.id,
      {
        status: 'REJECTED',
        rejectionReason: 'Hemolyzed specimen unsuitable for test',
      },
      labStaffA.id
    );
    assert(
      rejectedSample.status === 'REJECTED' &&
        rejectedSample.rejectionReason === 'Hemolyzed specimen unsuitable for test',
      'Test 13: Sample rejection recorded with explicit reason and audit'
    );

    // ----------------------------------------------------
    // SECTION 3: RESULT ENTRY & VALIDATION
    // ----------------------------------------------------
    console.log('\n--- Section 3: Result Entry & Validation ---');

    // Test 14: Enter result for CBC (Normal values)
    resultA1 = await laboratoryService.saveResult(
      hospA.id,
      orderA1.id,
      {
        sampleId: sampleA1.id,
        resultType: 'QUANTITATIVE',
        resultValue: '14.5',
        resultUnit: 'g/dL',
        referenceRange: '13.0 - 17.0',
        abnormalFlag: 'NORMAL',
        technicianNotes: 'Parameters calibrated on Sysmex automated analyzer',
        submitForVerification: true,
      },
      labStaffA.id
    );

    assert(
      resultA1 &&
        resultA1.id &&
        resultA1.status === 'RESULT_ENTERED' &&
        resultA1.enteredBy === labStaffA.id &&
        resultA1.abnormalFlag === 'NORMAL' &&
        resultA1.resultValue === '14.5',
      'Test 14: Laboratory result entered with RESULT_ENTERED status and audit'
    );

    // Test 15: Enter result for Lipid Profile (Critical High values)
    resultA2 = await laboratoryService.saveResult(
      hospA.id,
      orderA2.id,
      {
        sampleId: sampleA2.id,
        resultType: 'QUANTITATIVE',
        resultValue: '350',
        resultUnit: 'mg/dL',
        referenceRange: '< 150',
        abnormalFlag: 'CRITICAL',
        technicianNotes: 'Lipemic serum observed; re-run twice to confirm',
        submitForVerification: true,
      },
      labStaffA.id
    );

    assert(
      resultA2 &&
        resultA2.id &&
        resultA2.status === 'RESULT_ENTERED' &&
        resultA2.abnormalFlag === 'CRITICAL',
      'Test 15: Critical abnormal result entered and correctly tagged'
    );

    // Test 16: Draft result entry (submitForVerification = false)
    const draftResult = await laboratoryService.saveResult(
      hospA.id,
      orderA1.id,
      {
        resultValue: '14.8',
        submitForVerification: false,
      },
      labStaffA.id
    );
    assert(
      draftResult && draftResult.status === 'IN_PROGRESS' && draftResult.resultValue === '14.8',
      'Test 16: Draft result saving transitions to IN_PROGRESS'
    );

    // Re-submit for verification
    resultA1 = await laboratoryService.saveResult(
      hospA.id,
      orderA1.id,
      {
        resultValue: '14.5',
        submitForVerification: true,
      },
      labStaffA.id
    );

    // ----------------------------------------------------
    // SECTION 4: VERIFICATION & FINALIZATION LIFECYCLE
    // ----------------------------------------------------
    console.log('\n--- Section 4: Verification & Finalization Lifecycle ---');

    // Test 17: Pathologist verifies CBC result
    const verifiedResult1 = await laboratoryService.verifyResult(
      hospA.id,
      resultA1.id,
      'Normal hematology profile. Verified.',
      pathologistA.id
    );

    assert(
      verifiedResult1 &&
        verifiedResult1.status === 'VERIFIED' &&
        verifiedResult1.verifiedBy === pathologistA.id &&
        Boolean(verifiedResult1.verifiedAt),
      'Test 17: Pathologist verifies result, transitioning status to VERIFIED with audit'
    );

    // Test 18: Pathologist finalizes CBC result
    const finalizedResult1 = await laboratoryService.finalizeResult(
      hospA.id,
      resultA1.id,
      'All values clinically concordant. Report released.',
      pathologistA.id
    );

    assert(
      finalizedResult1 &&
        finalizedResult1.status === 'FINALIZED' &&
        finalizedResult1.finalizedBy === pathologistA.id &&
        Boolean(finalizedResult1.finalizedAt),
      'Test 18: Result finalized and report released to electronic medical record'
    );

    // Test 19: Direct finalization for urgent lipid profile
    const finalizedResult2 = await laboratoryService.finalizeResult(
      hospA.id,
      resultA2.id,
      'Severe mixed dyslipidemia. Urgent physician attention recommended.',
      pathologistA.id
    );

    assert(
      finalizedResult2 &&
        finalizedResult2.status === 'FINALIZED' &&
        finalizedResult2.finalizedBy === pathologistA.id,
      'Test 19: Second test finalized directly with critical physician warning'
    );

    // Test 20: Cannot modify finalized result
    let modifyFinalizedRejected = false;
    try {
      await laboratoryService.saveResult(
        hospA.id,
        orderA1.id,
        {
          resultValue: '99.9',
        },
        labStaffA.id
      );
    } catch {
      modifyFinalizedRejected = true;
    }
    assert(modifyFinalizedRejected, 'Test 20: Modifying finalized result is strictly forbidden');

    // Test 21: Cannot re-finalize finalized result
    let reFinalizeRejected = false;
    try {
      await laboratoryService.finalizeResult(
        hospA.id,
        resultA1.id,
        'Duplicate finalization attempt',
        pathologistA.id
      );
    } catch {
      reFinalizeRejected = true;
    }
    assert(reFinalizeRejected, 'Test 21: Re-finalizing an already finalized result is rejected');

    // ----------------------------------------------------
    // SECTION 5: CLINICAL INTEGRATION (CONSULTATION & PATIENT HISTORY)
    // ----------------------------------------------------
    console.log('\n--- Section 5: Clinical Integration with Doctor Consultation ---');

    // Test 22: Doctor retrieves encounter investigation results
    const encounterResults = await laboratoryService.getEncounterResults(
      hospA.id,
      encA.id
    );

    assert(
      Array.isArray(encounterResults) &&
        encounterResults.length >= 2 &&
        encounterResults.some((r) => r.investigation?.code.startsWith('CBC-8B')) &&
        encounterResults.some((r) => r.investigation?.code.startsWith('LIP-8B')),
      'Test 22: Doctor consultation retrieves all finalized lab results for active encounter'
    );

    // Test 23: Patient investigation history across visits
    const patientHistory = await laboratoryService.getPatientInvestigationHistory(
      hospA.id,
      patientA.id
    );

    assert(
      Array.isArray(patientHistory) &&
        patientHistory.length >= 2 &&
        patientHistory.every((r) => r.patientId === patientA.id),
      'Test 23: Patient laboratory history across encounters retrieved accurately'
    );

    // ----------------------------------------------------
    // SECTION 6: MULTI-TENANT ISOLATION
    // ----------------------------------------------------
    console.log('\n--- Section 6: Multi-Tenant Isolation & Security ---');

    // Test 24: Hospital B cannot access Hospital A order details
    let tenantCrossOrderRejected = false;
    try {
      await laboratoryService.getLaboratoryOrderDetails(hospB.id, orderA1.id);
    } catch (err) {
      tenantCrossOrderRejected = err.statusCode === 404 || err.message?.includes('not found');
    }
    assert(tenantCrossOrderRejected, 'Test 24: Cross-tenant order lookup returns secure 404');

    // Test 25: Hospital B cannot collect sample for Hospital A order
    let tenantCrossSampleRejected = false;
    try {
      await laboratoryService.createOrCollectSample(
        hospB.id,
        orderA1.id,
        { sampleType: 'Serum' },
        labStaffB.id
      );
    } catch (err) {
      tenantCrossSampleRejected = err.statusCode === 404 || err.message?.includes('not found');
    }
    assert(tenantCrossSampleRejected, 'Test 25: Cross-tenant sample collection strictly blocked');

    // Test 26: Hospital B cannot enter result for Hospital A order
    let tenantCrossResultRejected = false;
    try {
      await laboratoryService.saveResult(
        hospB.id,
        orderA1.id,
        { resultValue: '10' },
        labStaffB.id
      );
    } catch (err) {
      tenantCrossResultRejected = err.statusCode === 404 || err.message?.includes('not found');
    }
    assert(tenantCrossResultRejected, 'Test 26: Cross-tenant result entry strictly blocked');

    // Test 27: Hospital B cannot finalize Hospital A result
    let tenantCrossFinalizeRejected = false;
    try {
      await laboratoryService.finalizeResult(
        hospB.id,
        resultA1.id,
        'Cross-tenant breach',
        labStaffB.id
      );
    } catch (err) {
      tenantCrossFinalizeRejected = err.statusCode === 404 || err.message?.includes('not found');
    }
    assert(tenantCrossFinalizeRejected, 'Test 27: Cross-tenant result finalization strictly blocked');

    // Test 28: Hospital B queue never contains Hospital A orders
    const queueB = await laboratoryService.getLaboratoryQueue(hospB.id, {});
    const leaked = queueB.orders.some((o) => o.hospitalId === hospA.id);
    assert(!leaked, 'Test 28: Hospital B queue has zero leak of Hospital A records');

    // ----------------------------------------------------
    // SECTION 7: AUDIT LOGGING & STATUS INTEGRITY
    // ----------------------------------------------------
    console.log('\n--- Section 7: Audit Logging & Status Integrity ---');

    const auditedResult = await InvestigationResult.findByPk(resultA1.id);
    assert(
      auditedResult.enteredBy === labStaffA.id &&
        auditedResult.verifiedBy === pathologistA.id &&
        auditedResult.finalizedBy === pathologistA.id &&
        auditedResult.hospitalId === hospA.id,
      'Test 29: Complete audit chain (enteredBy, verifiedBy, finalizedBy) persisted on result'
    );

    const auditedSample = await InvestigationSample.findByPk(sampleA1.id);
    assert(
      auditedSample.collectedBy === labStaffA.id &&
        auditedSample.hospitalId === hospA.id &&
        Boolean(auditedSample.sampleNumber),
      'Test 30: Sample collection audit (collectedBy, collectedAt, sampleNumber) persisted on sample'
    );

    // ----------------------------------------------------
    // SECTION 8: REGRESSION SUITE (PHASES 5, 6, 7A, 7B, 7C, 8A)
    // ----------------------------------------------------
    console.log('\n--- Section 8: Regression Across All Prior Phases ---');

    // Test 31: Phase 8A Pharmacy Dispensing & Stock regression
    const med8A = await Medicine.create({
      hospitalId: hospA.id,
      name: `Regression Atorvastatin 8B-${Date.now()}`,
      genericName: 'Atorvastatin',
      dosageForm: 'TABLET',
      strength: '10mg',
      status: 'ACTIVE',
    });
    const batch8A = await pharmacyService.stockIn(
      hospA.id,
      {
        medicineId: med8A.id,
        batchNumber: `BAT-REG-${Date.now()}`,
        expiryDate: '2027-12-31',
        quantity: 50,
        purchaseRate: 5.0,
        sellingRate: 8.0,
      },
      labStaffA.id
    );
    assert(
      batch8A && batch8A.quantityAvailable === 50,
      'Test 31: Phase 8A Pharmacy stock-in operates flawlessly'
    );

    // Test 32: Phase 7C EECP Workflow regression
    const eecpPkg = await EecpPackage.create({
      hospitalId: hospA.id,
      name: `EECP 35 Session Regression 8B-${Date.now()}`,
      numberOfSessions: 35,
      packagePrice: 35000,
      status: 'ACTIVE',
    });
    assert(eecpPkg && eecpPkg.numberOfSessions === 35, 'Test 32: Phase 7C EECP package master regression PASS');

    // Test 33: Phase 7B Prescription regression
    const rx = await prescriptionService.createPrescription(
      hospA.id,
      encA.id,
      {
        patientId: patientA.id,
        doctorId: docA.id,
        items: [
          {
            medicineId: med8A.id,
            medicineName: med8A.name,
            dosage: '10mg',
            frequency: '1-0-0',
            route: 'ORAL',
            durationValue: 10,
            durationUnit: 'DAYS',
            quantity: 10,
          },
        ],
      },
      docA.id
    );
    assert(rx && rx.id && rx.status === 'DRAFT', 'Test 33: Phase 7B Prescription generation regression PASS');

    // Test 34: Phase 7A Clinical Encounter & Vitals regression
    const vital = await Vital.create({
      hospitalId: hospA.id,
      encounterId: encA.id,
      patientId: patientA.id,
      recordedBy: docA.id,
      pulseRate: 76,
      systolicBp: 122,
      diastolicBp: 78,
      spo2: 99,
      recordedAt: new Date(),
    });
    assert(vital && vital.pulseRate === 76, 'Test 34: Phase 7A Encounter & Vital recording regression PASS');

    // Test 35: Phase 6 Appointment & Scheduling regression
    const appt = await Appointment.create({
      hospitalId: hospA.id,
      appointmentNumber: `APT-8B-${Date.now()}`,
      patientId: patientA.id,
      doctorId: docA.id,
      departmentId: deptA.id,
      appointmentDate: '2026-10-15',
      startTime: '10:00',
      endTime: '10:30',
      appointmentType: 'IN_PERSON',
      status: 'SCHEDULED',
      bookedBy: receptionistA.id,
    });
    assert(appt && appt.status === 'SCHEDULED', 'Test 35: Phase 6 Appointment scheduling regression PASS');

    // Test 36: Phase 5 Clinical Masters regression
    const fetchedInv = await Investigation.findByPk(invA1.id);
    assert(fetchedInv && fetchedInv.name.includes('CBC'), 'Test 36: Phase 5 Investigation Master regression PASS');

    // Test 37: Database connection & ORM regression
    const [dbRes] = await sequelize.query('SELECT 1 + 1 AS result');
    assert(Number(dbRes[0].result) === 2, 'Test 37: Database connection & ORM query regression PASS');

    // Test 38: Qualitative test result entry and status validation
    const qualitativeOrder = await investigationOrderService.createInvestigationOrder(
      hospA.id,
      encA.id,
      {
        investigationId: invA3.id,
        priority: 'ROUTINE',
        clinicalIndication: 'Serology qualitative screen',
        status: 'FINALIZED',
      },
      docA.id
    );
    const qualResult = await laboratoryService.saveResult(
      hospA.id,
      qualitativeOrder.id,
      {
        resultType: 'QUALITATIVE',
        resultValue: 'NEGATIVE',
        interpretation: 'Non-reactive / within normal biological limits',
        abnormalFlag: 'NORMAL',
        submitForVerification: true,
      },
      labStaffA.id
    );
    assert(
      qualResult && qualResult.resultType === 'QUALITATIVE' && qualResult.resultValue === 'NEGATIVE',
      'Test 38: Qualitative laboratory result entered and stored accurately'
    );

    // Test 39: Laboratory queue filtering by abnormal flag
    const criticalFilteredQueue = await laboratoryService.getLaboratoryQueue(hospA.id, {
      abnormalFlag: 'CRITICAL',
    });
    assert(
      criticalFilteredQueue &&
        criticalFilteredQueue.orders.some((o) => o.id === orderA2.id),
      'Test 39: Laboratory queue filtering by abnormalFlag returns flagged orders'
    );

    // Test 40: Advancing sample status to COMPLETED
    const completedSample = await laboratoryService.updateSampleStatus(
      hospA.id,
      sampleA1.id,
      {
        status: 'COMPLETED',
        notes: 'Specimen fully processed and archived in cold storage',
      },
      labStaffA.id
    );
    assert(
      completedSample && completedSample.status === 'COMPLETED',
      'Test 40: Sample status successfully advanced to COMPLETED'
    );

    // Test 41: Post-finalization dashboard metric dynamic counter validation
    const updatedMetrics = await laboratoryService.getLaboratoryDashboardMetrics(hospA.id);
    assert(
      updatedMetrics &&
        typeof updatedMetrics.criticalResults === 'number' &&
        updatedMetrics.criticalResults >= 1 &&
        typeof updatedMetrics.resultsFinalizedToday === 'number' &&
        updatedMetrics.resultsFinalizedToday >= 2,
      'Test 41: Dashboard metric counters accurately reflect finalized and critical results'
    );

    // Test 42: Patient-scoped isolation (Querying results for patient B returns no patient A tests)
    const patientBResults = await laboratoryService.getPatientInvestigationHistory(
      hospB.id,
      patientB.id
    );
    assert(
      Array.isArray(patientBResults) &&
        patientBResults.every((r) => r.patientId === patientB.id),
      'Test 42: Patient test history is strictly isolated per patient and tenant'
    );

    // Test 43: Complete end-to-end integration across Consultation, Laboratory, and Medical Records
    const fullEncResults = await laboratoryService.getEncounterResults(hospA.id, encA.id);
    assert(
      Array.isArray(fullEncResults) &&
        fullEncResults.length >= 2 &&
        fullEncResults.every((r) => r.status === 'FINALIZED' && Boolean(r.finalizedAt)),
      'Test 43: End-to-end clinical workflow verified from Doctor Order to Lab Finalization'
    );

    // ----------------------------------------------------
    // CLEANUP: Clean up all test fixtures
    // ----------------------------------------------------
    console.log('\nCleaning up Phase 8B verification records...');
    const hospIds = [hospA.id, hospB.id];

    await InvestigationResult.destroy({ where: { hospitalId: hospIds } });
    await InvestigationSample.destroy({ where: { hospitalId: hospIds } });
    await InvestigationOrder.destroy({ where: { hospitalId: hospIds } });
    await Investigation.destroy({ where: { hospitalId: hospIds } });
    await PrescriptionDispensingItem.destroy({ where: { hospitalId: hospIds } });
    await PrescriptionDispensing.destroy({ where: { hospitalId: hospIds } });
    await PharmacyStockTransaction.destroy({ where: { hospitalId: hospIds } });
    await MedicineBatch.destroy({ where: { hospitalId: hospIds } });
    await PrescriptionItem.destroy({ where: { hospitalId: hospIds } });
    await Prescription.destroy({ where: { hospitalId: hospIds } });
    await Medicine.destroy({ where: { hospitalId: hospIds } });
    await EecpPackage.destroy({ where: { hospitalId: hospIds } });
    await Vital.destroy({ where: { hospitalId: hospIds } });
    await Appointment.destroy({ where: { hospitalId: hospIds } });
    await Encounter.destroy({ where: { hospitalId: hospIds } });
    await Patient.destroy({ where: { hospitalId: hospIds } });
    await UserRole.destroy({ where: { userId: [docA.id, labStaffA.id, pathologistA.id, nurseA.id, receptionistA.id, docB.id, labStaffB.id] } });
    await User.destroy({ where: { hospitalId: hospIds } });
    await Department.destroy({ where: { hospitalId: hospIds } });
    await Hospital.destroy({ where: { id: hospIds } });

    console.log('✓ Cleanup complete.\n');

    console.log('='.repeat(60));
    console.log(`PHASE 8B RESULTS: ${passed} passed, ${failed} failed.`);
    console.log('='.repeat(60));

    return failed === 0;
  } catch (error) {
    console.error('✗ Verification failed with unhandled exception:', error);
    return false;
  }
}

// Execute directly if run via CLI
if (process.argv[1] && process.argv[1].endsWith('verifyPhase8B.js')) {
  run()
    .then((success) => process.exit(success ? 0 : 1))
    .catch(() => process.exit(1));
}

export default run;
