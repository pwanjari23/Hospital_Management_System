import { Op } from 'sequelize';
import {
  Hospital,
  HospitalSetting,
  User,
  Patient,
  Prescription,
  PrescriptionItem,
  Medicine,
  InvestigationOrder,
  InvestigationResult,
  Invoice,
  InvoiceItem,
  Receipt,
  Payment,
  PaymentMode,
  Appointment,
  Department,
  IpdAdmission,
  DischargeSummary,
  DischargeMedication,
  Ward,
  Bed,
  EecpTreatmentCourse,
  EecpPackage,
  EecpSession,
} from '../models/index.js';

export const DOCUMENT_TYPES = [
  'PRESCRIPTION',
  'LAB_REPORT',
  'INVOICE',
  'RECEIPT',
  'APPOINTMENT_SLIP',
  'DISCHARGE_SUMMARY',
  'EECP_SUMMARY',
];

/**
 * 1. Retrieve tenant hospital branding details
 */
export const getHospitalBranding = async (hospitalId) => {
  const hospital = await Hospital.findByPk(hospitalId, {
    attributes: [
      'id',
      'name',
      'slug',
      'email',
      'phone',
      'alternatePhone',
      'address',
      'city',
      'state',
      'country',
      'postalCode',
      'logoUrl',
      'website',
      'workingHours',
      'currency',
      'timezone',
    ],
  });

  if (!hospital) {
    const error = new Error('Hospital not found');
    error.statusCode = 404;
    throw error;
  }

  const settings = await HospitalSetting.findAll({
    where: {
      hospitalId,
      key: { [Op.like]: 'branding.%' },
    },
  });

  const customBranding = {
    headerText: '',
    footerText: '',
    tagline: '',
    regNumber: '',
  };

  settings.forEach((s) => {
    const prop = s.key.replace('branding.', '');
    if (prop === 'header_text') customBranding.headerText = s.value || '';
    if (prop === 'footer_text') customBranding.footerText = s.value || '';
    if (prop === 'tagline') customBranding.tagline = s.value || '';
    if (prop === 'reg_number') customBranding.regNumber = s.value || '';
  });

  return {
    hospitalId: hospital.id,
    hospitalName: hospital.name,
    email: hospital.email,
    phone: hospital.phone,
    alternatePhone: hospital.alternatePhone,
    address: hospital.address,
    city: hospital.city,
    state: hospital.state,
    country: hospital.country,
    postalCode: hospital.postalCode,
    logoUrl: hospital.logoUrl,
    website: hospital.website,
    currency: hospital.currency || 'INR',
    ...customBranding,
  };
};

/**
 * 2. Update tenant hospital branding
 */
export const updateHospitalBranding = async (hospitalId, brandingData) => {
  const hospital = await Hospital.findByPk(hospitalId);
  if (!hospital) {
    const error = new Error('Hospital not found');
    error.statusCode = 404;
    throw error;
  }

  // Update Hospital base fields if supplied
  const baseFields = {};
  if (brandingData.hospitalName !== undefined) baseFields.name = brandingData.hospitalName.trim();
  if (brandingData.email !== undefined) baseFields.email = brandingData.email ? brandingData.email.trim() : null;
  if (brandingData.phone !== undefined) baseFields.phone = brandingData.phone ? brandingData.phone.trim() : null;
  if (brandingData.alternatePhone !== undefined) baseFields.alternatePhone = brandingData.alternatePhone;
  if (brandingData.address !== undefined) baseFields.address = brandingData.address;
  if (brandingData.city !== undefined) baseFields.city = brandingData.city;
  if (brandingData.state !== undefined) baseFields.state = brandingData.state;
  if (brandingData.postalCode !== undefined) baseFields.postalCode = brandingData.postalCode;
  if (brandingData.logoUrl !== undefined) baseFields.logoUrl = brandingData.logoUrl;
  if (brandingData.website !== undefined) baseFields.website = brandingData.website;

  if (Object.keys(baseFields).length > 0) {
    await hospital.update(baseFields);
  }

  // Update custom branding settings
  const customMap = {
    headerText: 'branding.header_text',
    footerText: 'branding.footer_text',
    tagline: 'branding.tagline',
    regNumber: 'branding.reg_number',
  };

  for (const [prop, dbKey] of Object.entries(customMap)) {
    if (brandingData[prop] !== undefined) {
      const val = String(brandingData[prop] || '');
      const existing = await HospitalSetting.findOne({
        where: { hospitalId, key: dbKey },
      });
      if (existing) {
        await existing.update({ value: val });
      } else {
        await HospitalSetting.create({
          hospitalId,
          key: dbKey,
          value: val,
        });
      }
    }
  }

  return getHospitalBranding(hospitalId);
};

