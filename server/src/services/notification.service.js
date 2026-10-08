import { Op } from 'sequelize';
import {
  Notification,
  User,
  Role,
  Patient,
  HospitalSetting,
} from '../models/index.js';
import inAppProvider from './notificationProviders/inAppProvider.js';
import emailProvider from './notificationProviders/emailProvider.js';
import smsProvider from './notificationProviders/smsProvider.js';

/**
 * PHASE 11: Notification Service
 * Handles multi-tenant in-app alerts, role routing, channels, and preferences.
 */

export const NOTIFICATION_TYPES = [
  'APPOINTMENT',
  'LAB_RESULT',
  'PRESCRIPTION',
  'PHARMACY',
  'BILLING',
  'PAYMENT',
  'IPD',
  'DISCHARGE',
  'EECP',
  'SYSTEM',
];

export const NOTIFICATION_PRIORITIES = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];

/**
 * 1. Create a notification for a specific user
 */
export const createNotification = async (hospitalIdOrData, maybeData) => {
  let hospitalId;
  let data;
  if (typeof hospitalIdOrData === 'object' && hospitalIdOrData !== null && !maybeData) {
    data = hospitalIdOrData;
    hospitalId = data.hospitalId;
  } else {
    hospitalId = hospitalIdOrData;
    data = maybeData || {};
  }

  const {
    recipientUserId,
    patientId = null,
    type = 'SYSTEM',
    title,
    message,
    priority = 'NORMAL',
    entityType = null,
    entityId = null,
    channel = 'IN_APP',
  } = data;

  if (!hospitalId) {
    const error = new Error('Hospital ID is required');
    error.statusCode = 400;
    throw error;
  }

  if (!recipientUserId) {
    const error = new Error('Recipient user ID is required');
    error.statusCode = 400;
    throw error;
  }

  if (!title || !message) {
    const error = new Error('Title and message are required');
    error.statusCode = 400;
    throw error;
  }

  // Verify recipient belongs to the hospital
  const recipient = await User.findOne({
    where: { id: recipientUserId, hospitalId },
  });

  if (!recipient) {
    const error = new Error('Recipient not found in this hospital');
    error.statusCode = 404;
    throw error;
  }

  // Create authoritative in-app notification record
  const notification = await Notification.create({
    hospitalId,
    recipientUserId,
    patientId,
    type,
    title,
    message,
    priority,
    entityType,
    entityId,
    isRead: false,
    channel,
    deliveryStatus: 'SENT',
  });

  // Execute providers non-blockingly (never breaks core caller)
  try {
    await inAppProvider.send(notification);

    // Optional email dispatch if email is available
    if (channel === 'EMAIL' && recipient.email) {
      await emailProvider.send({
        recipientEmail: recipient.email,
        subject: title,
        body: message,
      });
    }

    // Optional SMS dispatch if phone is available
    if (channel === 'SMS' && recipient.phone) {
      await smsProvider.send({
        recipientPhone: recipient.phone,
        message: `${title}: ${message}`,
      });
    }
  } catch (providerErr) {
    // Graceful delivery logging without interrupting transaction
    await notification.update({
      failureReason: providerErr.message,
    }).catch(() => null);
  }

  return notification;
};

/**
 * 2. Get paginated notifications for the authenticated user
 */
export const getNotifications = async (hospitalId, userId, options = {}) => {
  const {
    unreadOnly = false,
    priority,
    type,
    page = 1,
    limit = 20,
  } = options;

  const where = {
    hospitalId,
    recipientUserId: userId,
  };

  if (unreadOnly === true || unreadOnly === 'true') {
    where.isRead = false;
  }

  if (priority && NOTIFICATION_PRIORITIES.includes(priority.toUpperCase())) {
    where.priority = priority.toUpperCase();
  }

  if (type && NOTIFICATION_TYPES.includes(type.toUpperCase())) {
    where.type = type.toUpperCase();
  }

  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.max(1, parseInt(limit, 10) || 20);
  const offset = (parsedPage - 1) * parsedLimit;

  const [unreadCount, { count, rows }] = await Promise.all([
    Notification.count({
      where: { hospitalId, recipientUserId: userId, isRead: false },
    }),
    Notification.findAndCountAll({
      where,
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'uhid', 'firstName', 'lastName'],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: parsedLimit,
      offset,
    }),
  ]);

  return {
    unreadCount,
    pagination: {
      total: count,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(count / parsedLimit),
    },
    data: rows,
  };
};

