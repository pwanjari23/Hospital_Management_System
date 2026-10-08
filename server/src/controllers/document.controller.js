import * as documentService from '../services/document.service.js';
import { sendSuccess } from '../utils/apiResponse.js';

const ROLE_PERMISSIONS_MAP = {
  PRESCRIPTION: ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'PHARMACIST', 'NURSE'],
  LAB_REPORT: ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'LAB_STAFF', 'NURSE'],
  INVOICE: ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'RECEPTIONIST', 'BILLING'],
  RECEIPT: ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'RECEPTIONIST', 'BILLING'],
  APPOINTMENT_SLIP: ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'RECEPTIONIST', 'DOCTOR', 'NURSE'],
  DISCHARGE_SUMMARY: ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'NURSE'],
  EECP_SUMMARY: ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'DOCTOR', 'NURSE'],
};

export const getDocument = async (req, res, next) => {
  try {
    const hospitalId = req.user.hospitalId;
    const userRole = req.user.role;
    const { type, id } = req.params;

    const normalizedType = String(type).toUpperCase();
    const allowedRoles = ROLE_PERMISSIONS_MAP[normalizedType];

    if (allowedRoles && !allowedRoles.includes(userRole)) {
      const error = new Error(`Role ${userRole} is not authorized to view ${normalizedType} documents`);
      error.statusCode = 403;
      throw error;
    }

    const documentData = await documentService.getDocumentData(hospitalId, normalizedType, id, userRole);
    return sendSuccess(res, documentData, 'Document data retrieved successfully');
  } catch (err) {
    next(err);
  }
};

export const getBranding = async (req, res, next) => {
  try {
    const hospitalId = req.user.hospitalId;
    const branding = await documentService.getHospitalBranding(hospitalId);
    return sendSuccess(res, branding, 'Hospital branding retrieved successfully');
  } catch (err) {
    next(err);
  }
};

export const updateBranding = async (req, res, next) => {
  try {
    const hospitalId = req.user.hospitalId;
    const userRole = req.user.role;

    if (!['SUPER_ADMIN', 'HOSPITAL_ADMIN'].includes(userRole)) {
      const error = new Error('Only Hospital Administrators can update branding settings');
      error.statusCode = 403;
      throw error;
    }

    const updated = await documentService.updateHospitalBranding(hospitalId, req.body);
    return sendSuccess(res, updated, 'Hospital branding updated successfully');
  } catch (err) {
    next(err);
  }
};
