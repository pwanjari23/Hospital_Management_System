import {
  Hospital,
  User,
  Department,
  Patient,
  Appointment,
  Encounter,
  IpdAdmission,
  Ward,
  Bed,
  Medicine,
  MedicineBatch,
  Prescription,
  PrescriptionDispensing,
  PharmacyStockTransaction,
  Investigation,
  InvestigationOrder,
  InvestigationResult,
  EecpPackage,
  EecpTreatmentCourse,
  EecpSession,
  Invoice,
  Payment,
  PaymentMode,
  sequelize,
} from '../models/index.js';
import reportService from '../services/report.service.js';

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
  console.log('\n=== PHASE 10 VERIFICATION TEST SUITE: REPORTS & ANALYTICS ===\n');

  let hospA, hospB;
  let docA, adminA;
  let deptA, deptB;
  let patA1, patA2, patB1;
  let wardA, bedA1, bedA2;
  let medA, batchA;
  let invA;
  let pkgA;
  let pModeCash, pModeUpi;

  try {
    // ----------------------------------------------------
    // SETUP: Tenants, Staff, Roles, Patients & Test Baseline
    // ----------------------------------------------------
    console.log('--- Setup: Test Tenants, Masters & Core Data ---');

    hospA = await Hospital.create({
      name: 'Alpha Apex Hospital Phase 10',
      slug: `alpha-p10-${Date.now()}`,
      status: 'ACTIVE',
    });

    hospB = await Hospital.create({
      name: 'Beta Horizon Hospital Phase 10',
      slug: `beta-p10-${Date.now()}`,
      status: 'ACTIVE',
    });

    deptA = await Department.create({
      hospitalId: hospA.id,
      name: 'Cardiology 10',
      code: `CARD10-${Date.now()}`.slice(0, 10),
      status: 'ACTIVE',
    });

    deptB = await Department.create({
      hospitalId: hospB.id,
      name: 'Orthopedics 10',
      code: `ORTH10-${Date.now()}`.slice(0, 10),
      status: 'ACTIVE',
    });

    docA = await User.create({
      hospitalId: hospA.id,
      name: 'Dr. Arjun Mehta 10',
      email: `arjun10-${Date.now()}@alpha.test`,
      passwordHash: 'hash',
      status: 'ACTIVE',
      departmentId: deptA.id,
      specialization: 'Cardiologist',
    });

    await User.create({
      hospitalId: hospB.id,
      name: 'Dr. Bharat Rao 10',
      email: `bharat10-${Date.now()}@beta.test`,
      passwordHash: 'hash',
      status: 'ACTIVE',
      departmentId: deptB.id,
      specialization: 'Orthopedic Surgeon',
    });

    adminA = await User.create({
      hospitalId: hospA.id,
      name: 'Admin Alpha 10',
      email: `admin10-${Date.now()}@alpha.test`,
      passwordHash: 'hash',
      status: 'ACTIVE',
    });

    // Patients
    patA1 = await Patient.create({
      hospitalId: hospA.id,
      firstName: 'Ramesh',
      lastName: 'Patel',
      uhid: `UHID-10-A1-${Date.now()}`,
      gender: 'MALE',
      dateOfBirth: '1980-05-15',
      phone: '9876543201',
      city: 'Mumbai',
    });

    patA2 = await Patient.create({
      hospitalId: hospA.id,
      firstName: 'Sita',
      lastName: 'Sharma',
      uhid: `UHID-10-A2-${Date.now()}`,
      gender: 'FEMALE',
      dateOfBirth: '1990-08-20',
      phone: '9876543202',
      city: 'Pune',
    });

    patB1 = await Patient.create({
      hospitalId: hospB.id,
      firstName: 'Bob',
      lastName: 'Beta',
      uhid: `UHID-10-B1-${Date.now()}`,
      gender: 'MALE',
      dateOfBirth: '1975-01-10',
      phone: '9876543203',
      city: 'Delhi',
    });

    // Wards & Beds
    wardA = await Ward.create({
      hospitalId: hospA.id,
      wardName: 'Cardiac Care Ward 10',
      wardCode: `CCW10-${Date.now()}`.slice(0, 10),
      wardType: 'CCU',
      floor: '2',
      isActive: true,
    });

    bedA1 = await Bed.create({
      hospitalId: hospA.id,
      wardId: wardA.id,
      bedNumber: '10-CCU-01',
      bedType: 'CCU',
      status: 'OCCUPIED',
      isActive: true,
    });

    bedA2 = await Bed.create({
      hospitalId: hospA.id,
      wardId: wardA.id,
      bedNumber: '10-CCU-02',
      bedType: 'CCU',
      status: 'AVAILABLE',
      isActive: true,
    });

    // Medicines & Batches
    medA = await Medicine.create({
      hospitalId: hospA.id,
      name: `Atorvastatin 20mg 10 ${Date.now()}`,
      category: 'CARDIOLOGY',
      dosageForm: 'TABLET',
      strength: '20mg',
      unit: 'mg',
      status: 'ACTIVE',
    });

    batchA = await MedicineBatch.create({
      hospitalId: hospA.id,
      medicineId: medA.id,
      batchNumber: `BATCH-10-A-${Date.now()}`.slice(0, 20),
      expiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days (expiring soon)
      quantityReceived: 50,
      quantityAvailable: 5,
      reorderLevel: 20, // Low stock
      purchaseRate: 10,
      sellingRate: 15,
      status: 'ACTIVE',
    });

    // Investigation & Order
    invA = await Investigation.create({
      hospitalId: hospA.id,
      name: `Lipid Profile 10 ${Date.now()}`,
      code: `LIP10-${Date.now()}`.slice(0, 10),
      category: 'BIOCHEMISTRY',
      defaultCharge: 800,
      status: 'ACTIVE',
    });

    // EECP Package
    pkgA = await EecpPackage.create({
      hospitalId: hospA.id,
      name: `Standard EECP 35 Sessions 10 ${Date.now()}`,
      numberOfSessions: 35,
      packagePrice: 35000,
      status: 'ACTIVE',
    });

    // Payment Modes
    pModeCash = await PaymentMode.create({
      hospitalId: hospA.id,
      name: 'Cash 10',
      code: `CASH10-${Date.now()}`.slice(0, 10),
      isActive: true,
    });

    pModeUpi = await PaymentMode.create({
      hospitalId: hospA.id,
      name: 'UPI 10',
      code: `UPI10-${Date.now()}`.slice(0, 10),
      isActive: true,
    });

    const todayStr = new Date().toISOString().split('T')[0];

    // Create Operational Records for Hospital A
    // 1. Appointments: 1 completed, 1 cancelled, 1 scheduled
    await Appointment.create({
      hospitalId: hospA.id,
      appointmentNumber: `APT-10-1-${Date.now()}`.slice(0, 50),
      patientId: patA1.id,
      doctorId: docA.id,
      departmentId: deptA.id,
      appointmentDate: todayStr,
      startTime: '09:00',
      endTime: '09:30',
      appointmentType: 'NEW_CONSULTATION',
      status: 'COMPLETED',
    });

    await Appointment.create({
      hospitalId: hospA.id,
      appointmentNumber: `APT-10-2-${Date.now()}`.slice(0, 50),
      patientId: patA2.id,
      doctorId: docA.id,
      departmentId: deptA.id,
      appointmentDate: todayStr,
      startTime: '10:00',
      endTime: '10:30',
      appointmentType: 'FOLLOW_UP',
      status: 'CANCELLED',
    });

    await Appointment.create({
      hospitalId: hospA.id,
      appointmentNumber: `APT-10-3-${Date.now()}`.slice(0, 50),
      patientId: patA1.id,
      doctorId: docA.id,
      departmentId: deptA.id,
      appointmentDate: todayStr,
      startTime: '11:00',
      endTime: '11:30',
      appointmentType: 'NEW_CONSULTATION',
      status: 'SCHEDULED',
    });

    // 2. Encounters: 1 completed OPD
    const enc1 = await Encounter.create({
      hospitalId: hospA.id,
      encounterNumber: `ENC-10-1-${Date.now()}`.slice(0, 50),
      patientId: patA1.id,
      doctorId: docA.id,
      departmentId: deptA.id,
      encounterType: 'OPD',
      status: 'COMPLETED',
    });

    // 3. IPD Admissions: 1 active, 1 discharged (stay = 3 days)
    await IpdAdmission.create({
      hospitalId: hospA.id,
      admissionNumber: `IPD-10-1-${Date.now()}`.slice(0, 50),
      patientId: patA1.id,
      admittingDoctorId: docA.id,
      wardId: wardA.id,
      bedId: bedA1.id,
      departmentId: deptA.id,
      admissionType: 'EMERGENCY',
      admissionDate: new Date(),
      status: 'ADMITTED',
      reasonForAdmission: 'Acute chest pain',
    });

    await IpdAdmission.create({
      hospitalId: hospA.id,
      admissionNumber: `IPD-10-2-${Date.now()}`.slice(0, 50),
      patientId: patA2.id,
      admittingDoctorId: docA.id,
      wardId: wardA.id,
      bedId: bedA2.id,
      departmentId: deptA.id,
      admissionType: 'PLANNED',
      admissionDate: '2026-10-01T12:00:00Z',
      dischargedAt: '2026-10-04T12:00:00Z',
      status: 'DISCHARGED',
      reasonForAdmission: 'Scheduled angioplasty',
    });

    // 4. Pharmacy: Dispensing + Stock Transaction
    const rx1 = await Prescription.create({
      hospitalId: hospA.id,
      patientId: patA1.id,
      doctorId: docA.id,
      encounterId: enc1.id,
      prescriptionNumber: `RX-10-1-${Date.now()}`.slice(0, 50),
      status: 'FINALIZED',
    });

    await PrescriptionDispensing.create({
      hospitalId: hospA.id,
      prescriptionId: rx1.id,
      patientId: patA1.id,
      dispensedBy: adminA.id,
      dispensingNumber: `DISP-10-1-${Date.now()}`.slice(0, 50),
      dispensingDate: todayStr,
      status: 'FULLY_DISPENSED',
    });

    await PharmacyStockTransaction.create({
      hospitalId: hospA.id,
      medicineId: medA.id,
      batchId: batchA.id,
      transactionType: 'STOCK_IN',
      quantity: 50,
      balanceAfter: 50,
    });

    await PharmacyStockTransaction.create({
      hospitalId: hospA.id,
      medicineId: medA.id,
      batchId: batchA.id,
      transactionType: 'DISPENSE',
      quantity: 10,
      balanceAfter: 40,
    });

    // 5. Laboratory: 1 order with abnormal result
    const labOrder1 = await InvestigationOrder.create({
      hospitalId: hospA.id,
      orderNumber: `ORD-10-1-${Date.now()}`.slice(0, 50),
      patientId: patA1.id,
      doctorId: docA.id,
      encounterId: enc1.id,
      investigationId: invA.id,
      investigationName: invA.name,
      priority: 'URGENT',
      status: 'FINALIZED',
      orderedAt: new Date(),
    });

    await InvestigationResult.create({
      hospitalId: hospA.id,
      investigationOrderId: labOrder1.id,
      investigationId: invA.id,
      encounterId: enc1.id,
      doctorId: docA.id,
      investigationNameSnapshot: invA.name,
      patientId: patA1.id,
      resultNumber: `RES-10-1-${Date.now()}`.slice(0, 50),
      status: 'FINALIZED',
      resultValue: '280',
      resultUnit: 'mg/dL',
      abnormalFlag: 'CRITICAL',
    });

    // 6. EECP: 1 Active Course + 2 Sessions
    const course1 = await EecpTreatmentCourse.create({
      hospitalId: hospA.id,
      courseNumber: `EECP-10-1-${Date.now()}`.slice(0, 50),
      patientId: patA1.id,
      doctorId: docA.id,
      packageId: pkgA.id,
      plannedSessions: 35,
      completedSessions: 10,
      status: 'ACTIVE',
      startDate: todayStr,
    });

    await EecpSession.create({
      hospitalId: hospA.id,
      courseId: course1.id,
      patientId: patA1.id,
      sessionNumber: 1,
      scheduledDate: todayStr,
      status: 'COMPLETED',
    });

    await EecpSession.create({
      hospitalId: hospA.id,
      courseId: course1.id,
      patientId: patA1.id,
      sessionNumber: 2,
      scheduledDate: todayStr,
      status: 'SCHEDULED',
    });

    // 7. Invoices & Payments:
    // Invoice 1: 5000 billed, 3000 paid, 2000 due
    const inv1 = await Invoice.create({
      hospitalId: hospA.id,
      invoiceNumber: `INV-10-1-${Date.now()}`.slice(0, 50),
      patientId: patA1.id,
      invoiceDate: todayStr,
      subtotal: 5000,
      discountAmount: 0,
      taxAmount: 0,
      totalAmount: 5000,
      paidAmount: 3000,
      dueAmount: 2000,
      status: 'ISSUED',
      paymentStatus: 'PARTIALLY_PAID',
    });

    // Invoice 2: 2500 billed, 2500 paid, 0 due
    const inv2 = await Invoice.create({
      hospitalId: hospA.id,
      invoiceNumber: `INV-10-2-${Date.now()}`.slice(0, 50),
      patientId: patA2.id,
      invoiceDate: todayStr,
      subtotal: 2500,
      discountAmount: 0,
      taxAmount: 0,
      totalAmount: 2500,
      paidAmount: 2500,
      dueAmount: 0,
      status: 'ISSUED',
      paymentStatus: 'PAID',
    });

    await Payment.create({
      hospitalId: hospA.id,
      paymentNumber: `PAY-10-1-${Date.now()}`.slice(0, 50),
      invoiceId: inv1.id,
      patientId: patA1.id,
      paymentModeId: pModeCash.id,
      amount: 3000,
      paymentDate: todayStr,
      status: 'SUCCESS',
      refundedAmount: 0,
    });

    await Payment.create({
      hospitalId: hospA.id,
      paymentNumber: `PAY-10-2-${Date.now()}`.slice(0, 50),
      invoiceId: inv2.id,
      patientId: patA2.id,
      paymentModeId: pModeUpi.id,
      amount: 2500,
      paymentDate: todayStr,
      status: 'SUCCESS',
      refundedAmount: 500,
    });

    assert(hospA && hospB, 'Tenants created cleanly');

    // ====================================================
    // GROUP 1: DATE RANGE RESOLUTION (Tests 1-8)
    // ====================================================
    console.log('\n--- Group 1: Date Range Presets & Normalization ---');

    const drToday = reportService.resolveDateRange('today');
    assert(drToday.preset === 'today', 'Preset "today" returned cleanly');
    assert(drToday.startDateStr === todayStr, 'Today start matches current date');
    assert(drToday.endDateStr === todayStr, 'Today end matches current date');

    const drYesterday = reportService.resolveDateRange('yesterday');
    assert(drYesterday.preset === 'yesterday', 'Preset "yesterday" resolved');
    assert(drYesterday.startDateStr <= drToday.startDateStr, 'Yesterday strictly precedes today');

    const drThisMonth = reportService.resolveDateRange('this_month');
    assert(drThisMonth.startDateStr.endsWith('-01'), 'Month start begins on 1st day of month');

    const drThisYear = reportService.resolveDateRange('this_year');
    assert(drThisYear.startDateStr.endsWith('-01-01'), 'Year start begins on Jan 1st');

    const drCustom = reportService.resolveDateRange('custom', '2026-06-01', '2026-06-30');
    assert(drCustom.startDateStr === '2026-06-01', 'Custom startDate preserved');
    assert(drCustom.endDateStr === '2026-06-30', 'Custom endDate preserved');

    // ====================================================
    // GROUP 2: EXECUTIVE DASHBOARD KPIS (Tests 9-22)
    // ====================================================
    console.log('\n--- Group 2: Central Dashboard KPIs ---');

    const dash = await reportService.getHospitalDashboardMetrics(hospA.id, { preset: 'this_month' });
    assert(dash && dash.kpis, 'Dashboard metrics returned structured object');

    // Patient KPIs
    assert(dash.kpis.patients.newPatients >= 2, `New patients counted accurately (${dash.kpis.patients.newPatients})`);
    assert(dash.kpis.patients.totalVisits >= 1, `Total patient visits calculated (${dash.kpis.patients.totalVisits})`);

    // Appointment KPIs
    assert(dash.kpis.appointments.total >= 3, `Total appointments in range counted (${dash.kpis.appointments.total})`);
    assert(dash.kpis.appointments.completed >= 1, `Completed appointments counted (${dash.kpis.appointments.completed})`);
    assert(dash.kpis.appointments.cancelled >= 1, `Cancelled appointments counted (${dash.kpis.appointments.cancelled})`);
    assert(typeof dash.kpis.appointments.completionRate === 'number', `Completion rate calculated (${dash.kpis.appointments.completionRate}%)`);

    // IPD KPIs
    assert(dash.kpis.ipd.currentAdmissions >= 1, `Active IPD admissions counted (${dash.kpis.ipd.currentAdmissions})`);
    assert(dash.kpis.ipd.totalBeds >= 2, `Total beds census counted (${dash.kpis.ipd.totalBeds})`);
    assert(dash.kpis.ipd.occupiedBeds >= 1, `Occupied beds census counted (${dash.kpis.ipd.occupiedBeds})`);
    assert(dash.kpis.ipd.bedOccupancyRate > 0, `Bed occupancy percentage calculated (${dash.kpis.ipd.bedOccupancyRate}%)`);

    // Pharmacy KPIs
    assert(dash.kpis.pharmacy.dispensingCount >= 1, `Prescriptions dispensed counted (${dash.kpis.pharmacy.dispensingCount})`);
    assert(dash.kpis.pharmacy.lowStockMedicines >= 1, `Low stock medicines identified (${dash.kpis.pharmacy.lowStockMedicines})`);
    assert(dash.kpis.pharmacy.expiringBatches >= 1, `Expiring batches identified (${dash.kpis.pharmacy.expiringBatches})`);

    // Lab & EECP KPIs
    assert(dash.kpis.laboratory.totalOrders >= 1, `Laboratory orders counted (${dash.kpis.laboratory.totalOrders})`);
    assert(dash.kpis.laboratory.criticalResults >= 1, `Critical laboratory results flagged (${dash.kpis.laboratory.criticalResults})`);
    assert(dash.kpis.eecp.activeCourses >= 1, `Active EECP courses counted (${dash.kpis.eecp.activeCourses})`);
    assert(dash.kpis.eecp.sessionsCompleted >= 1, `Completed EECP sessions counted (${dash.kpis.eecp.sessionsCompleted})`);

    // Revenue KPIs: Distinction between Billed and Collected
    assert(dash.kpis.revenue.totalBilled === 7500, `Total billed calculated correctly (7500 === ${dash.kpis.revenue.totalBilled})`);
    assert(dash.kpis.revenue.totalCollected === 5500, `Total collected calculated correctly (5500 === ${dash.kpis.revenue.totalCollected})`);
    assert(dash.kpis.revenue.totalOutstanding === 2000, `Total outstanding calculated correctly (2000 === ${dash.kpis.revenue.totalOutstanding})`);
    assert(dash.kpis.revenue.totalRefunded === 500, `Total refunded calculated correctly (500 === ${dash.kpis.revenue.totalRefunded})`);

    // ====================================================
    // GROUP 3: PATIENT REGISTRATION REPORT (Tests 23-27)
    // ====================================================
    console.log('\n--- Group 3: Patient Registration & Visits Report ---');

    const patRep = await reportService.getPatientReport(hospA.id, { preset: 'this_month' });
    assert(patRep.summary.totalPatients >= 2, `Total registered patients in range (${patRep.summary.totalPatients})`);
    assert(patRep.summary.malePatients >= 1, `Male patients counted accurately (${patRep.summary.malePatients})`);
    assert(patRep.summary.femalePatients >= 1, `Female patients counted accurately (${patRep.summary.femalePatients})`);
    assert(Array.isArray(patRep.data) && patRep.data.length >= 2, 'Paginated patient rows returned');
    assert(patRep.data[0].uhid && patRep.data[0].fullName, 'Patient record contains UHID and fullName');

    // ====================================================
    // GROUP 4: APPOINTMENTS & OPD REPORT (Tests 28-33)
    // ====================================================
    console.log('\n--- Group 4: Appointments & Clinical Encounters ---');

    const aptRep = await reportService.getAppointmentReport(hospA.id, { preset: 'this_month' });
    assert(aptRep.summary.total >= 3, `Appointment summary calculated (${aptRep.summary.total})`);
    assert(Array.isArray(aptRep.byDoctor) && aptRep.byDoctor.length >= 1, 'Appointments broken down by doctor');
    assert(aptRep.byDoctor[0].doctorName === docA.name, 'Doctor breakdown maps accurately to Dr. Arjun Mehta');
    assert(Array.isArray(aptRep.byDepartment) && aptRep.byDepartment.length >= 1, 'Appointments broken down by department');

    const opdRep = await reportService.getOpdReport(hospA.id, { preset: 'this_month' });
    assert(opdRep.summary.totalEncounters >= 1, `OPD encounters counted (${opdRep.summary.totalEncounters})`);
    assert(opdRep.summary.completedConsultations >= 1, `Completed OPD consultations counted (${opdRep.summary.completedConsultations})`);

    // ====================================================
    // GROUP 5: DOCTOR & DEPARTMENT PERFORMANCE (Tests 34-38)
    // ====================================================
    console.log('\n--- Group 5: Doctor & Department Operational Reports ---');

    const docRep = await reportService.getDoctorPerformanceReport(hospA.id, { preset: 'this_month' });
    assert(Array.isArray(docRep.data) && docRep.data.length >= 1, 'Doctor performance report generated');
    const docAStats = docRep.data.find((d) => d.doctorId === docA.id);
    assert(docAStats && docAStats.completedAppointments >= 1, 'Doctor A completed appointments captured');
    assert(docAStats && docAStats.ipdAdmissions >= 2, 'Doctor A IPD admissions captured');

    const depRep = await reportService.getDepartmentReport(hospA.id, { preset: 'this_month' });
    assert(Array.isArray(depRep.data) && depRep.data.length >= 1, 'Department report generated');
    const depAStats = depRep.data.find((d) => d.departmentId === deptA.id);
    assert(depAStats && depAStats.appointments >= 3, 'Department A appointments volume verified');

    // ====================================================
    // GROUP 6: IPD ANALYTICS & OCCUPANCY (Tests 39-44)
    // ====================================================
    console.log('\n--- Group 6: Inpatient Analytics & Length of Stay ---');

    const ipdRep = await reportService.getIpdReport(hospA.id, { preset: 'this_month' });
    assert(ipdRep.summary.totalAdmissions >= 1, `IPD total admissions calculated (${ipdRep.summary.totalAdmissions})`);
    assert(ipdRep.summary.emergencyAdmissions >= 1, 'Emergency admissions categorized cleanly');
    assert(ipdRep.summary.bedCensus.totalBeds >= 2, 'Bed census reflects total beds');
    assert(Array.isArray(ipdRep.wardOccupancy) && ipdRep.wardOccupancy.length >= 1, 'Ward occupancy list generated');
    assert(ipdRep.wardOccupancy[0].wardName === wardA.wardName, 'Ward name matched accurately');

    // Average Length of Stay (ALOS) calculation for admPast: 2026-10-01 to 2026-10-04 = 3 days
    const ipdRepAllTime = await reportService.getIpdReport(hospA.id, { preset: 'this_year' });
    assert(ipdRepAllTime.summary.averageLengthOfStay === 3, `ALOS calculated precisely (3 days === ${ipdRepAllTime.summary.averageLengthOfStay})`);

    // ====================================================
    // GROUP 7: PHARMACY REPORT (Tests 45-48)
    // ====================================================
    console.log('\n--- Group 7: Pharmacy Inventory & Stock Movement ---');

    const pharmRep = await reportService.getPharmacyReport(hospA.id, { preset: 'this_month' });
    assert(pharmRep.summary.totalMedicines >= 1, `Total medicines counted (${pharmRep.summary.totalMedicines})`);
    assert(pharmRep.summary.dispensing.totalDispensed >= 1, `Dispensed prescriptions counted (${pharmRep.summary.dispensing.totalDispensed})`);
    assert(pharmRep.summary.stockMovement.totalStockIn === 50, `Stock In ledger sum accurate (50 === ${pharmRep.summary.stockMovement.totalStockIn})`);
    assert(pharmRep.summary.stockMovement.totalStockDispensed === 10, `Stock Dispensed ledger sum accurate (10 === ${pharmRep.summary.stockMovement.totalStockDispensed})`);

    // ====================================================
    // GROUP 8: LABORATORY REPORT (Tests 49-52)
    // ====================================================
    console.log('\n--- Group 8: Laboratory Diagnostics Report ---');

    const labRep = await reportService.getLaboratoryReport(hospA.id, { preset: 'this_month' });
    assert(labRep.summary.totalOrders >= 1, `Total orders counted (${labRep.summary.totalOrders})`);
    assert(labRep.summary.completedOrders >= 1, `Completed orders counted (${labRep.summary.completedOrders})`);
    assert(labRep.summary.criticalResults >= 1, `Critical results flagged (${labRep.summary.criticalResults})`);
    assert(Array.isArray(labRep.byInvestigation) && labRep.byInvestigation.length >= 1, 'Orders grouped by investigation');

    // ====================================================
    // GROUP 9: EECP CLINICAL REPORT (Tests 53-56)
    // ====================================================
    console.log('\n--- Group 9: EECP Therapy Report ---');

    const eecpRep = await reportService.getEecpReport(hospA.id, { preset: 'this_month' });
    assert(eecpRep.summary.activeCourses >= 1, `Active EECP courses counted (${eecpRep.summary.activeCourses})`);
    assert(eecpRep.summary.sessionsInRange.completed >= 1, `Completed sessions counted (${eecpRep.summary.sessionsInRange.completed})`);
    assert(Array.isArray(eecpRep.packageUtilization) && eecpRep.packageUtilization.length >= 1, 'Package utilization generated');
    assert(eecpRep.packageUtilization[0].sessionsCompleted >= 10, 'Package sessions completed tallied');

    // ====================================================
    // GROUP 10: BILLING, REVENUE & AGING (Tests 57-62)
    // ====================================================
    console.log('\n--- Group 10: Financial Revenue & Outstanding Aging ---');

    const billRep = await reportService.getBillingReport(hospA.id, { preset: 'this_month' });
    assert(billRep.summary.totalBilled === 7500, `Total billed is 7500 (${billRep.summary.totalBilled})`);
    assert(billRep.summary.totalCollected === 5500, `Total collected is 5500 (${billRep.summary.totalCollected})`);
    assert(billRep.summary.totalOutstanding === 2000, `Total outstanding is 2000 (${billRep.summary.totalOutstanding})`);

    // Payment modes breakdown
    assert(Array.isArray(billRep.byPaymentMode) && billRep.byPaymentMode.length >= 2, 'Breakdown across Cash and UPI modes');
    const cashMode = billRep.byPaymentMode.find((m) => m.modeName.includes('Cash'));
    assert(cashMode && cashMode.amount === 3000, `Cash collection verified (3000 === ${cashMode?.amount})`);

    // Aging Buckets: Invoice 1 created today falls into 0-30 Days
    assert(billRep.agingSummary.aging0To30 >= 2000, `Aging bucket 0-30 days contains outstanding due (${billRep.agingSummary.aging0To30})`);

    // ====================================================
    // GROUP 11: CSV EXPORT UTILITY (Tests 63-65)
    // ====================================================
    console.log('\n--- Group 11: CSV Export Generation ---');

    const csvPatients = reportService.exportReportToCsv('patients', patRep);
    assert(typeof csvPatients === 'string' && csvPatients.includes('UHID'), 'Patient CSV export generated with headers');
    assert(csvPatients.includes(patA1.uhid), 'Patient CSV contains patient UHID');

    const csvBilling = reportService.exportReportToCsv('billing', billRep);
    assert(typeof csvBilling === 'string' && csvBilling.includes('Invoice Number'), 'Billing CSV export generated with headers');

    // ====================================================
    // GROUP 12: MULTI-TENANT ISOLATION (Tests 66-70)
    // ====================================================
    console.log('\n--- Group 12: Strict Multi-Tenant Isolation ---');

    // Hospital B query should see 0 Hospital A records
    const dashB = await reportService.getHospitalDashboardMetrics(hospB.id, { preset: 'this_month' });
    assert(dashB.kpis.revenue.totalBilled === 0, `Hospital B revenue isolated from Hospital A (${dashB.kpis.revenue.totalBilled} === 0)`);
    assert(dashB.kpis.appointments.total === 0, `Hospital B appointments isolated from Hospital A (${dashB.kpis.appointments.total} === 0)`);
    assert(dashB.kpis.ipd.currentAdmissions === 0, `Hospital B admissions isolated from Hospital A (${dashB.kpis.ipd.currentAdmissions} === 0)`);

    const patRepB = await reportService.getPatientReport(hospB.id, { preset: 'this_month' });
    assert(patRepB.summary.totalPatients === 1, `Hospital B only sees its own 1 patient (${patRepB.summary.totalPatients} === 1)`);
    assert(patRepB.data[0].uhid === patB1.uhid, 'Hospital B patient matches Bob Beta');

  } catch (error) {
    console.error('UNEXPECTED SUITE ERROR:', error?.message || error);
    if (error?.original) console.error('DB ERROR DETAIL:', error.original.message);
    if (error?.stack) console.error(error.stack);
    failed++;
  } finally {
    console.log('\n====================================================');
    console.log(`PHASE 10 VERIFICATION RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================\n');

    await sequelize.close();
    process.exit(failed > 0 ? 1 : 0);
  }
}

run();
