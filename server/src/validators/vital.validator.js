import { errorResponse } from '../utils/apiResponse.js';

export const validateCreateVital = (req, res, next) => {
  const {
    temperature,
    pulseRate,
    respiratoryRate,
    systolicBp,
    diastolicBp,
    spo2,
    weightKg,
    heightCm,
    bloodGlucose,
    painScore,
  } = req.body;

  const errors = {};

  if (temperature !== undefined && temperature !== null && temperature !== '') {
    const val = Number(temperature);
    if (isNaN(val) || val < 70 || val > 115) {
      errors.temperature = 'Temperature must be between 70°F and 115°F';
    }
  }

  if (pulseRate !== undefined && pulseRate !== null && pulseRate !== '') {
    const val = Number(pulseRate);
    if (isNaN(val) || val < 20 || val > 300) {
      errors.pulseRate = 'Pulse rate must be between 20 and 300 bpm';
    }
  }

  if (respiratoryRate !== undefined && respiratoryRate !== null && respiratoryRate !== '') {
    const val = Number(respiratoryRate);
    if (isNaN(val) || val < 5 || val > 100) {
      errors.respiratoryRate = 'Respiratory rate must be between 5 and 100 breaths/min';
    }
  }

  if (systolicBp !== undefined && systolicBp !== null && systolicBp !== '') {
    const val = Number(systolicBp);
    if (isNaN(val) || val < 40 || val > 300) {
      errors.systolicBp = 'Systolic BP must be between 40 and 300 mmHg';
    }
  }

  if (diastolicBp !== undefined && diastolicBp !== null && diastolicBp !== '') {
    const val = Number(diastolicBp);
    if (isNaN(val) || val < 20 || val > 200) {
      errors.diastolicBp = 'Diastolic BP must be between 20 and 200 mmHg';
    }
  }

  if (spo2 !== undefined && spo2 !== null && spo2 !== '') {
    const val = Number(spo2);
    if (isNaN(val) || val < 0 || val > 100) {
      errors.spo2 = 'SpO2 must be between 0% and 100%';
    }
  }

  if (weightKg !== undefined && weightKg !== null && weightKg !== '') {
    const val = Number(weightKg);
    if (isNaN(val) || val <= 0 || val > 500) {
      errors.weightKg = 'Weight must be greater than 0 and less than 500 kg';
    }
  }

  if (heightCm !== undefined && heightCm !== null && heightCm !== '') {
    const val = Number(heightCm);
    if (isNaN(val) || val <= 0 || val > 300) {
      errors.heightCm = 'Height must be between 1 and 300 cm';
    }
  }

  if (bloodGlucose !== undefined && bloodGlucose !== null && bloodGlucose !== '') {
    const val = Number(bloodGlucose);
    if (isNaN(val) || val < 10 || val > 1000) {
      errors.bloodGlucose = 'Blood glucose must be between 10 and 1000 mg/dL';
    }
  }

  if (painScore !== undefined && painScore !== null && painScore !== '') {
    const val = Number(painScore);
    if (isNaN(val) || val < 0 || val > 10) {
      errors.painScore = 'Pain score must be between 0 and 10';
    }
  }

  if (Object.keys(errors).length > 0) {
    return errorResponse(res, 'Validation error: Please check the highlighted vital signs.', 400, errors);
  }

  return next();
};

export default {
  validateCreateVital,
};