/**
 * 3. Get unread notification count for the header badge
 */
export const getUnreadCount = async (hospitalId, userId) => {
  return Notification.count({
    where: {
      hospitalId,
      recipientUserId: userId,
      isRead: false,
    },
  });
};

/**
 * 4. Mark a single notification as read
 */
export const markAsRead = async (hospitalId, userId, notificationId) => {
  const notification = await Notification.findOne({
    where: {
      id: notificationId,
      hospitalId,
      recipientUserId: userId,
    },
  });

  if (!notification) {
    const error = new Error('Notification not found or access denied');
    error.statusCode = 404;
    throw error;
  }

  if (!notification.isRead) {
    await notification.update({
      isRead: true,
      readAt: new Date(),
    });
  }

  return notification;
};

/**
 * 5. Mark all unread notifications as read for current user
 */
export const markAllAsRead = async (hospitalId, userId) => {
  const [updatedCount] = await Notification.update(
    {
      isRead: true,
      readAt: new Date(),
    },
    {
      where: {
        hospitalId,
        recipientUserId: userId,
        isRead: false,
      },
    }
  );

  return { updatedCount };
};

/**
 * 6. Send role-targeted notification (e.g. notify all DOCTORS, NURSES, etc.)
 */
export const notifyRole = async (hospitalId, roleName, notificationData) => {
  const role = await Role.findOne({
    where: { name: roleName.toUpperCase(), scope: 'HOSPITAL' },
  });

  if (!role) {
    return [];
  }

  const staffUsers = await User.findAll({
    where: {
      hospitalId,
      status: 'ACTIVE',
    },
    include: [
      {
        model: Role,
        as: 'roles',
        where: { id: role.id },
        attributes: ['id', 'name'],
      },
    ],
    attributes: ['id', 'email', 'phone'],
  });

  const createdNotifications = [];
  for (const staff of staffUsers) {
    try {
      const n = await createNotification(hospitalId, {
        ...notificationData,
        recipientUserId: staff.id,
      });
      createdNotifications.push(n);
    } catch {
      // Continue notifying remaining users without failing
    }
  }

  return createdNotifications;
};

/**
 * 7. Retrieve notification preferences for hospital
 */
export const getNotificationPreferences = async (hospitalId) => {
  const settings = await HospitalSetting.findAll({
    where: {
      hospitalId,
      key: { [Op.like]: 'notifications.%' },
    },
  });

  const prefs = {
    appointmentEnabled: true,
    labEnabled: true,
    pharmacyEnabled: true,
    billingEnabled: true,
    ipdEnabled: true,
    eecpEnabled: true,
    emailChannelEnabled: false,
    smsChannelEnabled: false,
  };

  settings.forEach((s) => {
    const key = s.key.replace('notifications.', '');
    if (key === 'appointment_enabled') prefs.appointmentEnabled = s.value === 'true';
    if (key === 'lab_enabled') prefs.labEnabled = s.value === 'true';
    if (key === 'pharmacy_enabled') prefs.pharmacyEnabled = s.value === 'true';
    if (key === 'billing_enabled') prefs.billingEnabled = s.value === 'true';
    if (key === 'ipd_enabled') prefs.ipdEnabled = s.value === 'true';
    if (key === 'eecp_enabled') prefs.eecpEnabled = s.value === 'true';
    if (key === 'email_channel_enabled') prefs.emailChannelEnabled = s.value === 'true';
    if (key === 'sms_channel_enabled') prefs.smsChannelEnabled = s.value === 'true';
  });

  return {
    ...prefs,
    appointments: prefs.appointmentEnabled,
    lab: prefs.labEnabled,
    pharmacy: prefs.pharmacyEnabled,
    billing: prefs.billingEnabled,
    ipd: prefs.ipdEnabled,
    eecp: prefs.eecpEnabled,
  };
};

