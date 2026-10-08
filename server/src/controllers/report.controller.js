import reportService from '../services/report.service.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

export const getDashboardMetrics = async (req, res, next) => {
  try {
    const metrics = await reportService.getHospitalDashboardMetrics(
      req.user.hospitalId,
      req.query
    );
    return successResponse(res, 'Hospital analytics metrics retrieved successfully', metrics);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export const getPatientReport = async (req, res, next) => {
  try {
    const report = await reportService.getPatientReport(
      req.user.hospitalId,
      req.query
    );
    return successResponse(res, 'Patient report retrieved successfully', report);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export const getAppointmentReport = async (req, res, next) => {
  try {
    const report = await reportService.getAppointmentReport(
      req.user.hospitalId,
      req.query
    );
    return successResponse(res, 'Appointment report retrieved successfully', report);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export const getOpdReport = async (req, res, next) => {
  try {
    const report = await reportService.getOpdReport(
      req.user.hospitalId,
      req.query
    );
    return successResponse(res, 'OPD consultation report retrieved successfully', report);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export const getDoctorPerformanceReport = async (req, res, next) => {
  try {
    const report = await reportService.getDoctorPerformanceReport(
      req.user.hospitalId,
      req.query
    );
    return successResponse(res, 'Doctor operational report retrieved successfully', report);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export const getDepartmentReport = async (req, res, next) => {
  try {
    const report = await reportService.getDepartmentReport(
      req.user.hospitalId,
      req.query
    );
    return successResponse(res, 'Department activity report retrieved successfully', report);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export const getIpdReport = async (req, res, next) => {
  try {
    const report = await reportService.getIpdReport(
      req.user.hospitalId,
      req.query
    );
    return successResponse(res, 'IPD occupancy and admissions report retrieved successfully', report);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export const getPharmacyReport = async (req, res, next) => {
  try {
    const report = await reportService.getPharmacyReport(
      req.user.hospitalId,
      req.query
    );
    return successResponse(res, 'Pharmacy inventory and dispensing report retrieved successfully', report);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export const getLaboratoryReport = async (req, res, next) => {
  try {
    const report = await reportService.getLaboratoryReport(
      req.user.hospitalId,
      req.query
    );
    return successResponse(res, 'Laboratory diagnostics report retrieved successfully', report);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export const getEecpReport = async (req, res, next) => {
  try {
    const report = await reportService.getEecpReport(
      req.user.hospitalId,
      req.query
    );
    return successResponse(res, 'EECP clinical report retrieved successfully', report);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export const getBillingReport = async (req, res, next) => {
  try {
    const report = await reportService.getBillingReport(
      req.user.hospitalId,
      req.query
    );
    return successResponse(res, 'Billing and revenue report retrieved successfully', report);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export const exportReportCsv = async (req, res, next) => {
  try {
    const { reportType } = req.params;
    let data;

    switch (reportType) {
      case 'patients':
        data = await reportService.getPatientReport(req.user.hospitalId, { ...req.query, limit: 1000 });
        break;
      case 'appointments':
        data = await reportService.getAppointmentReport(req.user.hospitalId, { ...req.query, limit: 1000 });
        break;
      case 'ipd':
        data = await reportService.getIpdReport(req.user.hospitalId, { ...req.query, limit: 1000 });
        break;
      case 'billing':
        data = await reportService.getBillingReport(req.user.hospitalId, { ...req.query, limit: 1000 });
        break;
      default: {
        return errorResponse(res, `Export not supported for report type: ${reportType}`, 400);
      }
    }

    const csvContent = reportService.exportReportToCsv(reportType, data);
    const filename = `${reportType}-report-${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csvContent);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    return next(error);
  }
};

export default {
  getDashboardMetrics,
  getPatientReport,
  getAppointmentReport,
  getOpdReport,
  getDoctorPerformanceReport,
  getDepartmentReport,
  getIpdReport,
  getPharmacyReport,
  getLaboratoryReport,
  getEecpReport,
  getBillingReport,
  exportReportCsv,
};
