import hospitalAdminService from '../services/hospitalAdmin.service.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

/**
 * GET /api/hospital-admin/dashboard
 * Retrieve hospital-scoped patient and staff statistics along with hospital branding
 */
export const getDashboard = async (req, res, next) => {
  try {
    const data = await hospitalAdminService.getHospitalDashboardStats(req.user.hospitalId);
    return successResponse(res, 'Hospital dashboard statistics retrieved successfully', data, 200);
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/hospital-admin/settings
 * Retrieve hospital configuration, profile, and settings map
 */
export const getSettings = async (req, res, next) => {
  try {
    const data = await hospitalAdminService.getHospitalSettings(req.user.hospitalId);
    return successResponse(res, 'Hospital configuration retrieved successfully', data);
  } catch (error) {
    if (error.statusCode) return errorResponse(res, error.message, error.statusCode);
    return next(error);
  }
};

/**
 * PATCH /api/hospital-admin/settings/profile
 * Update hospital profile
 */
export const updateProfile = async (req, res, next) => {
  try {
    const data = await hospitalAdminService.updateHospitalProfile(req.user.hospitalId, req.body);
    return successResponse(res, 'Hospital profile updated successfully', data);
  } catch (error) {
    if (error.statusCode) return errorResponse(res, error.message, error.statusCode);
    return next(error);
  }
};

/**
 * PUT /api/hospital-admin/settings/patient-config
 * Update patient settings (e.g. uhid_prefix)
 */
export const updatePatientConfig = async (req, res, next) => {
  try {
    const { uhid_prefix, patient_starting_number } = req.body;
    const settingsMap = {};
    if (uhid_prefix !== undefined) settingsMap.uhid_prefix = String(uhid_prefix).trim().toUpperCase();
    if (patient_starting_number !== undefined) settingsMap.patient_starting_number = String(patient_starting_number).trim();

    const data = await hospitalAdminService.updateHospitalSettingsMap(req.user.hospitalId, settingsMap);
    return successResponse(res, 'Patient configuration updated successfully', data);
  } catch (error) {
    if (error.statusCode) return errorResponse(res, error.message, error.statusCode);
    return next(error);
  }
};

/**
 * PUT /api/hospital-admin/settings/billing-config
 * Update billing configuration (tax, prefix, numbering, etc.)
 */
export const updateBillingConfig = async (req, res, next) => {
  try {
    const allowedKeys = [
      'billing_tax_enabled',
      'billing_tax_rate',
      'billing_invoice_prefix',
      'billing_receipt_prefix',
      'billing_invoice_numbering',
      'billing_currency',
      'billing_notes',
      'billing_payment_terms',
    ];

    const settingsMap = {};
    for (const key of allowedKeys) {
      if (req.body[key] !== undefined) {
        settingsMap[key] = req.body[key];
      }
    }

    const data = await hospitalAdminService.updateHospitalSettingsMap(req.user.hospitalId, settingsMap);
    return successResponse(res, 'Billing configuration updated successfully', data);
  } catch (error) {
    if (error.statusCode) return errorResponse(res, error.message, error.statusCode);
    return next(error);
  }
};

/**
 * PUT /api/hospital-admin/settings/notification-config
 * Update notification configurations
 */
export const updateNotificationConfig = async (req, res, next) => {
  try {
    const allowedKeys = [
      'notify_appointment_reminders',
      'notify_followup_reminders',
      'notify_payment_reminders',
      'notify_eecp_reminders',
      'notify_email_enabled',
      'notify_sms_enabled',
    ];

    const settingsMap = {};
    for (const key of allowedKeys) {
      if (req.body[key] !== undefined) {
        settingsMap[key] = req.body[key];
      }
    }

    const data = await hospitalAdminService.updateHospitalSettingsMap(req.user.hospitalId, settingsMap);
    return successResponse(res, 'Notification configuration updated successfully', data);
  } catch (error) {
    if (error.statusCode) return errorResponse(res, error.message, error.statusCode);
    return next(error);
  }
};

export default {
  getDashboard,
  getSettings,
  updateProfile,
  updatePatientConfig,
  updateBillingConfig,
  updateNotificationConfig,
};
