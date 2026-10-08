import {
  Hospital,
  User,
  Role,
  UserRole,
  Department,
  Patient,
  Appointment,
  Encounter,
  Investigation,
  InvestigationOrder,
  Medicine,
  Prescription,
  PrescriptionItem,
  MedicineBatch,
  PrescriptionDispensing,
  PrescriptionDispensingItem,
  PaymentMode,
  sequelize,
} from '../models/index.js';
import billingService from '../services/billing.service.js';

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
  console.log('\n=== PHASE 8C VERIFICATION TEST SUITE: BILLING, PAYMENTS & RECEIPTS ===\n');

  let hospA, hospB;
  let adminA, recepA, docA, nurseA, adminB;
  let patientA1, patientA2;
  let deptA;
  let modeCashA, modeUpiA;
  let apptA1, apptA2;
  let encA1;
  let invA1, invOrderA1;
  let medA1, batchA1, rxA1, rxItemA1, dispA1;

  try {
    // ----------------------------------------------------
    // SETUP: Tenants, Staff, Roles, Patients & Masters
    // ----------------------------------------------------
    console.log('--- Setup: Tenants, Staff, Roles, Patients & Masters ---');

    hospA = await Hospital.create({
      name: 'Alpha Apex Hospital 8C',
      slug: `alpha-apex-8c-${Date.now()}`,
      status: 'ACTIVE',
    });

    hospB = await Hospital.create({
      name: 'Beta Beacon Hospital 8C',
      slug: `beta-beacon-8c-${Date.now()}`,
      status: 'ACTIVE',
    });

    deptA = await Department.create({
      hospitalId: hospA.id,
      name: 'Cardiology 8C',
      code: 'CARD-8C',
      status: 'ACTIVE',
    });

    await Department.create({
      hospitalId: hospB.id,
      name: 'General 8C',
      code: 'GEN-8C',
      status: 'ACTIVE',
    });

    const [adminRole] = await Role.findOrCreate({ where: { name: 'HOSPITAL_ADMIN' }, defaults: { scope: 'HOSPITAL' } });
    const [recepRole] = await Role.findOrCreate({ where: { name: 'RECEPTIONIST' }, defaults: { scope: 'HOSPITAL' } });
    const [docRole] = await Role.findOrCreate({ where: { name: 'DOCTOR' }, defaults: { scope: 'HOSPITAL' } });
    const [nurseRole] = await Role.findOrCreate({ where: { name: 'NURSE' }, defaults: { scope: 'HOSPITAL' } });

    adminA = await User.create({
      hospitalId: hospA.id,
      email: `adminA-8c-${Date.now()}@alpha.test`,
      passwordHash: 'dummyhash',
      name: 'Admin Alice 8C',
      status: 'ACTIVE',
    });
    await UserRole.create({ userId: adminA.id, roleId: adminRole.id });

    recepA = await User.create({
      hospitalId: hospA.id,
      email: `recepA-8c-${Date.now()}@alpha.test`,
      passwordHash: 'dummyhash',
      name: 'Receptionist Rachel 8C',
      status: 'ACTIVE',
    });
    await UserRole.create({ userId: recepA.id, roleId: recepRole.id });

    docA = await User.create({
      hospitalId: hospA.id,
      email: `docA-8c-${Date.now()}@alpha.test`,
      passwordHash: 'dummyhash',
      name: 'Dr. Dan 8C',
      status: 'ACTIVE',
    });
    await UserRole.create({ userId: docA.id, roleId: docRole.id });

    nurseA = await User.create({
      hospitalId: hospA.id,
      email: `nurseA-8c-${Date.now()}@alpha.test`,
      passwordHash: 'dummyhash',
      name: 'Nurse Nancy 8C',
      status: 'ACTIVE',
    });
    await UserRole.create({ userId: nurseA.id, roleId: nurseRole.id });

    adminB = await User.create({
      hospitalId: hospB.id,
      email: `adminB-8c-${Date.now()}@beta.test`,
      passwordHash: 'dummyhash',
      name: 'Admin Bob 8C',
      status: 'ACTIVE',
    });
    await UserRole.create({ userId: adminB.id, roleId: adminRole.id });

    // Patients
    patientA1 = await Patient.create({
      hospitalId: hospA.id,
      uhid: `UHID-8C-A1-${Date.now()}`,
      firstName: 'Aarav',
      lastName: 'Patel',
      gender: 'MALE',
      dateOfBirth: '1985-06-15',
      phone: '9876543210',
    });

    patientA2 = await Patient.create({
      hospitalId: hospA.id,
      uhid: `UHID-8C-A2-${Date.now()}`,
      firstName: 'Priya',
      lastName: 'Sharma',
      gender: 'FEMALE',
      dateOfBirth: '1992-04-10',
      phone: '9876543211',
    });

    await Patient.create({
      hospitalId: hospB.id,
      uhid: `UHID-8C-B1-${Date.now()}`,
      firstName: 'Rohan',
      lastName: 'Verma',
      gender: 'MALE',
      dateOfBirth: '1990-01-01',
      phone: '9876543212',
    });

    // Payment Modes for Hospital A
    modeCashA = await PaymentMode.create({
      hospitalId: hospA.id,
      name: 'Cash 8C',
      code: 'CASH',
      status: 'ACTIVE',
    });
    modeUpiA = await PaymentMode.create({
      hospitalId: hospA.id,
      name: 'UPI / QR 8C',
      code: 'UPI',
      status: 'ACTIVE',
    });
    await PaymentMode.create({
      hospitalId: hospA.id,
      name: 'Credit/Debit Card 8C',
      code: 'CARD',
      status: 'ACTIVE',
    });

    // Clinical Records for Source Integration
    apptA1 = await Appointment.create({
      hospitalId: hospA.id,
      patientId: patientA1.id,
      doctorId: docA.id,
      departmentId: deptA.id,
      appointmentDate: '2026-10-10',
      appointmentNumber: `APT-8C-1-${Date.now()}`,
      startTime: '10:00',
      endTime: '10:15',
      appointmentType: 'IN_PERSON',
      status: 'COMPLETED',
    });

    apptA2 = await Appointment.create({
      hospitalId: hospA.id,
      patientId: patientA2.id,
      doctorId: docA.id,
      departmentId: deptA.id,
      appointmentDate: '2026-10-10',
      appointmentNumber: `APT-8C-2-${Date.now()}`,
      startTime: '10:30',
      endTime: '10:45',
      appointmentType: 'IN_PERSON',
      status: 'COMPLETED',
    });

    encA1 = await Encounter.create({
      hospitalId: hospA.id,
      patientId: patientA1.id,
      doctorId: docA.id,
      encounterNumber: `ENC-8C-1-${Date.now()}`,
      encounterType: 'OPD',
      status: 'COMPLETED',
      startedAt: new Date(),
    });

    invA1 = await Investigation.create({
      hospitalId: hospA.id,
      name: 'Lipid Profile 8C',
      code: `LIPID-8C-${Date.now()}`,
      category: 'BIOCHEMISTRY',
      defaultCharge: 800.0,
      status: 'ACTIVE',
    });

    invOrderA1 = await InvestigationOrder.create({
      hospitalId: hospA.id,
      patientId: patientA1.id,
      doctorId: docA.id,
      encounterId: encA1.id,
      investigationId: invA1.id,
      investigationName: invA1.name,
      orderNumber: `ORD-8C-1-${Date.now()}`,
      status: 'FINALIZED',
      orderedAt: new Date(),
    });

    medA1 = await Medicine.create({
      hospitalId: hospA.id,
      name: 'Atorvastatin 20mg 8C',
      brandName: 'Atorva 8C',
      category: 'TABLET',
      dosageForm: 'Tablet',
      strength: '20mg',
      status: 'ACTIVE',
    });

    batchA1 = await MedicineBatch.create({
      hospitalId: hospA.id,
      medicineId: medA1.id,
      batchNumber: `BATCH-8C-1-${Date.now()}`,
      expiryDate: '2027-12-31',
      costPrice: 5.0,
      mrp: 15.0,
      currentQuantity: 100,
      status: 'ACTIVE',
    });

    rxA1 = await Prescription.create({
      hospitalId: hospA.id,
      encounterId: encA1.id,
      patientId: patientA1.id,
      doctorId: docA.id,
      prescriptionNumber: `RX-8C-1-${Date.now()}`,
      status: 'FINALIZED',
    });

    rxItemA1 = await PrescriptionItem.create({
      hospitalId: hospA.id,
      prescriptionId: rxA1.id,
      medicineId: medA1.id,
      medicineName: medA1.name,
      dosage: '1 tab',
      frequency: 'OD',
      durationDays: 10,
      quantityPrescribed: 10,
    });

    dispA1 = await PrescriptionDispensing.create({
      hospitalId: hospA.id,
      prescriptionId: rxA1.id,
      patientId: patientA1.id,
      dispensedBy: recepA.id,
      dispensingNumber: `DISP-8C-1-${Date.now()}`,
      status: 'FULLY_DISPENSED',
      totalAmount: 150.0,
    });

    await PrescriptionDispensingItem.create({
      hospitalId: hospA.id,
      dispensingId: dispA1.id,
      prescriptionItemId: rxItemA1.id,
      medicineId: medA1.id,
      batchId: batchA1.id,
      prescribedQuantity: 10,
      dispensedQuantity: 10,
    });

    console.log('✓ Setup complete.\n');

    // ==============================================================
    // SECTION 1: BILLABLE SERVICE / CHARGE CATALOG
    // ==============================================================
    console.log('--- Section 1: Billable Service Master ---');

    // Test 1: Create a billable service
    const srv1 = await billingService.createBillingService(
      hospA.id,
      {
        serviceCode: 'OPD-CONS',
        serviceName: 'Cardiology Consultation',
        category: 'CONSULTATION',
        departmentId: deptA.id,
        defaultPrice: 1000.0,
        taxPercentage: 0.0,
      },
      adminA.id
    );
    assert(
      srv1 && srv1.serviceCode === 'OPD-CONS' && Number(srv1.defaultPrice) === 1000.0,
      'Test 1: Billable service created with code OPD-CONS and price ₹1000'
    );

    // Test 2: Duplicate service code within same hospital rejected
    let dupErrThrown = false;
    try {
      await billingService.createBillingService(
        hospA.id,
        {
          serviceCode: 'OPD-CONS',
          serviceName: 'Duplicate Consult',
          defaultPrice: 1200.0,
        },
        adminA.id
      );
    } catch (err) {
      dupErrThrown = err.statusCode === 409;
    }
    assert(dupErrThrown, 'Test 2: Duplicate serviceCode OPD-CONS in Hospital A rejected with 409');

    // Test 3: Same service code in Hospital B succeeds (Tenant Scoped)
    const srvB = await billingService.createBillingService(
      hospB.id,
      {
        serviceCode: 'OPD-CONS',
        serviceName: 'General Consultation Beta',
        defaultPrice: 500.0,
      },
      adminB.id
    );
    assert(
      srvB && srvB.hospitalId === hospB.id && Number(srvB.defaultPrice) === 500.0,
      'Test 3: Same service code OPD-CONS allowed in Hospital B (tenant isolation)'
    );

    // Test 4: Update billable service price and name
    const updatedSrv1 = await billingService.updateBillingService(
      hospA.id,
      srv1.id,
      { defaultPrice: 1100.0, description: 'Updated cardiologist consult' },
      adminA.id
    );
    assert(
      Number(updatedSrv1.defaultPrice) === 1100.0 && updatedSrv1.description === 'Updated cardiologist consult',
      'Test 4: Billable service updated price to ₹1100 and description'
    );

    // Test 5: Query billing services with search & filter
    const srvECG = await billingService.createBillingService(
      hospA.id,
      {
        serviceCode: 'ECG-TEST',
        serviceName: 'Standard 12-Lead ECG',
        category: 'INVESTIGATION',
        defaultPrice: 500.0,
        taxPercentage: 5.0,
      },
      adminA.id
    );
    const searchRes = await billingService.getBillingServices(hospA.id, { search: 'ECG' });
    assert(
      searchRes.services.length === 1 && searchRes.services[0].id === srvECG.id,
      'Test 5: Filter billing services by search term returns matched active service'
    );

    // ==============================================================
    // SECTION 2: INVOICE CREATION & AUTHORITATIVE TOTALS
    // ==============================================================
    console.log('\n--- Section 2: Invoice Creation & Authoritative Totals ---');

    // Test 6: Create draft invoice with line items
    const invData1 = {
      patientId: patientA1.id,
      encounterId: encA1.id,
      appointmentId: apptA1.id,
      items: [
        {
          billingServiceId: srv1.id,
          description: 'Cardiology Consultation',
          quantity: 1,
          unitPrice: 1100.0,
          discountAmount: 100.0,
          taxPercentage: 0.0,
          sourceType: 'APPOINTMENT',
          sourceId: apptA1.id,
        },
        {
          billingServiceId: srvECG.id,
          description: 'Standard 12-Lead ECG',
          quantity: 2,
          unitPrice: 500.0,
          discountAmount: 0.0,
          taxPercentage: 5.0, // 5% of 1000 = 50
          sourceType: 'OTHER',
        },
      ],
      discountAmount: 50.0, // Additional invoice level discount
      status: 'DRAFT',
    };

    const inv1 = await billingService.createInvoice(hospA.id, invData1, recepA.id);
    assert(
      inv1 && Boolean(inv1.id) && inv1.status === 'DRAFT',
      'Test 6: Invoice created in DRAFT status with 2 line items'
    );

    // Test 7: Invoice sequence generation (INV-YYYY-XXXXXX)
    const currentYear = new Date().getFullYear();
    assert(
      inv1.invoiceNumber.startsWith(`INV-${currentYear}-`),
      `Test 7: Invoice number generated via HospitalSequence (${inv1.invoiceNumber})`
    );

    // Test 8: Authoritative Server-Side Calculation:
    // Item 1: 1 * 1100 - 100 discount = 1000, tax 0 = 1000
    // Item 2: 2 * 500 - 0 = 1000, 5% tax = 50, total = 1050
    // Subtotal: 1100 + 1000 = 2100
    // Total discount: 100 (item) + 50 (invoice) = 150
    // Tax: 50
    // Authoritative Total: 2100 - 150 + 50 = 2000
    assert(
      Number(inv1.subtotal) === 2100.0 &&
      Number(inv1.discountAmount) === 150.0 &&
      Number(inv1.taxAmount) === 50.0 &&
      Number(inv1.totalAmount) === 2000.0,
      'Test 8: Server authoritatively computed subtotal ₹2100, discount ₹150, tax ₹50, total ₹2000'
    );

    // Test 9: Initial paid is 0 and due is authoritative total
    assert(
      Number(inv1.paidAmount) === 0.0 &&
      Number(inv1.dueAmount) === 2000.0 &&
      inv1.paymentStatus === 'UNPAID',
      'Test 9: Initial invoice has paidAmount=0, dueAmount=₹2000, paymentStatus=UNPAID'
    );

    // Test 10: Historical unit price preserved in invoice items
    const inv1Item1 = inv1.items.find((i) => i.billingServiceId === srv1.id);
    assert(
      inv1Item1 && Number(inv1Item1.unitPrice) === 1100.0 && Number(inv1Item1.lineTotal) === 1000.0,
      'Test 10: InvoiceItem stores frozen charged price ₹1100 and lineTotal ₹1000'
    );

    // Test 11: Master price change later does NOT alter existing invoice
    await billingService.updateBillingService(hospA.id, srv1.id, { defaultPrice: 2000.0 }, adminA.id);
    const reloadedInv1 = await billingService.getInvoiceById(hospA.id, inv1.id);
    const reloadedItem = reloadedInv1.items.find((i) => i.billingServiceId === srv1.id);
    assert(
      Number(reloadedInv1.totalAmount) === 2000.0 && Number(reloadedItem.unitPrice) === 1100.0,
      'Test 11: Updating master service price to ₹2000 did not alter historical invoice or items'
    );

    // Test 12: Empty items rejected
    let emptyItemsErr = false;
    try {
      await billingService.createInvoice(hospA.id, { patientId: patientA1.id, items: [] }, recepA.id);
    } catch (err) {
      emptyItemsErr = err.statusCode === 400;
    }
    assert(emptyItemsErr, 'Test 12: Creating invoice with 0 items rejected with 400');

    // Test 13: Non-existent patient rejected
    let invalidPatErr = false;
    try {
      await billingService.createInvoice(
        hospA.id,
        {
          patientId: '00000000-0000-0000-0000-000000000000',
          items: [{ description: 'Test', quantity: 1, unitPrice: 100 }],
        },
        recepA.id
      );
    } catch (err) {
      invalidPatErr = err.statusCode === 404;
    }
    assert(invalidPatErr, 'Test 13: Creating invoice with non-existent patient rejected with 404');

    // ==============================================================
    // SECTION 3: INVOICE IMMUTABILITY & CANCELLATION
    // ==============================================================
    console.log('\n--- Section 3: Invoice Immutability & Cancellation ---');

    // Test 14: Draft invoice can be updated
    const updatedDraft = await billingService.updateInvoice(
      hospA.id,
      inv1.id,
      {
        items: [
          {
            billingServiceId: srv1.id,
            description: 'Cardiology Consultation Updated',
            quantity: 1,
            unitPrice: 1000.0,
            discountAmount: 0.0,
            taxPercentage: 0.0,
            sourceType: 'APPOINTMENT',
            sourceId: apptA1.id,
          },
        ],
        notes: 'Updated draft note',
      },
      recepA.id
    );
    assert(
      updatedDraft && Number(updatedDraft.totalAmount) === 1000.0 && updatedDraft.items.length === 1,
      'Test 14: Draft invoice items successfully updated to 1 item (Total: ₹1000)'
    );

    // Test 15: Issue draft invoice
    const issuedInv = await billingService.issueInvoice(hospA.id, inv1.id, recepA.id);
    assert(issuedInv.status === 'ISSUED', 'Test 15: Draft invoice transitioned to ISSUED status');

    // Test 16: Issued invoice is financially immutable (updating items rejected)
    let immutabilityErr = false;
    try {
      await billingService.updateInvoice(
        hospA.id,
        inv1.id,
        {
          items: [{ description: 'Sneaky modification', quantity: 1, unitPrice: 50 }],
        },
        recepA.id
      );
    } catch (err) {
      immutabilityErr = err.statusCode === 400;
    }
    assert(immutabilityErr, 'Test 16: Modifying items on ISSUED invoice rejected (financial immutability)');

    // Test 17: Cancel invoice without payments
    const invToCancel = await billingService.createInvoice(
      hospA.id,
      {
        patientId: patientA2.id,
        items: [{ description: 'Disposable Pack', quantity: 1, unitPrice: 200.0 }],
        status: 'ISSUED',
      },
      recepA.id
    );
    const cancelledInv = await billingService.cancelInvoice(
      hospA.id,
      invToCancel.id,
      { cancellationReason: 'Patient discharged before procedure' },
      adminA.id
    );
    assert(
      cancelledInv.status === 'CANCELLED' &&
      cancelledInv.cancellationReason === 'Patient discharged before procedure' &&
      cancelledInv.cancelledBy === adminA.id,
      'Test 17: Invoice cancelled with mandatory reason, cancelledBy, and cancelledAt recorded'
    );

    // ==============================================================
    // SECTION 4: PAYMENT COLLECTION, CONCURRENCY & RECEIPTS
    // ==============================================================
    console.log('\n--- Section 4: Payment Collection, Concurrency & Receipts ---');

    // Test 18: Negative payment amount rejected
    let negPaymentErr = false;
    try {
      await billingService.collectPayment(
        hospA.id,
        inv1.id,
        { amount: -500, paymentModeId: modeCashA.id },
        recepA.id
      );
    } catch (err) {
      negPaymentErr = err.statusCode === 400;
    }
    assert(negPaymentErr, 'Test 18: Negative payment amount rejected with 400');

    // Test 19: Zero payment amount rejected
    let zeroPaymentErr = false;
    try {
      await billingService.collectPayment(
        hospA.id,
        inv1.id,
        { amount: 0, paymentModeId: modeCashA.id },
        recepA.id
      );
    } catch (err) {
      zeroPaymentErr = err.statusCode === 400;
    }
    assert(zeroPaymentErr, 'Test 19: Zero payment amount rejected with 400');

    // Test 20: Overpayment rejected (Total is ₹1000, attempt ₹1500)
    let overpaymentErr = false;
    try {
      await billingService.collectPayment(
        hospA.id,
        inv1.id,
        { amount: 1500, paymentModeId: modeCashA.id },
        recepA.id
      );
    } catch (err) {
      overpaymentErr = err.statusCode === 400;
    }
    assert(overpaymentErr, 'Test 20: Overpayment of ₹1500 on ₹1000 invoice rejected with 400');

    // Test 21: Partial payment of ₹400
    const payResult1 = await billingService.collectPayment(
      hospA.id,
      inv1.id,
      {
        amount: 400.0,
        paymentModeId: modeCashA.id,
        transactionReference: 'CASH-001',
        notes: 'Initial deposit',
      },
      recepA.id
    );
    assert(
      payResult1 &&
      payResult1.payment.status === 'SUCCESS' &&
      Number(payResult1.payment.amount) === 400.0 &&
      payResult1.invoice.paymentStatus === 'PARTIALLY_PAID' &&
      Number(payResult1.invoice.paidAmount) === 400.0 &&
      Number(payResult1.invoice.dueAmount) === 600.0,
      'Test 21: Partial payment of ₹400 collected; status=PARTIALLY_PAID, due=₹600'
    );

    // Test 22: Payment number sequence (PAY-YYYY-XXXXXX)
    assert(
      payResult1.payment.paymentNumber.startsWith(`PAY-${currentYear}-`),
      `Test 22: Payment number generated via HospitalSequence (${payResult1.payment.paymentNumber})`
    );

    // Test 23: Receipt automatically generated (REC-YYYY-XXXXXX)
    assert(
      payResult1.receipt &&
      payResult1.receipt.receiptNumber.startsWith(`REC-${currentYear}-`) &&
      Number(payResult1.receipt.amount) === 400.0,
      `Test 23: Receipt generated automatically with number ${payResult1.receipt.receiptNumber}`
    );

    // Test 24: Overpayment on partial balance rejected (Attempt ₹700 when due is ₹600)
    let partialOverpayErr = false;
    try {
      await billingService.collectPayment(
        hospA.id,
        inv1.id,
        { amount: 700.0, paymentModeId: modeUpiA.id },
        recepA.id
      );
    } catch (err) {
      partialOverpayErr = err.statusCode === 400;
    }
    assert(partialOverpayErr, 'Test 24: Overpayment of ₹700 on ₹600 remaining balance rejected with 400');

    // Test 25: Second payment completes invoice (₹600)
    const payResult2 = await billingService.collectPayment(
      hospA.id,
      inv1.id,
      {
        amount: 600.0,
        paymentModeId: modeUpiA.id,
        transactionReference: 'UPI-REF-9988',
      },
      recepA.id
    );
    assert(
      payResult2.invoice.paymentStatus === 'PAID' &&
      Number(payResult2.invoice.paidAmount) === 1000.0 &&
      Number(payResult2.invoice.dueAmount) === 0.0,
      'Test 25: Second payment of ₹600 sets status=PAID, paid=₹1000, due=₹0'
    );

    // Test 26: Attempting to pay on already fully PAID invoice rejected
    let paidInvoicePayErr = false;
    try {
      await billingService.collectPayment(
        hospA.id,
        inv1.id,
        { amount: 100.0, paymentModeId: modeCashA.id },
        recepA.id
      );
    } catch (err) {
      paidInvoicePayErr = err.statusCode === 400;
    }
    assert(paidInvoicePayErr, 'Test 26: Payment on fully settled invoice rejected with 400');

    // Test 27: Attempting to pay on CANCELLED invoice rejected
    let cancelPayErr = false;
    try {
      await billingService.collectPayment(
        hospA.id,
        invToCancel.id,
        { amount: 100.0, paymentModeId: modeCashA.id },
        recepA.id
      );
    } catch (err) {
      cancelPayErr = err.statusCode === 400;
    }
    assert(cancelPayErr, 'Test 27: Payment on CANCELLED invoice rejected with 400');

    // Test 28: Attempting to cancel an invoice with recorded payments is blocked
    let cancelWithPaymentsErr = false;
    try {
      await billingService.cancelInvoice(
        hospA.id,
        inv1.id,
        { cancellationReason: 'Trying to cancel settled invoice' },
        adminA.id
      );
    } catch (err) {
      cancelWithPaymentsErr = err.statusCode === 400;
    }
    assert(cancelWithPaymentsErr, 'Test 28: Cancelling invoice with recorded payments blocked (financial integrity)');

    // ==============================================================
    // SECTION 5: CONCURRENCY & ROW LOCKING SAFETY
    // ==============================================================
    console.log('\n--- Section 5: Concurrency & Row Locking Protection ---');

    // Create a new invoice of ₹1000 to test simultaneous payment race condition
    const invRace = await billingService.createInvoice(
      hospA.id,
      {
        patientId: patientA2.id,
        items: [{ description: 'Cardio Checkup', quantity: 1, unitPrice: 1000.0 }],
        status: 'ISSUED',
      },
      recepA.id
    );

    // Test 29: Two parallel payment requests of ₹1000 each triggered simultaneously
    // Database row-lock (t.LOCK.UPDATE) must ensure exactly ONE succeeds and second is rejected due to 0 due balance
    const results = await Promise.allSettled([
      billingService.collectPayment(
        hospA.id,
        invRace.id,
        { amount: 1000.0, paymentModeId: modeCashA.id, transactionReference: 'RACE-1' },
        recepA.id
      ),
      billingService.collectPayment(
        hospA.id,
        invRace.id,
        { amount: 1000.0, paymentModeId: modeUpiA.id, transactionReference: 'RACE-2' },
        recepA.id
      ),
    ]);

    const successes = results.filter((r) => r.status === 'fulfilled');
    const failures = results.filter((r) => r.status === 'rejected');

    assert(
      successes.length === 1 && failures.length === 1,
      'Test 29: Exactly one of two simultaneous ₹1000 payments succeeded; second rejected'
    );

    // Test 30: Check post-race invoice state: paidAmount is exactly ₹1000, not ₹2000 (no overpayment)
    const reloadedRaceInv = await billingService.getInvoiceById(hospA.id, invRace.id);
    assert(
      Number(reloadedRaceInv.paidAmount) === 1000.0 &&
      Number(reloadedRaceInv.dueAmount) === 0.0 &&
      reloadedRaceInv.paymentStatus === 'PAID' &&
      reloadedRaceInv.payments.length === 1,
      'Test 30: Row locking protected invoice from overpayment race condition (paid=₹1000, payments=1)'
    );

    // ==============================================================
    // SECTION 6: DUPLICATE BILLING PROTECTION
    // ==============================================================
    console.log('\n--- Section 6: Duplicate Billing Protection across Clinical Sources ---');

    // Test 31: Appointment already billed on inv1 (source_type: APPOINTMENT, source_id: apptA1.id)
    let dupApptErr = false;
    try {
      await billingService.createInvoice(
        hospA.id,
        {
          patientId: patientA1.id,
          items: [
            {
              description: 'Duplicate Consultation Charge',
              quantity: 1,
              unitPrice: 1000.0,
              sourceType: 'APPOINTMENT',
              sourceId: apptA1.id,
            },
          ],
        },
        recepA.id
      );
    } catch (err) {
      dupApptErr = err.statusCode === 409;
    }
    assert(dupApptErr, 'Test 31: Duplicate billing for same APPOINTMENT rejected with 409');

    // Test 32: Investigation Order billing
    const invOrderBill = await billingService.createInvoice(
      hospA.id,
      {
        patientId: patientA1.id,
        items: [
          {
            description: 'Lipid Profile 8C Charge',
            quantity: 1,
            unitPrice: 800.0,
            sourceType: 'INVESTIGATION',
            sourceId: invOrderA1.id,
          },
        ],
      },
      recepA.id
    );
    assert(
      invOrderBill && invOrderBill.items[0].sourceType === 'INVESTIGATION',
      'Test 32: Billed completed Investigation Order on invoice'
    );

    // Test 33: Duplicate Investigation Order billing rejected
    let dupInvErr = false;
    try {
      await billingService.createInvoice(
        hospA.id,
        {
          patientId: patientA1.id,
          items: [
            {
              description: 'Second Lipid Profile Charge',
              quantity: 1,
              unitPrice: 800.0,
              sourceType: 'INVESTIGATION',
              sourceId: invOrderA1.id,
            },
          ],
        },
        recepA.id
      );
    } catch (err) {
      dupInvErr = err.statusCode === 409;
    }
    assert(dupInvErr, 'Test 33: Duplicate billing for same INVESTIGATION order rejected with 409');

    // Test 34: Pharmacy Dispensing billing
    const dispBill = await billingService.createInvoice(
      hospA.id,
      {
        patientId: patientA1.id,
        items: [
          {
            description: 'Pharmacy Dispensing DISP-8C-1',
            quantity: 1,
            unitPrice: 150.0,
            sourceType: 'PHARMACY',
            sourceId: dispA1.id,
          },
        ],
      },
      recepA.id
    );
    assert(
      dispBill && dispBill.items[0].sourceType === 'PHARMACY',
      'Test 34: Billed Pharmacy Dispensing record on invoice'
    );

    // Test 35: Duplicate Pharmacy Dispensing billing rejected
    let dupDispErr = false;
    try {
      await billingService.createInvoice(
        hospA.id,
        {
          patientId: patientA1.id,
          items: [
            {
              description: 'Second Dispensing Charge',
              quantity: 1,
              unitPrice: 150.0,
              sourceType: 'PHARMACY',
              sourceId: dispA1.id,
            },
          ],
        },
        recepA.id
      );
    } catch (err) {
      dupDispErr = err.statusCode === 409;
    }
    assert(dupDispErr, 'Test 35: Duplicate billing for same PHARMACY dispensing rejected with 409');

    // Test 36: No modification to clinical records
    const checkAppt = await Appointment.findByPk(apptA1.id);
    const checkOrder = await InvestigationOrder.findByPk(invOrderA1.id);
    const checkDisp = await PrescriptionDispensing.findByPk(dispA1.id);
    assert(
      checkAppt.status === 'COMPLETED' &&
      checkOrder.status === 'FINALIZED' &&
      checkDisp.status === 'FULLY_DISPENSED',
      'Test 36: Clinical records (Appointment, Lab Order, Pharmacy Dispensing) remain completely untouched'
    );

    // ==============================================================
    // SECTION 7: REFUNDS & FINANCIAL TRACEABILITY
    // ==============================================================
    console.log('\n--- Section 7: Refunds & Financial Traceability ---');

    // We have payResult1 (Payment 1 on inv1 for ₹400)
    // Test 37: Negative refund rejected
    let negRefundErr = false;
    try {
      await billingService.refundPayment(
        hospA.id,
        payResult1.payment.id,
        { amount: -100, reason: 'Invalid' },
        adminA.id
      );
    } catch (err) {
      negRefundErr = err.statusCode === 400;
    }
    assert(negRefundErr, 'Test 37: Negative refund amount rejected with 400');

    // Test 38: Refund exceeding payment amount rejected (Attempt ₹500 on ₹400 payment)
    let overRefundErr = false;
    try {
      await billingService.refundPayment(
        hospA.id,
        payResult1.payment.id,
        { amount: 500, reason: 'Too much' },
        adminA.id
      );
    } catch (err) {
      overRefundErr = err.statusCode === 400;
    }
    assert(overRefundErr, 'Test 38: Refund of ₹500 exceeding payment amount ₹400 rejected with 400');

    // Test 39: Partial refund of ₹100 on ₹400 payment
    const partialRefund = await billingService.refundPayment(
      hospA.id,
      payResult1.payment.id,
      { amount: 100.0, reason: 'Overcharged item adjustment' },
      adminA.id
    );
    assert(
      partialRefund.payment.status === 'PARTIALLY_REFUNDED' &&
      Number(partialRefund.payment.refundedAmount) === 100.0 &&
      Number(partialRefund.invoice.paidAmount) === 900.0 &&
      Number(partialRefund.invoice.dueAmount) === 100.0 &&
      partialRefund.invoice.paymentStatus === 'PARTIALLY_PAID',
      'Test 39: Partial refund of ₹100 recorded; payment=PARTIALLY_REFUNDED, invoice due=₹100'
    );

    // Test 40: Full remaining refund on payment 1 (remaining ₹300)
    const fullRefund = await billingService.refundPayment(
      hospA.id,
      payResult1.payment.id,
      { amount: 300.0, reason: 'Patient returned item' },
      adminA.id
    );
    assert(
      fullRefund.payment.status === 'REFUNDED' &&
      Number(fullRefund.payment.refundedAmount) === 400.0 &&
      Number(fullRefund.invoice.paidAmount) === 600.0 &&
      Number(fullRefund.invoice.dueAmount) === 400.0,
      'Test 40: Full refund on payment 1 sets payment status=REFUNDED'
    );

    // Test 41: Original payment record is preserved and not deleted
    const reloadedPayment1 = await billingService.getPaymentById(hospA.id, payResult1.payment.id);
    assert(
      reloadedPayment1 && Boolean(reloadedPayment1.id),
      'Test 41: Original payment record preserved in database (never deleted for financial traceability)'
    );

    // ==============================================================
    // SECTION 8: PATIENT FINANCIAL HISTORY & UNBILLED ITEMS
    // ==============================================================
    console.log('\n--- Section 8: Patient Financial History & Unbilled Items ---');

    // Test 42: Get patient financial history
    const historyA1 = await billingService.getPatientFinancialHistory(hospA.id, patientA1.id);
    assert(
      historyA1 &&
      historyA1.invoices.length >= 3 &&
      historyA1.summary.totalBilled > 0 &&
      historyA1.summary.totalPaid > 0 &&
      historyA1.receipts.length >= 2,
      `Test 42: Patient A1 financial history retrieved: ${historyA1.invoices.length} invoices, ${historyA1.receipts.length} receipts, totalBilled ₹${historyA1.summary.totalBilled}`
    );

    // Test 43: Unbilled items helper returns unbilled appointments for patient A2
    const unbilledA2 = await billingService.getUnbilledItemsForPatient(hospA.id, patientA2.id);
    assert(
      unbilledA2.appointments.some((a) => a.id === apptA2.id),
      'Test 43: Unbilled items helper identifies completed unbilled appointment apptA2'
    );

    // Test 44: Already billed appointment apptA1 is NOT in unbilled items
    const unbilledA1 = await billingService.getUnbilledItemsForPatient(hospA.id, patientA1.id);
    assert(
      !unbilledA1.appointments.some((a) => a.id === apptA1.id),
      'Test 44: Already billed appointment apptA1 correctly omitted from unbilled items'
    );

    // Test 45: Cancelled invoice is excluded from total outstanding
    const invA1Cancelled = await billingService.createInvoice(
      hospA.id,
      {
        patientId: patientA2.id,
        items: [{ description: 'Test service', quantity: 1, unitPrice: 5000.0 }],
        status: 'DRAFT',
      },
      recepA.id
    );
    await billingService.cancelInvoice(
      hospA.id,
      invA1Cancelled.id,
      { cancellationReason: 'Mistake draft' },
      adminA.id
    );
    const historyA2 = await billingService.getPatientFinancialHistory(hospA.id, patientA2.id);
    assert(
      historyA2.invoices.some((i) => i.id === invA1Cancelled.id && i.status === 'CANCELLED') &&
      historyA2.summary.totalOutstanding < 5000.0,
      'Test 45: Cancelled invoice is excluded from patient totalOutstanding calculation'
    );

    // ==============================================================
    // SECTION 9: BILLING DASHBOARD METRICS
    // ==============================================================
    console.log('\n--- Section 9: Billing Dashboard Metrics ---');

    // Test 46: Get billing dashboard metrics
    const metrics = await billingService.getBillingDashboardMetrics(hospA.id);
    assert(
      metrics &&
      typeof metrics.todayRevenue === 'number' &&
      metrics.todayRevenue >= 0 &&
      metrics.todayInvoicesCount >= 1 &&
      metrics.todayPaymentsCount >= 1 &&
      typeof metrics.totalOutstanding === 'number',
      `Test 46: Dashboard metrics retrieved: Today's Revenue=₹${metrics.todayRevenue}, Invoices=${metrics.todayInvoicesCount}, Outstanding=₹${metrics.totalOutstanding}`
    );

    // Test 47: Payment mode breakdown contains modes with counts and sums
    assert(
      Array.isArray(metrics.paymentModeBreakdown) && metrics.paymentModeBreakdown.length > 0,
      'Test 47: Payment mode breakdown contains active hospital payment modes'
    );

    // Test 48: Recent invoices and recent payments populated
    assert(
      metrics.recentInvoices.length > 0 && metrics.recentPayments.length > 0,
      'Test 48: Dashboard includes recent invoices and recent payments lists'
    );

    // ==============================================================
    // SECTION 10: TENANT ISOLATION
    // ==============================================================
    console.log('\n--- Section 10: Strict Multi-Tenant Isolation ---');

    // Test 49: Hospital B user cannot access Hospital A invoice
    let crossTenantInvErr = false;
    try {
      await billingService.getInvoiceById(hospB.id, inv1.id);
    } catch (err) {
      crossTenantInvErr = err.statusCode === 404;
    }
    assert(crossTenantInvErr, 'Test 49: Cross-tenant invoice access denied with 404');

    // Test 50: Hospital B user cannot collect payment on Hospital A invoice
    let crossTenantPayErr = false;
    try {
      await billingService.collectPayment(
        hospB.id,
        inv1.id,
        { amount: 100.0, paymentModeId: modeCashA.id },
        adminB.id
      );
    } catch (err) {
      crossTenantPayErr = err.statusCode === 404;
    }
    assert(crossTenantPayErr, 'Test 50: Cross-tenant payment collection on Hospital A invoice blocked with 404');

    // Test 51: Hospital B user cannot access Hospital A receipt
    let crossTenantReceiptErr = false;
    try {
      await billingService.getReceiptById(hospB.id, payResult1.receipt.id);
    } catch (err) {
      crossTenantReceiptErr = err.statusCode === 404;
    }
    assert(crossTenantReceiptErr, 'Test 51: Cross-tenant receipt access denied with 404');

    // Test 52: Hospital B user cannot access Hospital A patient financial history
    let crossTenantHistoryErr = false;
    try {
      await billingService.getPatientFinancialHistory(hospB.id, patientA1.id);
    } catch (err) {
      crossTenantHistoryErr = err.statusCode === 404;
    }
    assert(crossTenantHistoryErr, 'Test 52: Cross-tenant patient financial history access blocked with 404');

    // Test 53: Hospital B billing service catalog isolated from Hospital A
    const listB = await billingService.getBillingServices(hospB.id);
    assert(
      !listB.services.some((s) => s.id === srv1.id),
      'Test 53: Hospital B billing catalog does not contain Hospital A services'
    );

    // Test 54: Invoices list for Hospital B only contains Hospital B invoices
    const invoicesB = await billingService.getInvoices(hospB.id);
    assert(
      !invoicesB.invoices.some((i) => i.hospitalId === hospA.id),
      'Test 54: Invoices query strictly tenant-scoped (Hospital B sees 0 Hospital A records)'
    );

    // ==============================================================
    // SUMMARY
    // ==============================================================
    console.log('\n==================================================');
    console.log(`PHASE 8C TESTS COMPLETED: ${passed} passed, ${failed} failed`);
    console.log('==================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('\nUNHANDLED EXCEPTION DURING PHASE 8C VERIFICATION:\n', err);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

run();