/**
 * 8. Update notification preferences for hospital
 */
export const updateNotificationPreferences = async (hospitalId, preferences) => {
  const keyMap = {
    appointmentEnabled: 'notifications.appointment_enabled',
    appointments: 'notifications.appointment_enabled',
    labEnabled: 'notifications.lab_enabled',
    lab: 'notifications.lab_enabled',
    pharmacyEnabled: 'notifications.pharmacy_enabled',
    pharmacy: 'notifications.pharmacy_enabled',
    billingEnabled: 'notifications.billing_enabled',
    billing: 'notifications.billing_enabled',
    ipdEnabled: 'notifications.ipd_enabled',
    ipd: 'notifications.ipd_enabled',
    eecpEnabled: 'notifications.eecp_enabled',
    eecp: 'notifications.eecp_enabled',
    emailChannelEnabled: 'notifications.email_channel_enabled',
    smsChannelEnabled: 'notifications.sms_channel_enabled',
  };

  for (const [prop, val] of Object.entries(preferences)) {
    const dbKey = keyMap[prop];
    if (dbKey) {
      const existing = await HospitalSetting.findOne({
        where: { hospitalId, key: dbKey },
      });
      if (existing) {
        await existing.update({ value: String(val) });
      } else {
        await HospitalSetting.create({
          hospitalId,
          key: dbKey,
          value: String(val),
        });
      }
    }
  }

  return getNotificationPreferences(hospitalId);
};

// ==============================================================
// 9. BUSINESS EVENT NOTIFICATION DISPATCHERS
// ==============================================================

export const dispatchAppointmentNotification = async (hospitalId, appointment, eventType = 'BOOKED') => {
  try {
    const prefs = await getNotificationPreferences(hospitalId);
    if (!prefs.appointmentEnabled) return null;

    if (!appointment.doctorId) return null;

    const titles = {
      BOOKED: 'New Appointment Booked',
      RESCHEDULED: 'Appointment Rescheduled',
      CANCELLED: 'Appointment Cancelled',
      CHECKED_IN: 'Patient Checked In',
    };

    return createNotification(hospitalId, {
      recipientUserId: appointment.doctorId,
      patientId: appointment.patientId,
      type: 'APPOINTMENT',
      title: titles[eventType] || 'Appointment Update',
      message: `Appointment #${appointment.appointmentNumber || ''} is ${eventType.toLowerCase()} for date ${appointment.appointmentDate || ''}`,
      priority: eventType === 'CANCELLED' ? 'HIGH' : 'NORMAL',
      entityType: 'APPOINTMENT',
      entityId: appointment.id,
    });
  } catch {
    return null;
  }
};

export const dispatchLabResultNotification = async (hospitalId, order, isCritical = false) => {
  try {
    const prefs = await getNotificationPreferences(hospitalId);
    if (!prefs.labEnabled) return null;

    if (!order.doctorId) return null;

    return createNotification(hospitalId, {
      recipientUserId: order.doctorId,
      patientId: order.patientId,
      type: 'LAB_RESULT',
      title: isCritical ? 'CRITICAL Laboratory Result' : 'Lab Result Available',
      message: `Investigation results for "${order.investigationName || 'Test'}" (Order #${order.orderNumber || ''}) are finalized.${isCritical ? ' Attention required: Abnormal flag detected.' : ''}`,
      priority: isCritical ? 'URGENT' : 'NORMAL',
      entityType: 'LAB_ORDER',
      entityId: order.id,
    });
  } catch {
    return null;
  }
};

