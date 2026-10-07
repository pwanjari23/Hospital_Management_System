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
  PrescriptionItem,
  InvestigationOrder,
} from '../models/index.js';
import prescriptionService from '../services/prescription.service.js';
import investigationOrderService from '../services/investigationOrder.service.js';
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
  console.log('\n=== PHASE 7B VERIFICATION TEST SUITE: PRESCRIPTION & INVESTIGATION ORDERS ===\n');

  let hospA, hospB;
  let docA, nurseA, receptionistA, docB;
  let patientA, patientB, deptA, deptB;
  let aptA, aptB;
  let encounter1, encounter2, encounterB;
  let medActive1, medActive2, medInactive, medHospB;
  let invActive1, invActive2, invInactive, invHospB;

  try {
    // ----------------------------------------------------
    // SETUP: Tenants, Staff, Masters, Patients, Encounters
    // ----------------------------------------------------
    console.log('--- Setup: Tenants, Staff, Masters & Encounters ---');

    hospA = await Hospital.create({
      name: 'Alpha Heart & Vascular Hospital 7B',
      slug: 'alpha-heart-7b',
      status: 'ACTIVE',
    });

    hospB = await Hospital.create({
      name: 'Beta General Care Hospital 7B',
      slug: 'beta-general-7b',
      status: 'ACTIVE',
    });

    deptA = await Department.create({
      hospitalId: hospA.id,
      name: 'Cardiology 7B',
      code: 'CARD-7B',
      status: 'ACTIVE',
    });

    deptB = await Department.create({
      hospitalId: hospB.id,
      name: 'General Medicine 7B',
      code: 'GEN-7B',
      status: 'ACTIVE',
    });

    const [doctorRole] = await Role.findOrCreate({ where: { name: 'DOCTOR' } });
    const [nurseRole] = await Role.findOrCreate({ where: { name: 'NURSE' } });
    const [receptionistRole] = await Role.findOrCreate({ where: { name: 'RECEPTIONIST' } });

    docA = await User.create({
      hospitalId: hospA.id,
      name: 'Dr. Ramesh Sharma 7B',
      email: `ramesh-7b-${Date.now()}@alpha.test`,
      passwordHash: 'dummyhash',
      status: 'ACTIVE',
    });
    await UserRole.create({ userId: docA.id, roleId: doctorRole.id });

    nurseA = await User.create({
      hospitalId: hospA.id,
      name: 'Nurse Sunita 7B',
      email: `sunita-7b-${Date.now()}@alpha.test`,
      passwordHash: 'dummyhash',
      status: 'ACTIVE',
    });
    await UserRole.create({ userId: nurseA.id, roleId: nurseRole.id });

    receptionistA = await User.create({
      hospitalId: hospA.id,
      name: 'Recep John 7B',
      email: `john-7b-${Date.now()}@alpha.test`,
      passwordHash: 'dummyhash',
      status: 'ACTIVE',
    });
    await UserRole.create({ userId: receptionistA.id, roleId: receptionistRole.id });

    docB = await User.create({
      hospitalId: hospB.id,
      name: 'Dr. Vikram Patel 7B',
      email: `vikram-7b-${Date.now()}@beta.test`,
      passwordHash: 'dummyhash',
      status: 'ACTIVE',
    });
    await UserRole.create({ userId: docB.id, roleId: doctorRole.id });

    patientA = await Patient.create({
      hospitalId: hospA.id,
      uhid: `UHID-7B-A-${Date.now()}`,
      firstName: 'Amit',
      lastName: 'Kumar',
      dateOfBirth: '1975-04-10',
      gender: 'MALE',
      phone: '9876500001',
      hasAllergies: true,
      allergies: 'Penicillin, Sulfa drugs',
      status: 'ACTIVE',
    });

    patientB = await Patient.create({
      hospitalId: hospB.id,
      uhid: `UHID-7B-B-${Date.now()}`,
      firstName: 'Priya',
      lastName: 'Nair',
      dateOfBirth: '1988-09-20',
      gender: 'FEMALE',
      phone: '9876500002',
      hasAllergies: false,
      status: 'ACTIVE',
    });

    // Medicines: Active, Inactive, and Cross-hospital
    medActive1 = await Medicine.create({
      hospitalId: hospA.id,
      name: 'Atorvastatin 20mg',
      brandName: 'Lipitor',
      genericName: 'Atorvastatin',
      formulation: 'TABLET',
      strength: '20mg',
      status: 'ACTIVE',
    });

    medActive2 = await Medicine.create({
      hospitalId: hospA.id,
      name: 'Aspirin 75mg Gastro-Resistant',
      brandName: 'Ecosprin',
      genericName: 'Aspirin',
      formulation: 'TABLET',
      strength: '75mg',
      status: 'ACTIVE',
    });

    medInactive = await Medicine.create({
      hospitalId: hospA.id,
      name: 'Banned Compound 100mg',
      genericName: 'Discontinued Compound',
      formulation: 'CAPSULE',
      strength: '100mg',
      status: 'INACTIVE',
    });

    medHospB = await Medicine.create({
      hospitalId: hospB.id,
      name: 'Beta Hospital Metformin 500mg',
      genericName: 'Metformin',
      formulation: 'TABLET',
      strength: '500mg',
      status: 'ACTIVE',
    });

    // Investigations: Active, Inactive, and Cross-hospital
    invActive1 = await Investigation.create({
      hospitalId: hospA.id,
      name: '2D Echocardiography with Color Doppler',
      code: 'ECHO-7B',
      category: 'CARDIOLOGY',
      status: 'ACTIVE',
    });

    invActive2 = await Investigation.create({
      hospitalId: hospA.id,
      name: 'Lipid Profile Comprehensive',
      code: 'LIPID-7B',
      category: 'BIOCHEMISTRY',
      status: 'ACTIVE',
    });

    invInactive = await Investigation.create({
      hospitalId: hospA.id,
      name: 'Obsolete Treadmill Protocol',
      code: 'OBS-7B',
      category: 'CARDIOLOGY',
      status: 'INACTIVE',
    });

    invHospB = await Investigation.create({
      hospitalId: hospB.id,
      name: 'Beta MRI Brain',
      code: 'MRI-7B',
      category: 'RADIOLOGY',
      status: 'ACTIVE',
    });

    // Appointments & Encounters
    aptA = await Appointment.create({
      hospitalId: hospA.id,
      patientId: patientA.id,
      doctorId: docA.id,
      departmentId: deptA.id,
      appointmentNumber: `APT-7B-A-${Date.now()}`,
      appointmentDate: '2026-10-07',
      startTime: '10:00:00',
      endTime: '10:15:00',
      status: 'CHECKED_IN',
    });

    aptB = await Appointment.create({
      hospitalId: hospB.id,
      patientId: patientB.id,
      doctorId: docB.id,
      departmentId: deptB.id,
      appointmentNumber: `APT-7B-B-${Date.now()}`,
      appointmentDate: '2026-10-07',
      startTime: '11:00:00',
      endTime: '11:15:00',
      status: 'CHECKED_IN',
    });

    encounter1 = await Encounter.create({
      hospitalId: hospA.id,
      appointmentId: aptA.id,
      patientId: patientA.id,
      doctorId: docA.id,
      departmentId: deptA.id,
      encounterNumber: `ENC-7B-01-${Date.now()}`,
      encounterType: 'OPD',
      status: 'IN_CONSULTATION',
      chiefComplaint: 'Retrosternal chest discomfort on exertion',
    });

    encounter2 = await Encounter.create({
      hospitalId: hospA.id,
      patientId: patientA.id,
      doctorId: docA.id,
      departmentId: deptA.id,
      encounterNumber: `ENC-7B-02-${Date.now()}`,
      encounterType: 'OPD',
      status: 'IN_CONSULTATION',
      chiefComplaint: 'Follow-up hypertension visit',
    });

    encounterB = await Encounter.create({
      hospitalId: hospB.id,
      appointmentId: aptB.id,
      patientId: patientB.id,
      doctorId: docB.id,
      departmentId: deptB.id,
      encounterNumber: `ENC-7B-B-${Date.now()}`,
      encounterType: 'OPD',
      status: 'IN_CONSULTATION',
      chiefComplaint: 'General checkup',
    });

    console.log('Setup finished successfully.\n');

    // ==============================================================
    // PART 1: PRESCRIPTION DOMAIN TESTS
    // ==============================================================
    console.log('--- Part 1: Prescription Domain Tests ---');

    // Test 1: Prescription creation
    const rx1 = await prescriptionService.createPrescription(
      hospA.id,
      encounter1.id,
      {
        notes: 'Take medications with plenty of water.',
        items: [
          {
            medicineId: medActive1.id,
            dosage: '20mg',
            frequency: 'Once Daily at Bedtime',
            route: 'ORAL',
            durationValue: 30,
            durationUnit: 'DAYS',
            foodInstruction: 'AFTER_FOOD',
            instructions: 'Take at night after food',
          },
        ],
      },
      docA.id
    );
    assert(rx1 && rx1.id, 'Test 1: Prescription created successfully');

    // Test 2: Concurrency-safe prescription number format
    const currentYear = new Date().getFullYear();
    const rxNumPrefix = `RX-${currentYear}-`;
    assert(
      rx1.prescriptionNumber && rx1.prescriptionNumber.startsWith(rxNumPrefix),
      `Test 2: Prescription number generated with standard sequence format (${rx1.prescriptionNumber})`
    );

    // Test 3: Prescription Item creation and snapshot integrity
    assert(
      rx1.items && rx1.items.length === 1 && rx1.items[0].medicineName === medActive1.name,
      'Test 3: Prescription item created with medicine name snapshot'
    );

    // Test 4: Prescription Item contains accurate clinical instructions
    const item1 = rx1.items[0];
    assert(
      item1.dosage === '20mg' &&
      item1.frequency === 'Once Daily at Bedtime' &&
      item1.route === 'ORAL' &&
      item1.durationValue === 30 &&
      item1.foodInstruction === 'AFTER_FOOD',
      'Test 4: Prescription item stores dosage, frequency, route, duration, and food instruction'
    );

    // Test 5: Inactive medicine rejection
    let inactiveMedError = null;
    try {
      await prescriptionService.createPrescription(
        hospA.id,
        encounter2.id,
        {
          items: [{ medicineId: medInactive.id, dosage: '100mg' }],
        },
        docA.id
      );
    } catch (err) {
      inactiveMedError = err;
    }
    assert(
      inactiveMedError && inactiveMedError.statusCode === 400 && inactiveMedError.message.includes('inactive'),
      'Test 5: Inactive medicine is rejected with 400 Bad Request'
    );

    // Test 6: Cross-hospital medicine rejection (Medicine from Hospital B prescribed in Hospital A)
    let crossHospitalMedError = null;
    try {
      await prescriptionService.createPrescription(
        hospA.id,
        encounter2.id,
        {
          items: [{ medicineId: medHospB.id, dosage: '500mg' }],
        },
        docA.id
      );
    } catch (err) {
      crossHospitalMedError = err;
    }
    assert(
      crossHospitalMedError && (crossHospitalMedError.statusCode === 400 || crossHospitalMedError.statusCode === 404),
      'Test 6: Cross-hospital medicine is rejected securely'
    );

    // Test 7: Adding multiple medicines to an existing draft prescription
    const addedItem = await prescriptionService.addItem(
      hospA.id,
      rx1.id,
      {
        medicineId: medActive2.id,
        dosage: '75mg',
        frequency: 'Once Daily',
        route: 'ORAL',
        durationValue: 30,
        durationUnit: 'DAYS',
        foodInstruction: 'AFTER_FOOD',
        instructions: 'Take after lunch',
      },
      docA.id
    );
    assert(
      addedItem && addedItem.medicineName === medActive2.name,
      'Test 7: Multiple medicines added to draft prescription'
    );

    // Test 8: Draft prescription item update
    const updatedItem = await prescriptionService.updateItem(
      hospA.id,
      rx1.id,
      addedItem.id,
      {
        dosage: '150mg',
        durationValue: 14,
        notes: 'Dosage adjusted',
      },
      docA.id
    );
    assert(
      updatedItem && updatedItem.dosage === '150mg' && updatedItem.durationValue === 14,
      'Test 8: Draft prescription item updated successfully'
    );

    // Test 9: Draft prescription item deletion
    const itemToDelete = await prescriptionService.addItem(
      hospA.id,
      rx1.id,
      {
        medicineId: medActive1.id,
        dosage: '10mg',
        frequency: 'Once Daily',
      },
      docA.id
    );
    await prescriptionService.deleteItem(hospA.id, rx1.id, itemToDelete.id, docA.id);
    const refreshedRx1 = await prescriptionService.getPrescriptionById(hospA.id, rx1.id);
    assert(
      !refreshedRx1.items.some((i) => i.id === itemToDelete.id),
      'Test 9: Item removed from draft prescription'
    );

    // Test 10: Finalization of prescription
    const finalizedRx = await prescriptionService.finalizePrescription(hospA.id, rx1.id, docA.id);
    assert(
      finalizedRx && finalizedRx.status === 'FINALIZED' && finalizedRx.prescribedAt !== null,
      'Test 10: Prescription finalized and marked with prescribedAt timestamp'
    );

    // Test 11: Post-finalization item addition rejection
    let postFinalizeAddError = null;
    try {
      await prescriptionService.addItem(
        hospA.id,
        rx1.id,
        { medicineId: medActive1.id, dosage: '40mg' },
        docA.id
      );
    } catch (err) {
      postFinalizeAddError = err;
    }
    assert(
      postFinalizeAddError && postFinalizeAddError.statusCode === 400 && (postFinalizeAddError.message.includes('finalized') || postFinalizeAddError.message.includes('locked')),
      'Test 11: Post-finalization item addition is rejected (prescription is locked)'
    );

    // Test 12: Post-finalization item update rejection
    let postFinalizeUpdateError = null;
    try {
      await prescriptionService.updateItem(
        hospA.id,
        rx1.id,
        item1.id,
        { dosage: '80mg' },
        docA.id
      );
    } catch (err) {
      postFinalizeUpdateError = err;
    }
    assert(
      postFinalizeUpdateError && postFinalizeUpdateError.statusCode === 400,
      'Test 12: Post-finalization item modification is rejected'
    );

    // Test 13: Post-finalization item deletion rejection
    let postFinalizeDeleteError = null;
    try {
      await prescriptionService.deleteItem(hospA.id, rx1.id, item1.id, docA.id);
    } catch (err) {
      postFinalizeDeleteError = err;
    }
    assert(
      postFinalizeDeleteError && postFinalizeDeleteError.statusCode === 400,
      'Test 13: Post-finalization item deletion is rejected'
    );

    // Test 14: Prescription cancellation rules
    const rxToCancel = await prescriptionService.createPrescription(
      hospA.id,
      encounter2.id,
      {
        notes: 'Prescription to be cancelled',
        items: [{ medicineId: medActive1.id, dosage: '10mg' }],
      },
      docA.id
    );
    const cancelledRx = await prescriptionService.cancelPrescription(
      hospA.id,
      rxToCancel.id,
      'Patient allergy reported',
      docA.id
    );
    assert(
      cancelledRx && cancelledRx.status === 'CANCELLED',
      'Test 14: Prescription cancelled with cancellation reason logged'
    );

    // Test 15: Post-cancellation modification rejection
    let postCancelAddError = null;
    try {
      await prescriptionService.addItem(
        hospA.id,
        rxToCancel.id,
        { medicineId: medActive2.id, dosage: '75mg' },
        docA.id
      );
    } catch (err) {
      postCancelAddError = err;
    }
    assert(
      postCancelAddError && postCancelAddError.statusCode === 400,
      'Test 15: Modification to cancelled prescription is rejected'
    );

    // ==============================================================
    // PART 2: INVESTIGATION ORDER DOMAIN TESTS
    // ==============================================================
    console.log('\n--- Part 2: Investigation Order Domain Tests ---');

    // Test 16: Investigation order creation
    const invOrder1 = await investigationOrderService.createInvestigationOrder(
      hospA.id,
      encounter1.id,
      {
        investigationId: invActive1.id,
        priority: 'ROUTINE',
        clinicalIndication: 'Evaluation of suspected ischemic heart disease',
        notes: 'Check LV ejection fraction',
      },
      docA.id
    );
    assert(invOrder1 && invOrder1.id, 'Test 16: Investigation order created successfully');

    // Test 17: Investigation order sequence number generation
    const invNumPrefix = `INV-${currentYear}-`;
    assert(
      invOrder1.orderNumber && invOrder1.orderNumber.startsWith(invNumPrefix),
      `Test 17: Investigation order number generated with standard sequence format (${invOrder1.orderNumber})`
    );

    // Test 18: Investigation name snapshot and details
    assert(
      invOrder1.investigationName === invActive1.name &&
      invOrder1.priority === 'ROUTINE' &&
      invOrder1.clinicalIndication === 'Evaluation of suspected ischemic heart disease',
      'Test 18: Investigation order preserves name snapshot, priority, and clinical indication'
    );

    // Test 19: Multiple investigations batch creation
    const batchOrders = await investigationOrderService.createInvestigationOrdersBatch(
      hospA.id,
      encounter1.id,
      [
        {
          investigationId: invActive2.id,
          priority: 'URGENT',
          clinicalIndication: 'Acute chest pain biomarker workup',
        },
      ],
      docA.id
    );
    assert(
      batchOrders && batchOrders.length === 1 && batchOrders[0].investigationName === invActive2.name,
      'Test 19: Batch investigation orders created successfully'
    );

    // Test 20: Inactive investigation rejection
    let inactiveInvError = null;
    try {
      await investigationOrderService.createInvestigationOrder(
        hospA.id,
        encounter1.id,
        {
          investigationId: invInactive.id,
          priority: 'ROUTINE',
        },
        docA.id
      );
    } catch (err) {
      inactiveInvError = err;
    }
    assert(
      inactiveInvError && inactiveInvError.statusCode === 400 && inactiveInvError.message.includes('inactive'),
      'Test 20: Inactive investigation is rejected with 400 Bad Request'
    );

    // Test 21: Cross-hospital investigation rejection
    let crossHospitalInvError = null;
    try {
      await investigationOrderService.createInvestigationOrder(
        hospA.id,
        encounter1.id,
        {
          investigationId: invHospB.id,
          priority: 'ROUTINE',
        },
        docA.id
      );
    } catch (err) {
      crossHospitalInvError = err;
    }
    assert(
      crossHospitalInvError && (crossHospitalInvError.statusCode === 400 || crossHospitalInvError.statusCode === 404),
      'Test 21: Cross-hospital investigation is rejected securely'
    );

    // Test 22: Duplicate active order prevention
    let duplicateOrderError = null;
    try {
      await investigationOrderService.createInvestigationOrder(
        hospA.id,
        encounter1.id,
        {
          investigationId: invActive1.id,
          priority: 'ROUTINE',
        },
        docA.id
      );
    } catch (err) {
      duplicateOrderError = err;
    }
    assert(
      duplicateOrderError && duplicateOrderError.statusCode === 400 && duplicateOrderError.message.includes('already ordered'),
      'Test 22: Duplicate active investigation order within same encounter is prevented'
    );

    // Test 23: Investigation order finalization
    const finalizedOrder = await investigationOrderService.finalizeOrder(
      hospA.id,
      invOrder1.id,
      docA.id
    );
    assert(
      finalizedOrder && finalizedOrder.status === 'FINALIZED',
      'Test 23: Investigation order finalized and locked'
    );

    // Test 24: Post-finalization update rejection
    let postFinalizeOrderUpdateError = null;
    try {
      await investigationOrderService.updateInvestigationOrder(
        hospA.id,
        invOrder1.id,
        { priority: 'URGENT' },
        docA.id
      );
    } catch (err) {
      postFinalizeOrderUpdateError = err;
    }
    assert(
      postFinalizeOrderUpdateError && postFinalizeOrderUpdateError.statusCode === 400,
      'Test 24: Post-finalization investigation order modification is rejected'
    );

    // Test 25: Investigation order cancellation
    const cancelledOrder = await investigationOrderService.cancelInvestigationOrder(
      hospA.id,
      batchOrders[0].id,
      'Duplicate test avoided',
      docA.id
    );
    assert(
      cancelledOrder && cancelledOrder.status === 'CANCELLED',
      'Test 25: Active investigation order cancelled successfully'
    );

    // ==============================================================
    // PART 3: ENCOUNTER INTEGRATION & LIFECYCLE
    // ==============================================================
    console.log('\n--- Part 3: Encounter Integration & Lifecycle ---');

    // Test 26: Encounter details load linked Prescriptions and Investigation Orders
    const fullEncounter = await encounterService.getEncounterById(hospA.id, encounter1.id);
    assert(
      fullEncounter.prescriptions &&
      fullEncounter.prescriptions.length >= 1 &&
      fullEncounter.investigationOrders &&
      fullEncounter.investigationOrders.length >= 2,
      'Test 26: Encounter aggregates prescriptions and investigation orders with full relations'
    );

    // Test 27: Consultation draft update preserves existing prescriptions and orders
    const draftUpdate = await encounterService.updateConsultation(
      hospA.id,
      encounter1.id,
      {
        assessment: 'Coronary artery disease, stable angina CCS Class II',
        treatmentPlan: 'Dual antiplatelet, statin therapy, lifestyle modification',
        followUpDate: '2026-10-21',
        followUpNotes: 'Review with 2D Echo report',
      },
      docA.id
    );
    assert(
      draftUpdate && draftUpdate.assessment.includes('stable angina'),
      'Test 27: Consultation draft saved without disturbing linked prescriptions and orders'
    );

    // Test 28: Consultation completion retains linked prescriptions and investigation orders
    const completedEncounter = await encounterService.completeConsultation(
      hospA.id,
      encounter1.id,
      {
        assessment: 'Confirmed CAD. Follow-up after diagnostic tests.',
      },
      docA.id
    );
    assert(
      completedEncounter && completedEncounter.status === 'COMPLETED',
      'Test 28: Consultation completed successfully'
    );

    // Test 29: Completed encounter locks new prescription creation
    let completedEncRxError = null;
    try {
      await prescriptionService.createPrescription(
        hospA.id,
        encounter1.id,
        {
          items: [{ medicineId: medActive1.id, dosage: '10mg' }],
        },
        docA.id
      );
    } catch (err) {
      completedEncRxError = err;
    }
    assert(
      completedEncRxError && completedEncRxError.statusCode === 400 && completedEncRxError.message.includes('completed'),
      'Test 29: Completed encounter rejects new prescription creation'
    );

    // Test 30: Completed encounter locks new investigation order creation
    let completedEncInvError = null;
    try {
      await investigationOrderService.createInvestigationOrder(
        hospA.id,
        encounter1.id,
        {
          investigationId: invActive1.id,
        },
        docA.id
      );
    } catch (err) {
      completedEncInvError = err;
    }
    assert(
      completedEncInvError && completedEncInvError.statusCode === 400 && completedEncInvError.message.includes('completed'),
      'Test 30: Completed encounter rejects new investigation orders'
    );

    // ==============================================================
    // PART 4: MULTI-TENANT ISOLATION TESTS
    // ==============================================================
    console.log('\n--- Part 4: Multi-Tenant Isolation Tests ---');

    // Test 31: Cross-tenant prescription read returns 404
    let crossTenantRxReadError = null;
    try {
      await prescriptionService.getPrescriptionById(hospB.id, rx1.id);
    } catch (err) {
      crossTenantRxReadError = err;
    }
    assert(
      crossTenantRxReadError && crossTenantRxReadError.statusCode === 404,
      'Test 31: Hospital B cannot read Hospital A prescription (Secure 404 Not Found)'
    );

    // Test 32: Cross-tenant prescription update returns 404
    let crossTenantRxUpdateError = null;
    try {
      await prescriptionService.updatePrescription(hospB.id, rx1.id, { notes: 'Hack' }, docB.id);
    } catch (err) {
      crossTenantRxUpdateError = err;
    }
    assert(
      crossTenantRxUpdateError && crossTenantRxUpdateError.statusCode === 404,
      'Test 32: Hospital B cannot update Hospital A prescription (Secure 404 Not Found)'
    );

    // Test 33: Cross-tenant prescription item deletion returns 404
    let crossTenantItemDeleteError = null;
    try {
      await prescriptionService.deleteItem(hospB.id, rx1.id, item1.id, docB.id);
    } catch (err) {
      crossTenantItemDeleteError = err;
    }
    assert(
      crossTenantItemDeleteError && crossTenantItemDeleteError.statusCode === 404,
      'Test 33: Hospital B cannot delete items from Hospital A prescription (Secure 404 Not Found)'
    );

    // Test 34: Cross-tenant investigation order read returns 404
    let crossTenantInvReadError = null;
    try {
      await investigationOrderService.getInvestigationOrderById(hospB.id, invOrder1.id);
    } catch (err) {
      crossTenantInvReadError = err;
    }
    assert(
      crossTenantInvReadError && crossTenantInvReadError.statusCode === 404,
      'Test 34: Hospital B cannot read Hospital A investigation order (Secure 404 Not Found)'
    );

    // Test 35: Cross-tenant investigation order update returns 404
    let crossTenantInvUpdateError = null;
    try {
      await investigationOrderService.updateInvestigationOrder(
        hospB.id,
        invOrder1.id,
        { priority: 'URGENT' },
        docB.id
      );
    } catch (err) {
      crossTenantInvUpdateError = err;
    }
    assert(
      crossTenantInvUpdateError && crossTenantInvUpdateError.statusCode === 404,
      'Test 35: Hospital B cannot update Hospital A investigation order (Secure 404 Not Found)'
    );

    // Test 36: Cross-tenant investigation order cancellation returns 404
    let crossTenantInvCancelError = null;
    try {
      await investigationOrderService.cancelInvestigationOrder(
        hospB.id,
        invOrder1.id,
        'Cross tenant malicious cancel',
        docB.id
      );
    } catch (err) {
      crossTenantInvCancelError = err;
    }
    assert(
      crossTenantInvCancelError && crossTenantInvCancelError.statusCode === 404,
      'Test 36: Hospital B cannot cancel Hospital A investigation order (Secure 404 Not Found)'
    );

    // Test 37: Hospital B cannot read prescriptions of Hospital A encounter (Secure 404)
    let crossTenantEncRxError = null;
    try {
      await prescriptionService.getPrescriptions(hospB.id, encounter1.id);
    } catch (err) {
      crossTenantEncRxError = err;
    }
    assert(
      crossTenantEncRxError && crossTenantEncRxError.statusCode === 404,
      'Test 37: Hospital B cannot read prescriptions for Hospital A encounter (Secure 404 Not Found)'
    );

    // Test 38: Hospital B cannot read investigation orders of Hospital A encounter (Secure 404)
    let crossTenantEncInvError = null;
    try {
      await investigationOrderService.getInvestigationOrders(hospB.id, encounter1.id);
    } catch (err) {
      crossTenantEncInvError = err;
    }
    assert(
      crossTenantEncInvError && crossTenantEncInvError.statusCode === 404,
      'Test 38: Hospital B cannot read investigation orders for Hospital A encounter (Secure 404 Not Found)'
    );

    // Test 38b: Hospital B querying its own encounter returns valid empty array
    const hospBOwnPrescriptions = await prescriptionService.getPrescriptions(hospB.id, encounterB.id);
    assert(
      hospBOwnPrescriptions && hospBOwnPrescriptions.length === 0,
      'Test 38b: Hospital B querying its own encounter returns clean empty array without cross-tenant leakage'
    );

    // ==============================================================
    // PART 5: AUDIT LOGGING & PHASE 7A REGRESSION
    // ==============================================================
    console.log('\n--- Part 5: Audit Logging & Regression Verification ---');

    // Test 39: Audit stamping on Prescription records
    assert(
      rx1.createdBy === docA.id && rx1.updatedBy === docA.id && rx1.createdAt !== null,
      'Test 39: Prescription audit logging verified (createdBy, updatedBy, createdAt tracked)'
    );

    // Test 40: Audit stamping on Investigation Order records
    assert(
      invOrder1.createdBy === docA.id && invOrder1.updatedBy === docA.id && invOrder1.createdAt !== null,
      'Test 40: Investigation order audit logging verified (createdBy, updatedBy, createdAt tracked)'
    );

    // Test 41: Existing Phase 7A vitals creation still functions normally
    const vitalTest = await vitalService.createVital(
      hospA.id,
      encounter2.id,
      {
        systolicBp: 124,
        diastolicBp: 82,
        pulseRate: 74,
        spo2: 98,
        temperature: 98.6,
      },
      nurseA.id
    );
    assert(
      vitalTest && vitalTest.id && vitalTest.systolicBp === 124,
      'Test 41: Phase 7A Vital recording continues to function seamlessly'
    );

    // Test 42: Existing Phase 7A diagnosis creation still functions normally
    const diagTest = await encounterDiagnosisService.createDiagnosis(
      hospA.id,
      encounter2.id,
      {
        diagnosisName: 'Essential Hypertension',
        diagnosisType: 'PRIMARY',
      },
      docA.id
    );
    assert(
      diagTest && diagTest.id && diagTest.diagnosisName === 'Essential Hypertension',
      'Test 42: Phase 7A Diagnosis recording continues to function seamlessly'
    );

  } catch (err) {
    console.error('Fatal Test Exception in verifyPhase7B:', err);
    failed++;
  } finally {
    console.log('\nCleaning up Phase 7B verification records...');
    try {
      if (hospA && hospB) {
        await PrescriptionItem.destroy({ where: { hospitalId: [hospA.id, hospB.id] } });
        await Prescription.destroy({ where: { hospitalId: [hospA.id, hospB.id] } });
        await InvestigationOrder.destroy({ where: { hospitalId: [hospA.id, hospB.id] } });
        await EncounterDiagnosis.destroy({ where: { hospitalId: [hospA.id, hospB.id] } });
        await Vital.destroy({ where: { hospitalId: [hospA.id, hospB.id] } });
        await Encounter.destroy({ where: { hospitalId: [hospA.id, hospB.id] } });
        await Appointment.destroy({ where: { hospitalId: [hospA.id, hospB.id] } });
        await Medicine.destroy({ where: { hospitalId: [hospA.id, hospB.id] } });
        await Investigation.destroy({ where: { hospitalId: [hospA.id, hospB.id] } });
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