/**
 * 3. Fetch structured, authoritative printable document data
 */
export const getDocumentData = async (hospitalId, documentType, entityId, _userRole = 'HOSPITAL_ADMIN') => {
  const branding = await getHospitalBranding(hospitalId);
  const normalizedType = documentType.toUpperCase();

  switch (normalizedType) {
    case 'PRESCRIPTION': {
      const rx = await Prescription.findOne({
        where: { id: entityId, hospitalId },
        include: [
          {
            model: Patient,
            as: 'patient',
            attributes: ['id', 'uhid', 'firstName', 'middleName', 'lastName', 'gender', 'dateOfBirth', 'phone', 'bloodGroup', 'allergies'],
          },
          {
            model: User,
            as: 'doctor',
            attributes: ['id', 'name', 'specialization', 'qualification', 'licenseNumber'],
            include: [{ model: Department, as: 'department', attributes: ['id', 'name'] }],
          },
          {
            model: PrescriptionItem,
            as: 'items',
            include: [{ model: Medicine, as: 'medicine', attributes: ['id', 'name', 'dosageForm', 'strength', 'category'] }],
          },
        ],
      });

      if (!rx) {
        const error = new Error('Prescription document not found');
        error.statusCode = 404;
        throw error;
      }

      return {
        documentType: 'PRESCRIPTION',
        title: 'Medical Prescription',
        branding,
        meta: {
          prescriptionNumber: rx.prescriptionNumber,
          date: rx.prescribedAt || rx.createdAt,
          status: rx.status,
          notes: rx.notes,
        },
        patient: rx.patient,
        doctor: rx.doctor,
        items: (rx.items || []).map((item) => ({
          medicineName: item.medicine?.name || item.medicineName || item.customMedicineName || 'Medicine',
          dosageForm: item.medicine?.dosageForm || 'Tablet',
          dosage: item.dosage,
          frequency: item.frequency,
          durationDays: item.durationValue || item.durationDays,
          instructions: item.instructions || item.foodInstruction,
          quantity: item.quantity,
        })),
        generatedAt: new Date(),
      };
    }

    case 'LAB_REPORT': {
      const order = await InvestigationOrder.findOne({
        where: { id: entityId, hospitalId },
        include: [
          {
            model: Patient,
            as: 'patient',
            attributes: ['id', 'uhid', 'firstName', 'lastName', 'gender', 'dateOfBirth', 'phone'],
          },
          {
            model: User,
            as: 'doctor',
            attributes: ['id', 'name', 'specialization', 'qualification'],
          },
          {
            model: InvestigationResult,
            as: 'result',
          },
        ],
      });

      if (!order) {
        const error = new Error('Laboratory report document not found');
        error.statusCode = 404;
        throw error;
      }

      return {
        documentType: 'LAB_REPORT',
        title: 'Laboratory Diagnostic Report',
        branding,
        meta: {
          orderNumber: order.orderNumber,
          investigationName: order.investigationName,
          priority: order.priority,
          orderStatus: order.status,
          orderedAt: order.orderedAt,
        },
        patient: order.patient,
        doctor: order.doctor,
        results: order.result ? [{
          resultNumber: order.result.resultNumber,
          testName: order.result.investigationNameSnapshot || order.investigationName,
          resultValue: order.result.resultValue,
          resultUnit: order.result.resultUnit,
          referenceRange: order.result.referenceRange,
          abnormalFlag: order.result.abnormalFlag,
          interpretation: order.result.interpretation,
          observations: order.result.observations,
          verifiedAt: order.result.verifiedAt,
          status: order.result.status,
        }] : [],
        generatedAt: new Date(),
      };
    }

    case 'INVOICE': {
      const inv = await Invoice.findOne({
        where: { id: entityId, hospitalId },
        include: [
          {
            model: Patient,
            as: 'patient',
            attributes: ['id', 'uhid', 'firstName', 'lastName', 'phone', 'address', 'city'],
          },
          {
            model: InvoiceItem,
            as: 'items',
          },
          {
            model: Payment,
            as: 'payments',
            include: [{ model: PaymentMode, as: 'paymentMode', attributes: ['id', 'name', 'code'] }],
          },
        ],
      });

      if (!inv) {
        const error = new Error('Invoice document not found');
        error.statusCode = 404;
        throw error;
      }

      return {
        documentType: 'INVOICE',
        title: 'Tax Invoice & Hospital Bill',
        branding,
        meta: {
          invoiceNumber: inv.invoiceNumber,
          invoiceDate: inv.invoiceDate,
          status: inv.status,
          paymentStatus: inv.paymentStatus,
          notes: inv.notes,
        },
        patient: inv.patient,
        items: (inv.items || []).map((it) => ({
          description: it.description,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          taxPercentage: it.taxPercentage,
          discountAmount: it.discountAmount,
          lineTotal: it.lineTotal,
        })),
        financials: {
          subtotal: Number(inv.subtotal || 0),
          discountAmount: Number(inv.discountAmount || 0),
          taxAmount: Number(inv.taxAmount || 0),
          totalAmount: Number(inv.totalAmount || 0),
          paidAmount: Number(inv.paidAmount || 0),
          dueAmount: Number(inv.dueAmount || 0),
        },
        payments: (inv.payments || []).map((p) => ({
          paymentNumber: p.paymentNumber,
          paymentDate: p.paymentDate,
          amount: Number(p.amount || 0),
          paymentMode: p.paymentMode?.name || 'Cash',
          status: p.status,
        })),
        generatedAt: new Date(),
      };
    }

    case 'RECEIPT': {
      const receipt = await Receipt.findOne({
        where: { id: entityId, hospitalId },
        include: [
          {
            model: Patient,
            as: 'patient',
            attributes: ['id', 'uhid', 'firstName', 'lastName', 'phone'],
          },
          {
            model: Invoice,
            as: 'invoice',
            attributes: ['id', 'invoiceNumber', 'invoiceDate', 'totalAmount', 'dueAmount', 'paymentStatus'],
          },
          {
            model: Payment,
            as: 'payment',
            include: [{ model: PaymentMode, as: 'paymentMode', attributes: ['id', 'name', 'code'] }],
          },
          {
            model: User,
            as: 'generator',
            attributes: ['id', 'name'],
          },
        ],
      });

      if (!receipt) {
        const error = new Error('Receipt document not found');
        error.statusCode = 404;
        throw error;
      }

      return {
        documentType: 'RECEIPT',
        title: 'Payment Receipt',
        branding,
        meta: {
          receiptNumber: receipt.receiptNumber,
          receiptDate: receipt.receiptDate,
          paymentNumber: receipt.payment?.paymentNumber,
          invoiceNumber: receipt.invoice?.invoiceNumber,
          notes: receipt.notes,
        },
        patient: receipt.patient,
        paymentDetails: {
          amount: Number(receipt.amount || 0),
          paymentMode: receipt.payment?.paymentMode?.name || 'Cash',
          transactionReference: receipt.payment?.transactionReference || 'N/A',
          receivedBy: receipt.generator?.name || 'Authorized Staff',
          invoiceTotal: Number(receipt.invoice?.totalAmount || 0),
          remainingDue: Number(receipt.invoice?.dueAmount || 0),
        },
        generatedAt: new Date(),
      };
    }

    case 'APPOINTMENT_SLIP': {
      const appt = await Appointment.findOne({
        where: { id: entityId, hospitalId },
        include: [
          {
            model: Patient,
            as: 'patient',
            attributes: ['id', 'uhid', 'firstName', 'lastName', 'gender', 'dateOfBirth', 'phone'],
          },
          {
            model: User,
            as: 'doctor',
            attributes: ['id', 'name', 'specialization', 'qualification', 'consultationFee'],
          },
          {
            model: Department,
            as: 'department',
            attributes: ['id', 'name', 'code'],
          },
        ],
      });

      if (!appt) {
        const error = new Error('Appointment slip not found');
        error.statusCode = 404;
        throw error;
      }

      return {
        documentType: 'APPOINTMENT_SLIP',
        title: 'Appointment Confirmation Slip',
        branding,
        meta: {
          appointmentNumber: appt.appointmentNumber,
          appointmentDate: appt.appointmentDate,
          startTime: appt.startTime,
          endTime: appt.endTime,
          appointmentType: appt.appointmentType,
          status: appt.status,
          consultationFee: appt.consultationFee,
          paymentStatus: appt.paymentStatus,
          reason: appt.reason,
        },
        patient: appt.patient,
        doctor: appt.doctor,
        department: appt.department,
        generatedAt: new Date(),
      };
    }

    case 'DISCHARGE_SUMMARY': {
      // Find either by DischargeSummary ID or by admissionId
      const summary = await DischargeSummary.findOne({
        where: {
          hospitalId,
          [Op.or]: [{ id: entityId }, { admissionId: entityId }],
        },
        include: [
          {
            model: Patient,
            as: 'patient',
            attributes: ['id', 'uhid', 'firstName', 'lastName', 'gender', 'dateOfBirth', 'phone', 'bloodGroup'],
          },
          {
            model: User,
            as: 'dischargingDoctor',
            attributes: ['id', 'name', 'specialization', 'qualification'],
          },
          {
            model: IpdAdmission,
            as: 'admission',
            include: [
              { model: Ward, as: 'ward', attributes: ['id', 'wardName'] },
              { model: Bed, as: 'bed', attributes: ['id', 'bedNumber'] },
            ],
          },
          {
            model: DischargeMedication,
            as: 'medications',
            include: [{ model: Medicine, as: 'medicine', attributes: ['id', 'name', 'dosageForm', 'strength'] }],
          },
        ],
      });

      if (!summary) {
        const error = new Error('Discharge summary document not found');
        error.statusCode = 404;
        throw error;
      }

      return {
        documentType: 'DISCHARGE_SUMMARY',
        title: 'Inpatient Discharge Summary',
        branding,
        meta: {
          admissionNumber: summary.admission?.admissionNumber,
          admissionDate: summary.admission?.admissionDate,
          dischargeDate: summary.dischargeDate || summary.admission?.dischargedAt,
          dischargeType: summary.dischargeType,
          status: summary.status,
          wardName: summary.admission?.ward?.wardName || 'Ward',
          bedNumber: summary.admission?.bed?.bedNumber || 'Bed',
        },
        patient: summary.patient,
        doctor: summary.dischargingDoctor || summary.doctor,
        clinicalDetails: {
          diagnosisAtAdmission: summary.diagnosisAtAdmission,
          finalDiagnosis: summary.finalDiagnosis,
          hospitalCourse: summary.hospitalCourse,
          investigationsSummary: summary.investigationsSummary,
          proceduresPerformed: summary.proceduresPerformed,
          conditionAtDischarge: summary.conditionAtDischarge,
          dischargeInstructions: summary.dischargeInstructions,
          dietaryAdvice: summary.dietaryAdvice,
          activityRestrictions: summary.activityRestrictions,
          followUpInstructions: summary.followUpInstructions,
          followUpDate: summary.followUpDate,
        },
        medications: (summary.medications || []).map((m) => ({
          medicineName: m.medicine?.name || m.medicineName || 'Medicine',
          dosage: m.dosage,
          frequency: m.frequency,
          durationDays: m.durationDays,
          instructions: m.instructions,
        })),
        generatedAt: new Date(),
      };
    }

    case 'EECP_SUMMARY': {
      const course = await EecpTreatmentCourse.findOne({
        where: { id: entityId, hospitalId },
        include: [
          {
            model: Patient,
            as: 'patient',
            attributes: ['id', 'uhid', 'firstName', 'lastName', 'gender', 'dateOfBirth', 'phone'],
          },
          {
            model: User,
            as: 'doctor',
            attributes: ['id', 'name', 'specialization'],
          },
          {
            model: EecpPackage,
            as: 'package',
            attributes: ['id', 'name', 'numberOfSessions'],
          },
        ],
      });

      if (!course) {
        const error = new Error('EECP therapy summary document not found');
        error.statusCode = 404;
        throw error;
      }

      const sessionsCount = await EecpSession.count({
        where: { courseId: course.id, hospitalId, status: 'COMPLETED' },
      });

      return {
        documentType: 'EECP_SUMMARY',
        title: 'EECP Therapy Course Summary',
        branding,
        meta: {
          courseNumber: course.courseNumber,
          startDate: course.startDate,
          endDate: course.endDate,
          status: course.status,
          packageName: course.package?.name || 'Standard EECP Course',
          plannedSessions: course.plannedSessions || course.package?.numberOfSessions || 35,
          completedSessions: sessionsCount,
          treatmentPlan: course.treatmentPlan,
        },
        patient: course.patient,
        doctor: course.doctor,
        generatedAt: new Date(),
      };
    }

    default: {
      const error = new Error(`Unsupported document type: ${documentType}`);
      error.statusCode = 400;
      throw error;
    }
  }
};

export default {
  DOCUMENT_TYPES,
  getHospitalBranding,
  updateHospitalBranding,
  getDocumentData,
};
