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
  PrescriptionItem,
  Investigation,
  InvestigationOrder,
  InvestigationResult,
  EecpPackage,
  EecpTreatmentCourse,
  EecpSession,
  Invoice,
  InvoiceItem,
  Payment,
  PaymentMode,
  Receipt,
  DischargeSummary,
  DischargeMedication,
  Notification,
  Role,
  UserRole,
} from '../models/index.js';
import notificationService from '../services/notification.service.js';
import documentService from '../services/document.service.js';
import inAppProvider from '../services/notificationProviders/inAppProvider.js';
import emailProvider from '../services/notificationProviders/emailProvider.js';
import smsProvider from '../services/notificationProviders/smsProvider.js';

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
  console.log('\n=== PHASE 11 VERIFICATION TEST SUITE: NOTIFICATIONS, DOCUMENTS, PRINTING & BRANDING ===\n');

  let hospA, hospB;
  let adminA, docA, nurseA, pharmA, labA, recepA;
  let adminB;
  let patA, patB;
  let deptA;
  let wardA, bedA;
  let medA, batchA;
  let invItemA;
  let pkgA;
  let pModeCash;

  try {
    // ----------------------------------------------------
    // SETUP: Tenants, Multi-Role Users & Clinical Baseline
    // ----------------------------------------------------
    console.log('--- Setup: Tenants, Multi-Role Users & Clinical Baseline ---');

    hospA = await Hospital.create({
      name: 'St. Jude Apex Hospital Phase 11',
      slug: `stjude-p11-${Date.now()}`,
      status: 'ACTIVE',
      email: 'info@stjude-apex.test',
      phone: '+1-555-0199',
      address: '100 Medical Plaza, Metro City',
    });

    hospB = await Hospital.create({
      name: 'Beacon Cross Hospital Phase 11',
      slug: `beacon-p11-${Date.now()}`,
      status: 'ACTIVE',
      email: 'contact@beacon-cross.test',
      phone: '+1-555-0299',
      address: '200 Health Way, Suburbia',
    });

    // Ensure roles exist
    const [adminRole] = await Role.findOrCreate({
      where: { name: 'HOSPITAL_ADMIN' },
      defaults: { description: 'Hospital Admin', scope: 'HOSPITAL' },
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
    const [recepRole] = await Role.findOrCreate({
      where: { name: 'RECEPTIONIST' },
      defaults: { description: 'Receptionist', scope: 'HOSPITAL' },
    });

    // Create staff users with various roles in Hospital A
    adminA = await User.create({
      hospitalId: hospA.id,
      name: 'Admin Alice',
      email: `adminA-${Date.now()}@stjude.test`,
      passwordHash: 'dummyhash',
      status: 'ACTIVE',
    });
    await UserRole.create({ userId: adminA.id, roleId: adminRole.id });

    docA = await User.create({
      hospitalId: hospA.id,
      name: 'Dr. David Rao',
      email: `docA-${Date.now()}@stjude.test`,
      passwordHash: 'dummyhash',
      status: 'ACTIVE',
    });
    await UserRole.create({ userId: docA.id, roleId: docRole.id });

    nurseA = await User.create({
      hospitalId: hospA.id,
      name: 'Nurse Nancy',
      email: `nurseA-${Date.now()}@stjude.test`,
      passwordHash: 'dummyhash',
      status: 'ACTIVE',
    });
    await UserRole.create({ userId: nurseA.id, roleId: nurseRole.id });

    pharmA = await User.create({
      hospitalId: hospA.id,
      name: 'Pharmacist Philip',
      email: `pharmA-${Date.now()}@stjude.test`,
      passwordHash: 'dummyhash',
      status: 'ACTIVE',
    });
    await UserRole.create({ userId: pharmA.id, roleId: pharmRole.id });

    labA = await User.create({
      hospitalId: hospA.id,
      name: 'Lab Tech Luke',
      email: `labA-${Date.now()}@stjude.test`,
      passwordHash: 'dummyhash',
      status: 'ACTIVE',
    });
    await UserRole.create({ userId: labA.id, roleId: labRole.id });

    recepA = await User.create({
      hospitalId: hospA.id,
      name: 'Receptionist Rita',
      email: `recepA-${Date.now()}@stjude.test`,
      passwordHash: 'dummyhash',
      status: 'ACTIVE',
    });
    await UserRole.create({ userId: recepA.id, roleId: recepRole.id });

    // Hospital B staff
    adminB = await User.create({
      hospitalId: hospB.id,
      name: 'Admin Bob',
      email: `adminB-${Date.now()}@beacon.test`,
      passwordHash: 'dummyhash',
      status: 'ACTIVE',
    });
    await UserRole.create({ userId: adminB.id, roleId: adminRole.id });

    deptA = await Department.create({
      hospitalId: hospA.id,
      name: 'Cardiology 11',
      code: `CARD11-${Date.now()}`.slice(0, 10),
      status: 'ACTIVE',
    });

    patA = await Patient.create({
      hospitalId: hospA.id,
      firstName: 'Suresh',
      lastName: 'Verma',
      gender: 'MALE',
      dateOfBirth: '1978-05-12',
      phone: '9876543210',
      uhid: `UHID-P11-A-${Date.now()}`.slice(0, 20),
      status: 'ACTIVE',
    });

    patB = await Patient.create({
      hospitalId: hospB.id,
      firstName: 'Kavita',
      lastName: 'Sen',
      gender: 'FEMALE',
      dateOfBirth: '1985-08-20',
      phone: '9876543211',
      uhid: `UHID-P11-B-${Date.now()}`.slice(0, 20),
      status: 'ACTIVE',
    });

    wardA = await Ward.create({
      hospitalId: hospA.id,
      wardName: 'Cardiac Care Unit 11',
      wardCode: `CCU11-${Date.now()}`.slice(0, 10),
      wardType: 'CCU',
      floor: '2',
      isActive: true,
    });

    bedA = await Bed.create({
      hospitalId: hospA.id,
      wardId: wardA.id,
      bedNumber: 'CCU-101',
      bedType: 'ICU',
      status: 'AVAILABLE',
      isActive: true,
    });

    medA = await Medicine.create({
      hospitalId: hospA.id,
      name: `Atorvastatin 20mg 11 ${Date.now()}`,
      category: 'CARDIOLOGY',
      dosageForm: 'TABLET',
      strength: '20mg',
      unit: 'mg',
      status: 'ACTIVE',
    });

    batchA = await MedicineBatch.create({
      hospitalId: hospA.id,
      medicineId: medA.id,
      batchNumber: `BAT11-${Date.now()}`.slice(0, 20),
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      quantityReceived: 500,
      quantityAvailable: 500,
      reorderLevel: 20,
      purchaseRate: 10.0,
      sellingRate: 18.0,
      status: 'ACTIVE',
    });

    invItemA = await Investigation.create({
      hospitalId: hospA.id,
      name: `Lipid Profile Comprehensive 11 ${Date.now()}`,
      code: `LIP11-${Date.now()}`.slice(0, 10),
      category: 'BIOCHEMISTRY',
      defaultCharge: 950.0,
      status: 'ACTIVE',
    });

    pkgA = await EecpPackage.create({
      hospitalId: hospA.id,
      name: `Standard EECP 35 Hours P11 ${Date.now()}`,
      numberOfSessions: 35,
      packagePrice: 70000.0,
      status: 'ACTIVE',
    });

    pModeCash = await PaymentMode.create({
      hospitalId: hospA.id,
      name: `Cash 11 ${Date.now()}`.slice(0, 20),
      code: `CASH11-${Date.now()}`.slice(0, 10),
      isActive: true,
    });

    console.log('✓ Setup complete.\n');

    // ====================================================
    // GROUP 1: Core Notification Service & Lifecycle
    // ====================================================
    console.log('--- Group 1: Core Notification Creation & Lifecycle ---');

    // 1. Create in-app notification
    const notif1 = await notificationService.createNotification({
      hospitalId: hospA.id,
      recipientUserId: docA.id,
      patientId: patA.id,
      type: 'APPOINTMENT',
      title: 'New Appointment Booked',
      message: 'Patient Suresh Verma booked for Cardiology consultation.',
      priority: 'NORMAL',
      entityType: 'Appointment',
      entityId: patA.id,
    });
    assert(notif1 && notif1.id, '1. Notification created with valid ID');
    assert(notif1.isRead === false, '2. New notification defaults to isRead = false');
    assert(notif1.priority === 'NORMAL', '3. Notification stores assigned priority NORMAL');

    // 2. High priority notification
    const notif2 = await notificationService.createNotification({
      hospitalId: hospA.id,
      recipientUserId: docA.id,
      type: 'LAB_RESULT',
      title: 'Critical Lab Result',
      message: 'Critical potassium level detected.',
      priority: 'URGENT',
    });
    assert(notif2.priority === 'URGENT', '4. URGENT priority notification created successfully');

    // 3. Unread count
    const unreadDocA = await notificationService.getUnreadCount(hospA.id, docA.id);
    assert(unreadDocA >= 2, '5. Unread count accurately reflects at least 2 unread notifications');

    // 4. Mark single notification as read
    const readResult = await notificationService.markAsRead(hospA.id, docA.id, notif1.id);
    assert(readResult.isRead === true, '6. markAsRead sets isRead = true');
    assert(readResult.readAt !== null, '7. markAsRead sets readAt timestamp');

    // 5. Decremented unread count
    const unreadAfterOne = await notificationService.getUnreadCount(hospA.id, docA.id);
    assert(unreadAfterOne === unreadDocA - 1, '8. Unread count accurately decrements by 1');

    // 6. Mark all as read
    await notificationService.markAllAsRead(hospA.id, docA.id);
    const unreadAfterAll = await notificationService.getUnreadCount(hospA.id, docA.id);
    assert(unreadAfterAll === 0, '9. markAllAsRead brings unread count to 0');

    // 7. Pagination and filtering
    for (let i = 0; i < 3; i++) {
      await notificationService.createNotification({
        hospitalId: hospA.id,
        recipientUserId: docA.id,
        type: 'SYSTEM',
        title: `System Alert ${i}`,
        message: `Message body ${i}`,
        priority: i === 0 ? 'HIGH' : 'LOW',
      });
    }

    const pagedResult = await notificationService.getNotifications(hospA.id, docA.id, {
      page: 1,
      limit: 2,
    });
    assert(pagedResult.data.length === 2, '10. Pagination limit = 2 returns exactly 2 records');
    assert(pagedResult.pagination.total >= 3, '11. Pagination reports total items correctly');
    assert(pagedResult.pagination.totalPages >= 2, '12. Pagination calculates totalPages correctly');

    // Filter by priority
    const highOnly = await notificationService.getNotifications(hospA.id, docA.id, {
      priority: 'HIGH',
    });
    assert(highOnly.data.every(n => n.priority === 'HIGH'), '13. Priority filter returns only requested priority');

    // Filter unread only
    const unreadOnly = await notificationService.getNotifications(hospA.id, docA.id, {
      unreadOnly: true,
    });
    assert(unreadOnly.data.every(n => n.isRead === false), '14. unreadOnly filter returns only unread items');

    // ====================================================
    // GROUP 2: Role-Aware Recipient Delivery (notifyRole)
    // ====================================================
    console.log('\n--- Group 2: Role-Aware Recipient Delivery ---');

    const roleDeliveries = await notificationService.notifyRole(
      hospA.id,
      'NURSE',
      {
        type: 'IPD',
        title: 'New Inpatient Admission',
        message: 'Patient admitted to Cardiac Care Unit.',
        priority: 'HIGH',
      }
    );
    assert(roleDeliveries.length >= 1, '15. notifyRole delivers notification to NURSE role users');
    const nurseUnread = await notificationService.getUnreadCount(hospA.id, nurseA.id);
    assert(nurseUnread >= 1, '16. Nurse inbox reflects received notification');

    // Doctor did not receive the nurse-specific broadcast
    const docOldUnread = await notificationService.getUnreadCount(hospA.id, docA.id);
    const labDeliveries = await notificationService.notifyRole(
      hospA.id,
      'LAB_STAFF',
      {
        type: 'LAB_RESULT',
        title: 'New Lab Sample Awaiting Processing',
        message: 'Blood sample received in laboratory.',
      }
    );
    assert(labDeliveries.length >= 1, '17. notifyRole delivers to LAB_STAFF user');
    const docUnreadCheck = await notificationService.getUnreadCount(hospA.id, docA.id);
    assert(docUnreadCheck === docOldUnread, '18. Unrelated doctor user did not receive LAB_STAFF broadcast');

    // ====================================================
    // GROUP 3: Multi-Tenant Notification Isolation
    // ====================================================
    console.log('\n--- Group 3: Multi-Tenant Notification Isolation ---');

    // Create a notification for Hospital B
    const notifB = await notificationService.createNotification({
      hospitalId: hospB.id,
      recipientUserId: adminB.id,
      type: 'SYSTEM',
      title: 'Beta Hospital Alert',
      message: 'Private message for Beta Horizon.',
    });

    // Query notifications as Hospital A user
    const hospAView = await notificationService.getNotifications(hospA.id, adminA.id, {});
    const leakedB = hospAView.data.find(n => n.id === notifB.id);
    assert(!leakedB, '19. Hospital A user cannot retrieve Hospital B notification');

    // Attempting to mark Hospital B notification as read using Hospital A context fails safely
    let crossTenantError = false;
    try {
      await notificationService.markAsRead(hospA.id, adminA.id, notifB.id);
    } catch {
      crossTenantError = true;
    }
    assert(crossTenantError, '20. Cross-tenant markAsRead is strictly rejected with an error');

    // Unread count strictly tenant-isolated
    const countB = await notificationService.getUnreadCount(hospB.id, adminB.id);
    const countA = await notificationService.getUnreadCount(hospA.id, adminA.id);
    assert(countB >= 1, '21. Hospital B unread count reflects its own notifications');
    assert(typeof countA === 'number', '22. Hospital A unread count is computed independently');

    // ====================================================
    // GROUP 4: Business Event Dispatchers
    // ====================================================
    console.log('\n--- Group 4: Business Event Dispatchers ---');

    const patientFullName = `${patA.firstName} ${patA.lastName}`;

    // 1. Appointment Event
    const aptNotifs = await notificationService.notifyAppointmentEvent(hospA.id, 'BOOKED', {
      patientName: patientFullName,
      patientId: patA.id,
      appointmentNumber: 'APT-2026-000001',
      doctorId: docA.id,
      departmentName: deptA.name,
    });
    assert(aptNotifs.length >= 1, '23. notifyAppointmentEvent triggers reception & doctor alerts');

    // 2. Lab Event
    const labNotifs = await notificationService.notifyLabEvent(hospA.id, 'CRITICAL', {
      patientName: patientFullName,
      patientId: patA.id,
      orderNumber: 'LAB-2026-000001',
      testName: invItemA.name,
      orderingDoctorId: docA.id,
    });
    assert(labNotifs.length >= 1, '24. notifyLabEvent triggers high priority doctor & lab alerts');

    // 3. Pharmacy Event
    const pharmNotifs = await notificationService.notifyPharmacyEvent(hospA.id, 'READY', {
      patientName: patientFullName,
      patientId: patA.id,
      prescriptionNumber: 'RX-2026-000001',
      prescribingDoctorId: docA.id,
    });
    assert(pharmNotifs.length >= 1, '25. notifyPharmacyEvent triggers pharmacy alerts');

    // 4. Billing Event
    const billNotifs = await notificationService.notifyBillingEvent(hospA.id, 'PAYMENT_RECEIVED', {
      patientName: patientFullName,
      patientId: patA.id,
      invoiceNumber: 'INV-2026-000001',
      receiptNumber: 'REC-2026-000001',
      amount: 4500.0,
    });
    assert(billNotifs.length >= 1, '26. notifyBillingEvent triggers finance & admin alerts');

    // 5. IPD Event
    const ipdNotifs = await notificationService.notifyIpdEvent(hospA.id, 'ADMISSION', {
      patientName: patientFullName,
      patientId: patA.id,
      admissionNumber: 'IPD-2026-000001',
      wardName: wardA.wardName,
      bedNumber: bedA.bedNumber,
      attendingDoctorId: docA.id,
    });
    assert(ipdNotifs.length >= 1, '27. notifyIpdEvent triggers nurse & attending doctor alerts');

    // 6. EECP Event
    const eecpNotifs = await notificationService.notifyEecpEvent(hospA.id, 'SESSION_COMPLETED', {
      patientName: patientFullName,
      patientId: patA.id,
      courseNumber: 'EECP-2026-000001',
      sessionNumber: 5,
      totalSessions: 35,
      attendingDoctorId: docA.id,
    });
    assert(eecpNotifs.length >= 1, '28. notifyEecpEvent triggers EECP clinical progress alerts');

    // ====================================================
    // GROUP 5: Notification Preferences & Category Suppress
    // ====================================================
    console.log('\n--- Group 5: Hospital Notification Preferences ---');

    const defaultPrefs = await notificationService.getNotificationPreferences(hospA.id);
    assert(defaultPrefs.appointments === true, '29. Default notification preference for appointments is true');
    assert(defaultPrefs.lab === true, '30. Default notification preference for lab is true');

    // Disable appointment notifications
    const updatedPrefs = await notificationService.updateNotificationPreferences(hospA.id, {
      appointments: false,
    });
    assert(updatedPrefs.appointments === false, '31. updateNotificationPreferences successfully disables appointments category');

    // Trigger appointment event when disabled
    const suppressedNotifs = await notificationService.notifyAppointmentEvent(hospA.id, 'CANCELLED', {
      patientName: patientFullName,
      appointmentNumber: 'APT-2026-000002',
    });
    assert(suppressedNotifs.length === 0, '32. Disabled notification category suppresses alert generation cleanly');

    // Re-enable appointment category
    await notificationService.updateNotificationPreferences(hospA.id, {
      appointments: true,
    });
    const reEnabledPrefs = await notificationService.getNotificationPreferences(hospA.id);
    assert(reEnabledPrefs.appointments === true, '33. Category can be re-enabled seamlessly');

    // ====================================================
    // GROUP 6: Channel Abstraction & Provider Resilience
    // ====================================================
    console.log('\n--- Group 6: Channel Abstraction & Provider Resilience ---');

    // In-app provider
    const inAppRes = await inAppProvider.send({
      hospitalId: hospA.id,
      recipientUserId: docA.id,
      type: 'SYSTEM',
      title: 'Channel Test',
      message: 'In-app channel test payload',
    });
    assert(inAppRes.success === true && inAppRes.notificationId, '34. InAppProvider delivers notification record');

    // Email provider simulated handling
    const emailRes = await emailProvider.send({
      to: 'doctor@example.com',
      subject: 'Lab Results Ready',
      body: 'Your patient results are available.',
    });
    assert(emailRes.success === true && emailRes.channel === 'EMAIL', '35. EmailProvider returns resilient delivery status');

    // SMS provider simulated handling
    const smsRes = await smsProvider.send({
      to: '+15551234567',
      message: 'Your appointment is confirmed for tomorrow.',
    });
    assert(smsRes.success === true && smsRes.channel === 'SMS', '36. SmsProvider returns resilient delivery status');

    // Core transaction safety: provider delivery errors do not throw or crash
    let safeExecution = false;
    try {
      await notificationService.createNotification({
        hospitalId: hospA.id,
        recipientUserId: docA.id,
        type: 'SYSTEM',
        title: 'Safety Test',
        message: 'Resilience verification',
        channels: ['IN_APP', 'EMAIL', 'SMS'],
      });
      safeExecution = true;
    } catch {
      safeExecution = false;
    }
    assert(safeExecution, '37. Multi-channel delivery executes safely without uncaught exceptions');

    // ====================================================
    // GROUP 7: Hospital Branding Management
    // ====================================================
    console.log('\n--- Group 7: Hospital Branding Configuration ---');

    const brandingInit = await documentService.getHospitalBranding(hospA.id);
    assert(brandingInit.hospitalName === hospA.name, '38. getHospitalBranding retrieves hospital entity name');
    assert(brandingInit.address === hospA.address, '39. getHospitalBranding retrieves address from hospital profile');

    // Update branding with header, footer, logo
    const updatedBranding = await documentService.updateHospitalBranding(hospA.id, {
      hospitalName: 'St. Jude Super Specialty Hospital & Research',
      phone: '+1-555-9999',
      logoUrl: 'https://cdn.example.com/stjude-logo.png',
      headerText: 'Excellence in Tertiary & Preventive Healthcare',
      footerText: 'Thank you for choosing St. Jude. 24x7 Helpline: 1800-000-JUDE',
    });
    assert(updatedBranding.hospitalName.includes('Super Specialty'), '40. updateHospitalBranding updates hospital name');
    assert(updatedBranding.logoUrl === 'https://cdn.example.com/stjude-logo.png', '41. updateHospitalBranding stores logoUrl');
    assert(updatedBranding.headerText.includes('Excellence'), '42. updateHospitalBranding stores custom header text');
    assert(updatedBranding.footerText.includes('Helpline'), '43. updateHospitalBranding stores custom footer text');

    // Tenant isolation on branding
    const brandingB = await documentService.getHospitalBranding(hospB.id);
    assert(brandingB.hospitalName === hospB.name, '44. Hospital B branding remains completely isolated');
    assert(brandingB.headerText !== updatedBranding.headerText, '45. Hospital B does not inherit Hospital A custom header');

    // ====================================================
    // GROUP 8: Document Data Generation (All 7 Types)
    // ====================================================
    console.log('\n--- Group 8: Document Data Generation (7 Document Types) ---');

    // 1. PRESCRIPTION DOCUMENT
    const encA = await Encounter.create({
      hospitalId: hospA.id,
      patientId: patA.id,
      doctorId: docA.id,
      encounterNumber: `ENC-P11-${Date.now()}`.slice(0, 20),
      encounterType: 'OPD',
      status: 'COMPLETED',
    });

    const rxA = await Prescription.create({
      hospitalId: hospA.id,
      encounterId: encA.id,
      patientId: patA.id,
      doctorId: docA.id,
      prescriptionNumber: `RX-P11-${Date.now()}`.slice(0, 20),
      status: 'FINALIZED',
      notes: 'Advised lifestyle modification and low-sodium diet.',
    });

    await PrescriptionItem.create({
      hospitalId: hospA.id,
      prescriptionId: rxA.id,
      medicineId: medA.id,
      medicineName: medA.name,
      dosage: '1 Tab',
      frequency: '1-0-0',
      durationValue: 30,
      durationUnit: 'DAYS',
      instructions: 'Take after dinner',
      quantity: 30,
    });

    const rxDoc = await documentService.getDocumentData(hospA.id, 'PRESCRIPTION', rxA.id);
    assert(rxDoc.documentType === 'PRESCRIPTION', '46. Prescription document data generated with correct type');
    assert(rxDoc.branding && rxDoc.branding.hospitalName, '47. Prescription document includes hospital branding');
    assert(rxDoc.patient && rxDoc.patient.uhid === patA.uhid, '48. Prescription document contains authoritative patient UHID');
    assert(rxDoc.items.length === 1 && rxDoc.items[0].medicineName.includes('Atorvastatin'), '49. Prescription document contains accurate medicine list');
    assert(rxDoc.doctor && rxDoc.doctor.name === docA.name, '50. Prescription document includes prescribing doctor');

    // 2. LAB REPORT DOCUMENT
    const labOrderA = await InvestigationOrder.create({
      hospitalId: hospA.id,
      patientId: patA.id,
      doctorId: docA.id,
      encounterId: encA.id,
      investigationId: invItemA.id,
      investigationName: invItemA.name,
      orderNumber: `ORD-P11-${Date.now()}`.slice(0, 20),
      priority: 'URGENT',
      orderedAt: new Date(),
      status: 'FINALIZED',
    });

    await InvestigationResult.create({
      hospitalId: hospA.id,
      investigationOrderId: labOrderA.id,
      investigationId: invItemA.id,
      encounterId: encA.id,
      doctorId: docA.id,
      investigationNameSnapshot: invItemA.name,
      patientId: patA.id,
      resultNumber: `RES-P11-${Date.now()}`.slice(0, 20),
      status: 'FINALIZED',
      resultValue: '215',
      resultUnit: 'mg/dL',
      referenceRange: '150 - 200 mg/dL',
      abnormalFlag: 'ABNORMAL',
      verifiedAt: new Date(),
    });

    const labDoc = await documentService.getDocumentData(hospA.id, 'LAB_REPORT', labOrderA.id);
    assert(labDoc.documentType === 'LAB_REPORT', '51. Lab Report document generated with correct type');
    assert(labDoc.meta.investigationName === invItemA.name, '52. Lab Report displays correct test name');
    assert(labDoc.results.length === 1 && labDoc.results[0].resultValue === '215', '53. Lab Report accurately returns investigation result value');
    assert(labDoc.doctor && labDoc.doctor.name === docA.name, '54. Lab Report contains doctor info');

    // 3. INVOICE DOCUMENT
    const invA = await Invoice.create({
      hospitalId: hospA.id,
      patientId: patA.id,
      invoiceNumber: `INV-P11-${Date.now()}`.slice(0, 20),
      invoiceDate: new Date(),
      subtotal: 12000.0,
      discountAmount: 1000.0,
      taxAmount: 500.0,
      totalAmount: 11500.0,
      paidAmount: 5000.0,
      dueAmount: 6500.0,
      status: 'ISSUED',
      paymentStatus: 'PARTIALLY_PAID',
    });

    await InvoiceItem.create({
      hospitalId: hospA.id,
      invoiceId: invA.id,
      description: 'Consultation & Diagnostics',
      quantity: 1,
      unitPrice: 12000.0,
      taxPercentage: 0,
      discountAmount: 1000.0,
      lineTotal: 11000.0,
    });

    const invoiceDoc = await documentService.getDocumentData(hospA.id, 'INVOICE', invA.id);
    assert(invoiceDoc.documentType === 'INVOICE', '55. Invoice document generated with correct type');
    assert(Number(invoiceDoc.financials.totalAmount) === 11500, '56. Invoice document displays authoritative totalAmount without recalculation');
    assert(Number(invoiceDoc.financials.paidAmount) === 5000 && Number(invoiceDoc.financials.dueAmount) === 6500, '57. Invoice document preserves paid and due amounts');
    assert(invoiceDoc.meta.paymentStatus === 'PARTIALLY_PAID', '58. Invoice document reflects correct payment status');

    // 4. RECEIPT DOCUMENT
    const payA = await Payment.create({
      hospitalId: hospA.id,
      patientId: patA.id,
      invoiceId: invA.id,
      paymentNumber: `PAY-P11-${Date.now()}`.slice(0, 20),
      amount: 5000.0,
      paymentModeId: pModeCash.id,
      paymentDate: new Date(),
      status: 'SUCCESS',
      refundedAmount: 0,
    });

    const receiptA = await Receipt.create({
      hospitalId: hospA.id,
      receiptNumber: `REC-P11-${Date.now()}`.slice(0, 20),
      paymentId: payA.id,
      invoiceId: invA.id,
      patientId: patA.id,
      receiptDate: new Date(),
      amount: 5000.0,
      generatedBy: adminA.id,
    });

    const receiptDoc = await documentService.getDocumentData(hospA.id, 'RECEIPT', receiptA.id);
    assert(receiptDoc.documentType === 'RECEIPT', '59. Receipt document generated with correct type');
    assert(receiptDoc.meta.receiptNumber === receiptA.receiptNumber, '60. Receipt document contains authoritative receipt number');
    assert(Number(receiptDoc.paymentDetails.amount) === 5000, '61. Receipt document reflects exact transaction payment amount');
    assert(receiptDoc.paymentDetails.receivedBy === adminA.name, '62. Receipt document shows issuing staff');

    // 5. APPOINTMENT SLIP DOCUMENT
    const aptA = await Appointment.create({
      hospitalId: hospA.id,
      patientId: patA.id,
      doctorId: docA.id,
      departmentId: deptA.id,
      appointmentNumber: `APT-P11-${Date.now()}`.slice(0, 20),
      appointmentDate: '2026-10-15',
      startTime: '10:30',
      endTime: '11:00',
      appointmentType: 'NEW_CONSULTATION',
      status: 'CONFIRMED',
    });

    const aptDoc = await documentService.getDocumentData(hospA.id, 'APPOINTMENT_SLIP', aptA.id);
    assert(aptDoc.documentType === 'APPOINTMENT_SLIP', '63. Appointment slip generated with correct type');
    assert(aptDoc.meta.appointmentNumber === aptA.appointmentNumber, '64. Appointment slip contains valid appointment reference');
    assert(aptDoc.doctor.name === docA.name && aptDoc.department.name === deptA.name, '65. Appointment slip includes doctor & department details');

    // 6. DISCHARGE SUMMARY DOCUMENT
    const admA = await IpdAdmission.create({
      hospitalId: hospA.id,
      admissionNumber: `IPD-P11-${Date.now()}`.slice(0, 20),
      patientId: patA.id,
      admittingDoctorId: docA.id,
      wardId: wardA.id,
      bedId: bedA.id,
      departmentId: deptA.id,
      admissionType: 'EMERGENCY',
      admissionDate: new Date('2026-10-01'),
      dischargedAt: new Date('2026-10-07'),
      status: 'DISCHARGED',
      reasonForAdmission: 'Acute chest pain',
    });

    const disSummaryA = await DischargeSummary.create({
      hospitalId: hospA.id,
      admissionId: admA.id,
      patientId: patA.id,
      dischargeSummaryNumber: `DIS-P11-${Date.now()}`.slice(0, 20),
      dischargingDoctorId: docA.id,
      dischargeDate: '2026-10-07',
      diagnosisAtAdmission: 'Chest Pain',
      finalDiagnosis: 'Acute Coronary Syndrome, stabilized',
      hospitalCourse: 'Patient admitted via emergency, stabilized in CCU.',
      dischargeInstructions: 'Rest for 2 weeks.',
      followUpInstructions: 'Review in OPD after 14 days.',
      status: 'FINALIZED',
    });

    await DischargeMedication.create({
      hospitalId: hospA.id,
      dischargeSummaryId: disSummaryA.id,
      medicineId: medA.id,
      medicineName: medA.name,
      dosage: '1 Tab',
      frequency: 'OD',
      duration: '30 Days',
      instructions: 'Take after dinner',
      orderIndex: 1,
    });

    const disDoc = await documentService.getDocumentData(hospA.id, 'DISCHARGE_SUMMARY', disSummaryA.id);
    assert(disDoc.documentType === 'DISCHARGE_SUMMARY', '66. Discharge summary generated with correct type');
    assert(disDoc.clinicalDetails.finalDiagnosis.includes('Coronary Syndrome'), '67. Discharge summary contains clinical diagnosis');
    assert(disDoc.medications.length === 1, '68. Discharge summary includes discharge medications');
    assert(disDoc.clinicalDetails.followUpInstructions.includes('14 days'), '69. Discharge summary includes follow-up instructions');

    // 7. EECP SUMMARY DOCUMENT
    const eecpCourseA = await EecpTreatmentCourse.create({
      hospitalId: hospA.id,
      courseNumber: `EECP-P11-${Date.now()}`.slice(0, 20),
      patientId: patA.id,
      doctorId: docA.id,
      packageId: pkgA.id,
      plannedSessions: 35,
      completedSessions: 2,
      status: 'ACTIVE',
      startDate: '2026-09-20',
    });

    await EecpSession.create({
      hospitalId: hospA.id,
      courseId: eecpCourseA.id,
      patientId: patA.id,
      sessionNumber: 1,
      scheduledDate: '2026-09-21',
      status: 'COMPLETED',
    });
    await EecpSession.create({
      hospitalId: hospA.id,
      courseId: eecpCourseA.id,
      patientId: patA.id,
      sessionNumber: 2,
      scheduledDate: '2026-09-22',
      status: 'COMPLETED',
    });

    const eecpDoc = await documentService.getDocumentData(hospA.id, 'EECP_SUMMARY', eecpCourseA.id);
    assert(eecpDoc.documentType === 'EECP_SUMMARY', '70. EECP summary generated with correct type');
    assert(eecpDoc.meta.courseNumber === eecpCourseA.courseNumber, '71. EECP summary preserves course number');
    assert(eecpDoc.meta.plannedSessions === 35 && eecpDoc.meta.completedSessions === 2, '72. EECP summary tracks session progress metrics');
    assert(eecpDoc.patient && eecpDoc.patient.uhid === patA.uhid, '73. EECP summary links patient demographic details');

    // ====================================================
    // GROUP 9: Document Security & Cross-Tenant Protection
    // ====================================================
    console.log('\n--- Group 9: Document Security & Cross-Tenant Protection ---');

    // Cross-tenant document access check: Hospital B user requests Hospital A prescription
    let crossDocBlocked = false;
    try {
      await documentService.getDocumentData(hospB.id, 'PRESCRIPTION', rxA.id);
    } catch {
      crossDocBlocked = true;
    }
    assert(crossDocBlocked, '74. Cross-tenant prescription document access rejected securely');

    // Cross-tenant invoice access check
    let crossInvBlocked = false;
    try {
      await documentService.getDocumentData(hospB.id, 'INVOICE', invA.id);
    } catch {
      crossInvBlocked = true;
    }
    assert(crossInvBlocked, '75. Cross-tenant invoice document access rejected securely');

    // Invalid / non-existent document ID throws not found
    let notFoundCaught = false;
    try {
      await documentService.getDocumentData(hospA.id, 'INVOICE', '00000000-0000-0000-0000-000000000000');
    } catch {
      notFoundCaught = true;
    }
    assert(notFoundCaught, '76. Request for non-existent document entity raises clean not-found error');

    // Unsupported document type rejected
    let badTypeCaught = false;
    try {
      await documentService.getDocumentData(hospA.id, 'UNKNOWN_TYPE', invA.id);
    } catch {
      badTypeCaught = true;
    }
    assert(badTypeCaught, '77. Unsupported document type rejected gracefully');

    // ====================================================
    // GROUP 10: Print Formatting, Numbering & Internal IDs
    // ====================================================
    console.log('\n--- Group 10: Print Formatting, Numbering & Authoritative Fidelity ---');

    // Check that documents do not expose DB foreign keys as primary display fields
    assert(rxDoc.meta.prescriptionNumber === rxA.prescriptionNumber, '78. Prescription document uses prescriptionNumber in meta');
    assert(invoiceDoc.meta.invoiceNumber === invA.invoiceNumber, '79. Invoice document uses invoiceNumber in meta');
    assert(receiptDoc.meta.receiptNumber === receiptA.receiptNumber, '80. Receipt document uses receiptNumber in meta');
    assert(aptDoc.meta.appointmentNumber === aptA.appointmentNumber, '81. Appointment slip uses appointmentNumber in meta');
    assert(disDoc.meta.admissionNumber === admA.admissionNumber, '82. Discharge summary uses admissionNumber in meta');
    assert(eecpDoc.meta.courseNumber === eecpCourseA.courseNumber, '83. EECP summary uses courseNumber in meta');

    // Total calculations fidelity
    assert(Number(invoiceDoc.financials.totalAmount) === Number(invA.totalAmount), '84. Total amount has 100% financial fidelity with database invoice');

  } catch (err) {
    console.error('Fatal error during Phase 11 verification:', err);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`PHASE 11 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Unhandled verification error:', err);
    process.exit(1);
  });