export const dispatchPharmacyDispensingNotification = async (hospitalId, dispensing, eventType = 'FULLY_DISPENSED') => {
  try {
    const prefs = await getNotificationPreferences(hospitalId);
    if (!prefs.pharmacyEnabled) return null;

    // Notify prescribing doctor if prescription has doctorId
    const doctorId = dispensing.prescription?.doctorId;
    if (!doctorId) return null;

    return createNotification(hospitalId, {
      recipientUserId: doctorId,
      patientId: dispensing.patientId,
      type: 'PHARMACY',
      title: 'Prescription Medication Dispensed',
      message: `Prescription #${dispensing.prescription?.prescriptionNumber || ''} has been ${eventType.toLowerCase().replace('_', ' ')}.`,
      priority: 'NORMAL',
      entityType: 'PRESCRIPTION',
      entityId: dispensing.prescriptionId,
    });
  } catch {
    return null;
  }
};

export const dispatchBillingNotification = async (hospitalId, recipientUserId, invoiceOrPayment, eventType = 'INVOICE_ISSUED') => {
  try {
    const prefs = await getNotificationPreferences(hospitalId);
    if (!prefs.billingEnabled) return null;

    if (!recipientUserId) return null;

    const isPayment = eventType === 'PAYMENT_RECEIVED';
    return createNotification(hospitalId, {
      recipientUserId,
      patientId: invoiceOrPayment.patientId,
      type: isPayment ? 'PAYMENT' : 'BILLING',
      title: isPayment ? 'Payment Received' : 'New Invoice Issued',
      message: isPayment
        ? `Payment #${invoiceOrPayment.paymentNumber || ''} of ₹${invoiceOrPayment.amount || ''} collected successfully.`
        : `Invoice #${invoiceOrPayment.invoiceNumber || ''} for total ₹${invoiceOrPayment.totalAmount || ''} has been issued.`,
      priority: 'NORMAL',
      entityType: isPayment ? 'PAYMENT' : 'INVOICE',
      entityId: invoiceOrPayment.id,
    });
  } catch {
    return null;
  }
};

export const dispatchIpdNotification = async (hospitalId, admission, eventType = 'ADMITTED') => {
  try {
    const prefs = await getNotificationPreferences(hospitalId);
    if (!prefs.ipdEnabled) return null;

    if (!admission.admittingDoctorId) return null;

    const titles = {
      ADMITTED: 'New IPD Admission',
      TRANSFERRED: 'Inpatient Bed Transferred',
      DISCHARGE_PENDING: 'Discharge Summary Pending',
      DISCHARGED: 'Inpatient Discharged',
    };

    return createNotification(hospitalId, {
      recipientUserId: admission.admittingDoctorId,
      patientId: admission.patientId,
      type: eventType === 'DISCHARGED' ? 'DISCHARGE' : 'IPD',
      title: titles[eventType] || 'Inpatient Status Update',
      message: `Admission #${admission.admissionNumber || ''} status updated to ${eventType.toLowerCase().replace('_', ' ')}.`,
      priority: eventType === 'DISCHARGE_PENDING' ? 'HIGH' : 'NORMAL',
      entityType: 'IPD_ADMISSION',
      entityId: admission.id,
    });
  } catch {
    return null;
  }
};

export const dispatchEecpNotification = async (hospitalId, session, _eventType = 'COMPLETED') => {
  try {
    const prefs = await getNotificationPreferences(hospitalId);
    if (!prefs.eecpEnabled) return null;

    const doctorId = session.doctorId || session.course?.doctorId;
    if (!doctorId) return null;

    return createNotification(hospitalId, {
      recipientUserId: doctorId,
      patientId: session.patientId,
      type: 'EECP',
      title: 'EECP Session Completed',
      message: `EECP Session #${session.sessionNumber || ''} completed on ${session.scheduledDate || ''}.`,
      priority: 'NORMAL',
      entityType: 'EECP_SESSION',
      entityId: session.id,
    });
  } catch {
    return null;
  }
};

export const notifyAppointmentEvent = async (hospitalId, eventType, payload = {}) => {
  const prefs = await getNotificationPreferences(hospitalId);
  if (!prefs.appointmentEnabled) return [];

  const created = [];
  if (payload.doctorId) {
    try {
      const n = await createNotification(hospitalId, {
        recipientUserId: payload.doctorId,
        patientId: payload.patientId,
        type: 'APPOINTMENT',
        title: `Appointment ${eventType}`,
        message: `Appointment ${payload.appointmentNumber || ''} for ${payload.patientName || 'patient'} is ${eventType.toLowerCase()}.`,
        priority: eventType === 'CANCELLED' ? 'HIGH' : 'NORMAL',
        entityType: 'APPOINTMENT',
        entityId: payload.appointmentId || payload.id,
      });
      if (n) created.push(n);
    } catch {
      // Continue safely
    }
  }

  const recepNotifs = await notifyRole(hospitalId, 'RECEPTIONIST', {
    patientId: payload.patientId,
    type: 'APPOINTMENT',
    title: `Appointment ${eventType}`,
    message: `Appointment ${payload.appointmentNumber || ''} for ${payload.patientName || 'patient'} is ${eventType.toLowerCase()}.`,
    priority: 'NORMAL',
    entityType: 'APPOINTMENT',
    entityId: payload.appointmentId || payload.id,
  });

  return [...created, ...recepNotifs];
};

export const notifyLabEvent = async (hospitalId, eventType, payload = {}) => {
  const prefs = await getNotificationPreferences(hospitalId);
  if (!prefs.labEnabled) return [];

  const created = [];
  const isCritical = eventType === 'CRITICAL';

  if (payload.orderingDoctorId) {
    try {
      const n = await createNotification(hospitalId, {
        recipientUserId: payload.orderingDoctorId,
        patientId: payload.patientId,
        type: 'LAB_RESULT',
        title: isCritical ? 'CRITICAL Laboratory Result' : 'Lab Result Available',
        message: `Lab investigation "${payload.testName || 'Investigation'}" (Order #${payload.orderNumber || ''}) is ${eventType.toLowerCase()}.`,
        priority: isCritical ? 'URGENT' : 'NORMAL',
        entityType: 'LAB_ORDER',
        entityId: payload.orderId || payload.id,
      });
      if (n) created.push(n);
    } catch {
      // Continue safely
    }
  }

  const labStaffNotifs = await notifyRole(hospitalId, 'LAB_STAFF', {
    patientId: payload.patientId,
    type: 'LAB_RESULT',
    title: isCritical ? 'Critical Investigation Flagged' : 'Investigation Status Updated',
    message: `Order #${payload.orderNumber || ''} (${payload.testName || 'Test'}) status updated: ${eventType}.`,
    priority: isCritical ? 'HIGH' : 'LOW',
    entityType: 'LAB_ORDER',
    entityId: payload.orderId || payload.id,
  });

  return [...created, ...labStaffNotifs];
};

export const notifyPharmacyEvent = async (hospitalId, eventType, payload = {}) => {
  const prefs = await getNotificationPreferences(hospitalId);
  if (!prefs.pharmacyEnabled) return [];

  const created = [];
  if (payload.prescribingDoctorId) {
    try {
      const n = await createNotification(hospitalId, {
        recipientUserId: payload.prescribingDoctorId,
        patientId: payload.patientId,
        type: 'PHARMACY',
        title: 'Prescription Dispensing Update',
        message: `Prescription #${payload.prescriptionNumber || ''} for ${payload.patientName || 'patient'} is ${eventType.toLowerCase()}.`,
        priority: 'NORMAL',
        entityType: 'PRESCRIPTION',
        entityId: payload.prescriptionId || payload.id,
      });
      if (n) created.push(n);
    } catch {
      // Continue safely
    }
  }

  const pharmNotifs = await notifyRole(hospitalId, 'PHARMACIST', {
    patientId: payload.patientId,
    type: 'PHARMACY',
    title: 'Pharmacy Dispensing Notification',
    message: `Prescription #${payload.prescriptionNumber || ''} marked as ${eventType}.`,
    priority: 'LOW',
    entityType: 'PRESCRIPTION',
    entityId: payload.prescriptionId || payload.id,
  });

  return [...created, ...pharmNotifs];
};

export const notifyBillingEvent = async (hospitalId, eventType, payload = {}) => {
  const prefs = await getNotificationPreferences(hospitalId);
  if (!prefs.billingEnabled) return [];

  const adminNotifs = await notifyRole(hospitalId, 'HOSPITAL_ADMIN', {
    patientId: payload.patientId,
    type: 'BILLING',
    title: eventType === 'PAYMENT_RECEIVED' ? 'Payment Received' : 'Invoice Issued',
    message: `Amount ${payload.amount ? payload.amount : ''} received for ${payload.invoiceNumber || 'Invoice'}.`,
    priority: 'NORMAL',
    entityType: 'INVOICE',
    entityId: payload.invoiceId || payload.id,
  });

  return adminNotifs;
};

export const notifyIpdEvent = async (hospitalId, eventType, payload = {}) => {
  const prefs = await getNotificationPreferences(hospitalId);
  if (!prefs.ipdEnabled) return [];

  const created = [];
  if (payload.attendingDoctorId) {
    try {
      const n = await createNotification(hospitalId, {
        recipientUserId: payload.attendingDoctorId,
        patientId: payload.patientId,
        type: 'IPD',
        title: `Inpatient Admission: ${eventType}`,
        message: `Patient ${payload.patientName || ''} admission #${payload.admissionNumber || ''} status: ${eventType}.`,
        priority: eventType === 'DISCHARGE_PENDING' ? 'HIGH' : 'NORMAL',
        entityType: 'IPD_ADMISSION',
        entityId: payload.admissionId || payload.id,
      });
      if (n) created.push(n);
    } catch {
      // Continue safely
    }
  }

  const nurseNotifs = await notifyRole(hospitalId, 'NURSE', {
    patientId: payload.patientId,
    type: 'IPD',
    title: `Ward Update: ${eventType}`,
    message: `Admission #${payload.admissionNumber || ''} in ${payload.wardName || 'Ward'}${payload.bedNumber ? ` Bed ${payload.bedNumber}` : ''}: ${eventType}.`,
    priority: 'NORMAL',
    entityType: 'IPD_ADMISSION',
    entityId: payload.admissionId || payload.id,
  });

  return [...created, ...nurseNotifs];
};

export const notifyEecpEvent = async (hospitalId, eventType, payload = {}) => {
  const prefs = await getNotificationPreferences(hospitalId);
  if (!prefs.eecpEnabled) return [];

  const created = [];
  if (payload.attendingDoctorId) {
    try {
      const n = await createNotification(hospitalId, {
        recipientUserId: payload.attendingDoctorId,
        patientId: payload.patientId,
        type: 'EECP',
        title: `EECP Treatment: ${eventType}`,
        message: `Course #${payload.courseNumber || ''} for ${payload.patientName || 'patient'}: session ${payload.sessionNumber || ''} of ${payload.totalSessions || ''} ${eventType.toLowerCase().replace('_', ' ')}.`,
        priority: 'NORMAL',
        entityType: 'EECP_COURSE',
        entityId: payload.courseId || payload.id,
      });
      if (n) created.push(n);
    } catch {
      // Continue safely
    }
  }

  return created;
};

export default {
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITIES,
  createNotification,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  notifyRole,
  getNotificationPreferences,
  updateNotificationPreferences,
  dispatchAppointmentNotification,
  dispatchLabResultNotification,
  dispatchPharmacyDispensingNotification,
  dispatchBillingNotification,
  dispatchIpdNotification,
  dispatchEecpNotification,
  notifyAppointmentEvent,
  notifyLabEvent,
  notifyPharmacyEvent,
  notifyBillingEvent,
  notifyIpdEvent,
  notifyEecpEvent,
};

