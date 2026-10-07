import {
  EecpAssessment,
  EecpTreatmentCourse,
  EecpSession,
  EecpSessionReading,
  EecpPackage,
  Patient,
  Encounter,
  User,
  HospitalSequence,
  HospitalSetting,
} from '../models/index.js';
import withTransaction from '../utils/transaction.js';
import { Op } from 'sequelize';

/**
 * Concurrency-safe atomic Course Number generator using PostgreSQL row lock
 */
export const generateNextCourseNumber = async (hospitalId, t) => {
  let seq = await HospitalSequence.findOne({
    where: { hospitalId, sequenceType: 'EECP_COURSE' },
    lock: t.LOCK.UPDATE,
    transaction: t,
  });

  if (!seq) {
    const customPrefixSetting = await HospitalSetting.findOne({
      where: { hospitalId, key: 'eecp_course_prefix' },
      transaction: t,
    });

    const prefix = customPrefixSetting?.value?.trim().toUpperCase() || 'EECP';

    try {
      seq = await HospitalSequence.create(
        {
          hospitalId,
          sequenceType: 'EECP_COURSE',
          prefix,
          lastValue: 0,
        },
        { transaction: t }
      );
    } catch {
      seq = await HospitalSequence.findOne({
        where: { hospitalId, sequenceType: 'EECP_COURSE' },
        lock: t.LOCK.UPDATE,
        transaction: t,
      });
    }
  }

  const nextVal = Number(seq.lastValue) + 1;
  await seq.update({ lastValue: nextVal }, { transaction: t });

  const currentYear = new Date().getFullYear();
  return `${seq.prefix}-${currentYear}-${String(nextVal).padStart(6, '0')}`;
};

// ==============================================================
// 1. EECP ASSESSMENTS
// ==============================================================

/**
 * Get EECP Assessment for a Clinical Encounter
 */
export const getEncounterAssessment = async (hospitalId, encounterId) => {
  const encounter = await Encounter.findOne({
    where: { id: encounterId, hospitalId },
  });

  if (!encounter) {
    const error = new Error('Clinical encounter not found');
    error.statusCode = 404;
    throw error;
  }

  const assessment = await EecpAssessment.findOne({
    where: { encounterId, hospitalId },
    include: [
      {
        model: Patient,
        as: 'patient',
        attributes: ['id', 'uhid', 'firstName', 'lastName', 'gender', 'dateOfBirth', 'allergies'],
      },
      {
        model: User,
        as: 'doctor',
        attributes: ['id', 'name', 'specialization'],
      },
    ],
  });

  return assessment;
};

/**
 * Create or Update EECP Assessment for Encounter
 */
export const upsertAssessment = async (hospitalId, encounterId, assessmentData, userId) => {
  return withTransaction(async (t) => {
    const encounter = await Encounter.findOne({
      where: { id: encounterId, hospitalId },
      transaction: t,
    });

    if (!encounter) {
      const error = new Error('Clinical encounter not found');
      error.statusCode = 404;
      throw error;
    }

    if (encounter.status === 'COMPLETED') {
      const error = new Error('Cannot modify EECP assessment of a completed encounter');
      error.statusCode = 400;
      throw error;
    }

    let assessment = await EecpAssessment.findOne({
      where: { encounterId, hospitalId },
      transaction: t,
    });

    const payload = {
      hospitalId,
      encounterId,
      patientId: encounter.patientId,
      doctorId: encounter.doctorId,
      indication: assessmentData.indication?.trim() || 'Refractory Angina / CAD',
      cardiacHistory: assessmentData.cardiacHistory?.trim() || null,
      previousInterventions: assessmentData.previousInterventions?.trim() || null,
      currentSymptoms: assessmentData.currentSymptoms?.trim() || null,
      functionalStatus: assessmentData.functionalStatus?.trim() || 'CCS Class II',
      suitabilityAssessment: assessmentData.suitabilityAssessment || 'SUITABLE',
      contraindicationNotes: assessmentData.contraindicationNotes?.trim() || null,
      recommendedSessions: Number(assessmentData.recommendedSessions) || 35,
      doctorNotes: assessmentData.doctorNotes?.trim() || null,
      updatedBy: userId || null,
    };

    if (assessment) {
      await assessment.update(payload, { transaction: t });
    } else {
      payload.createdBy = userId || null;
      assessment = await EecpAssessment.create(payload, { transaction: t });
    }

    return EecpAssessment.findOne({
      where: { id: assessment.id, hospitalId },
      include: [
        {
          model: Patient,
          as: 'patient',
          attributes: ['id', 'uhid', 'firstName', 'lastName', 'gender', 'dateOfBirth', 'allergies'],
        },
        {
          model: User,
          as: 'doctor',
          attributes: ['id', 'name', 'specialization'],
        },
      ],
      transaction: t,
    });
  });
};

// ==============================================================
// 2. EECP TREATMENT COURSES
// ==============================================================

/**
 * List EECP Treatment Courses with filtering and pagination
 */
export const getCourses = async (hospitalId, options = {}) => {
  const { patientId, doctorId, status, search, limit = 50, offset = 0 } = options;

  const where = { hospitalId };

  if (patientId) where.patientId = patientId;
  if (doctorId) where.doctorId = doctorId;
  if (status) where.status = status;

  if (search && search.trim()) {
    const s = `%${search.trim()}%`;
    where[Op.or] = [
      { courseNumber: { [Op.iLike]: s } },
      { treatmentPlan: { [Op.iLike]: s } },
      { notes: { [Op.iLike]: s } },
    ];
  }

  const { rows, count } = await EecpTreatmentCourse.findAndCountAll({
    where,
    include: [
      {
        model: Patient,
        as: 'patient',
        attributes: ['id', 'uhid', 'firstName', 'lastName', 'phone', 'gender', 'dateOfBirth'],
      },
      {
        model: User,
        as: 'doctor',
        attributes: ['id', 'name', 'specialization'],
      },
      {
        model: EecpPackage,
        as: 'package',
        attributes: ['id', 'name', 'numberOfSessions', 'sessionDuration', 'packagePrice'],
      },
    ],
    order: [['createdAt', 'DESC']],
    limit: Number(limit),
    offset: Number(offset),
  });

  return { courses: rows, total: count };
};

/**
 * Get Single Course by ID with sessions and details
 */
export const getCourseById = async (hospitalId, id, transaction = null) => {
  const course = await EecpTreatmentCourse.findOne({
    where: { id, hospitalId },
    transaction,
    include: [
      {
        model: Patient,
        as: 'patient',
        attributes: ['id', 'uhid', 'firstName', 'lastName', 'phone', 'gender', 'dateOfBirth', 'allergies'],
      },
      {
        model: User,
        as: 'doctor',
        attributes: ['id', 'name', 'specialization', 'phone'],
      },
      {
        model: EecpPackage,
        as: 'package',
        attributes: ['id', 'name', 'numberOfSessions', 'sessionDuration', 'packagePrice'],
      },
      {
        model: Encounter,
        as: 'initiatingEncounter',
        attributes: ['id', 'encounterNumber', 'encounterType', 'status'],
      },
      {
        model: EecpSession,
        as: 'sessions',
        include: [
          {
            model: User,
            as: 'staff',
            attributes: ['id', 'name'],
          },
        ],
        order: [['sessionNumber', 'ASC']],
      },
    ],
  });

  if (!course) {
    const error = new Error('EECP Treatment Course not found');
    error.statusCode = 404;
    throw error;
  }

  return course;
};

/**
 * Create a new EECP Treatment Course
 */
export const createCourse = async (hospitalId, courseData, userId) => {
  return withTransaction(async (t) => {
    // 1. Validate Patient
    if (!courseData.patientId) {
      const error = new Error('Patient ID is required');
      error.statusCode = 400;
      throw error;
    }

    const patient = await Patient.findOne({
      where: { id: courseData.patientId, hospitalId },
      transaction: t,
    });

    if (!patient) {
      const error = new Error('Patient not found in this hospital');
      error.statusCode = 404;
      throw error;
    }

    // 2. Validate Doctor
    const doctorId = courseData.doctorId || userId;
    const doctor = await User.findOne({
      where: { id: doctorId, hospitalId },
      transaction: t,
    });

    if (!doctor) {
      const error = new Error('Doctor not found in this hospital');
      error.statusCode = 404;
      throw error;
    }

    // 3. Validate EECP Package
    if (!courseData.packageId) {
      const error = new Error('EECP Package must be specified');
      error.statusCode = 400;
      throw error;
    }

    const pkg = await EecpPackage.findOne({
      where: { id: courseData.packageId, hospitalId },
      transaction: t,
    });

    if (!pkg) {
      const error = new Error('EECP Package not found in hospital catalog');
      error.statusCode = 404;
      throw error;
    }

    if (pkg.status !== 'ACTIVE') {
      const error = new Error(`EECP Package "${pkg.name}" is inactive and cannot be assigned`);
      error.statusCode = 400;
      throw error;
    }

    // 4. Check for duplicate ACTIVE or PLANNED course
    const activeExisting = await EecpTreatmentCourse.findOne({
      where: {
        hospitalId,
        patientId: patient.id,
        status: { [Op.in]: ['ACTIVE', 'PLANNED'] },
      },
      transaction: t,
    });

    if (activeExisting && !courseData.allowConcurrent) {
      const error = new Error(
        `Patient already has an active EECP course (${activeExisting.courseNumber}). Complete or pause previous course before creating a new one.`
      );
      error.statusCode = 400;
      throw error;
    }

    // 5. Generate Course Number
    const courseNumber = await generateNextCourseNumber(hospitalId, t);

    // 6. Create Course
    const course = await EecpTreatmentCourse.create(
      {
        hospitalId,
        courseNumber,
        patientId: patient.id,
        initiatingEncounterId: courseData.initiatingEncounterId || null,
        doctorId: doctor.id,
        packageId: pkg.id,
        startDate: courseData.startDate || new Date().toISOString().split('T')[0],
        endDate: courseData.endDate || null,
        plannedSessions: courseData.plannedSessions ? Number(courseData.plannedSessions) : pkg.numberOfSessions || 35,
        completedSessions: 0,
        status: courseData.status || 'ACTIVE',
        treatmentPlan: courseData.treatmentPlan?.trim() || `Daily 60-min sessions for ${pkg.numberOfSessions} days. Target pressure 260-300 mmHg.`,
        notes: courseData.notes?.trim() || null,
        createdBy: userId || null,
        updatedBy: userId || null,
      },
      { transaction: t }
    );

    return getCourseById(hospitalId, course.id, t);
  });
};

/**
 * Update Course Details
 */
export const updateCourse = async (hospitalId, id, updateData, userId) => {
  return withTransaction(async (t) => {
    const course = await EecpTreatmentCourse.findOne({
      where: { id, hospitalId },
      transaction: t,
    });

    if (!course) {
      const error = new Error('EECP Treatment Course not found');
      error.statusCode = 404;
      throw error;
    }

    if (['COMPLETED', 'CANCELLED'].includes(course.status)) {
      const error = new Error(`Cannot modify a ${course.status.toLowerCase()} treatment course`);
      error.statusCode = 400;
      throw error;
    }

    const payload = {
      treatmentPlan: updateData.treatmentPlan !== undefined ? updateData.treatmentPlan : course.treatmentPlan,
      endDate: updateData.endDate !== undefined ? updateData.endDate : course.endDate,
      notes: updateData.notes !== undefined ? updateData.notes : course.notes,
      updatedBy: userId || null,
    };

    if (updateData.plannedSessions && Number(updateData.plannedSessions) >= course.completedSessions) {
      payload.plannedSessions = Number(updateData.plannedSessions);
    }

    await course.update(payload, { transaction: t });
    return getCourseById(hospitalId, id, t);
  });
};

/**
 * Controlled Course Status Transitions
 */
export const updateCourseStatus = async (hospitalId, id, targetStatus, reason, userId) => {
  const ALLOWED_COURSE_TRANSITIONS = {
    PLANNED: ['ACTIVE', 'CANCELLED'],
    ACTIVE: ['PAUSED', 'COMPLETED', 'CANCELLED'],
    PAUSED: ['ACTIVE', 'CANCELLED'],
    COMPLETED: [],
    CANCELLED: [],
  };

  return withTransaction(async (t) => {
    const course = await EecpTreatmentCourse.findOne({
      where: { id, hospitalId },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    if (!course) {
      const error = new Error('EECP Treatment Course not found');
      error.statusCode = 404;
      throw error;
    }

    if (course.status === targetStatus) {
      return course;
    }

    const allowed = ALLOWED_COURSE_TRANSITIONS[course.status] || [];
    if (!allowed.includes(targetStatus)) {
      const error = new Error(`Cannot transition EECP course from ${course.status} to ${targetStatus}`);
      error.statusCode = 400;
      throw error;
    }

    const updates = {
      status: targetStatus,
      updatedBy: userId || null,
    };

    if (targetStatus === 'CANCELLED') {
      updates.cancellationReason = reason?.trim() || 'Cancelled by clinician';
    } else if (targetStatus === 'COMPLETED') {
      updates.endDate = new Date().toISOString().split('T')[0];
    }

    await course.update(updates, { transaction: t });
    return getCourseById(hospitalId, id, t);
  });
};


/**
 * Calculate Authoritative Course Progress
 */
export const getCourseProgress = async (hospitalId, id) => {
  const course = await EecpTreatmentCourse.findOne({
    where: { id, hospitalId },
  });

  if (!course) {
    const error = new Error('EECP Treatment Course not found');
    error.statusCode = 404;
    throw error;
  }

  const completedCount = await EecpSession.count({
    where: { courseId: id, hospitalId, status: 'COMPLETED' },
  });

  const cancelledCount = await EecpSession.count({
    where: { courseId: id, hospitalId, status: 'CANCELLED' },
  });

  const maxSession = (await EecpSession.max('sessionNumber', {
    where: { courseId: id, hospitalId },
  })) || 0;

  const planned = course.plannedSessions;
  const remaining = Math.max(0, planned - completedCount);
  const percentage = planned > 0 ? Math.min(100, Math.round((completedCount / planned) * 100)) : 0;

  return {
    courseId: course.id,
    courseNumber: course.courseNumber,
    status: course.status,
    plannedSessions: planned,
    completedSessions: completedCount,
    remainingSessions: remaining,
    cancelledSessions: cancelledCount,
    progressPercentage: percentage,
    nextSessionNumber: maxSession + 1,
  };
};

// ==============================================================
// 3. EECP SESSIONS
// ==============================================================

/**
 * List Sessions of a Course
 */
export const getCourseSessions = async (hospitalId, courseId) => {
  const course = await EecpTreatmentCourse.findOne({
    where: { id: courseId, hospitalId },
  });

  if (!course) {
    const error = new Error('EECP Treatment Course not found');
    error.statusCode = 404;
    throw error;
  }

  return EecpSession.findAll({
    where: { courseId, hospitalId },
    include: [
      {
        model: User,
        as: 'staff',
        attributes: ['id', 'name'],
      },
      {
        model: User,
        as: 'doctor',
        attributes: ['id', 'name'],
      },
    ],
    order: [['sessionNumber', 'ASC']],
  });
};

/**
 * List Today's Sessions (for Staff Workspace Dashboard)
 */
export const getTodaySessions = async (hospitalId, options = {}) => {
  const { date, status } = options;
  const targetDate = date || new Date().toISOString().split('T')[0];

  const where = {
    hospitalId,
    scheduledDate: targetDate,
  };

  if (status) where.status = status;

  return EecpSession.findAll({
    where,
    include: [
      {
        model: Patient,
        as: 'patient',
        attributes: ['id', 'uhid', 'firstName', 'lastName', 'phone', 'gender'],
      },
      {
        model: EecpTreatmentCourse,
        as: 'course',
        attributes: ['id', 'courseNumber', 'plannedSessions', 'completedSessions', 'status'],
      },
      {
        model: User,
        as: 'staff',
        attributes: ['id', 'name'],
      },
      {
        model: User,
        as: 'doctor',
        attributes: ['id', 'name'],
      },
    ],
    order: [
      ['status', 'ASC'],
      ['sessionNumber', 'ASC'],
    ],
  });
};

/**
 * Get Single Session Details with Readings
 */
export const getSessionById = async (hospitalId, id, transaction = null) => {
  const session = await EecpSession.findOne({
    where: { id, hospitalId },
    transaction,
    include: [
      {
        model: Patient,
        as: 'patient',
        attributes: ['id', 'uhid', 'firstName', 'lastName', 'phone', 'gender', 'dateOfBirth', 'allergies'],
      },
      {
        model: EecpTreatmentCourse,
        as: 'course',
        include: [
          {
            model: EecpPackage,
            as: 'package',
            attributes: ['id', 'name', 'numberOfSessions', 'sessionDuration'],
          },
        ],
      },
      {
        model: User,
        as: 'staff',
        attributes: ['id', 'name'],
      },
      {
        model: User,
        as: 'doctor',
        attributes: ['id', 'name', 'specialization'],
      },
      {
        model: EecpSessionReading,
        as: 'readings',
        include: [
          {
            model: User,
            as: 'recorder',
            attributes: ['id', 'name'],
          },
        ],
      },
    ],
    order: [[{ model: EecpSessionReading, as: 'readings' }, 'recordedAt', 'ASC']],
  });

  if (!session) {
    const error = new Error('EECP Session not found');
    error.statusCode = 404;
    throw error;
  }

  const plain = session.toJSON();
  plain.preAssessment = {
    systolicBp: session.preBpSystolic,
    diastolicBp: session.preBpDiastolic,
    pulseRate: session.prePulse,
    spo2: session.preSpo2,
    weightKg: session.preWeightKg,
    notes: session.preSessionNotes,
    patientReadiness: session.patientTolerance,
  };
  plain.postAssessment = {
    systolicBp: session.postBpSystolic,
    diastolicBp: session.postBpDiastolic,
    pulseRate: session.postPulse,
    spo2: session.postSpo2,
    patientTolerance: session.patientTolerance,
  };

  return plain;
};


/**
 * Schedule a Session for Course
 */
export const scheduleSession = async (hospitalId, courseId, sessionData, userId) => {
  return withTransaction(async (t) => {
    const course = await EecpTreatmentCourse.findOne({
      where: { id: courseId, hospitalId },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    if (!course) {
      const error = new Error('EECP Treatment Course not found');
      error.statusCode = 404;
      throw error;
    }

    if (['COMPLETED', 'CANCELLED'].includes(course.status)) {
      const error = new Error(`Cannot schedule sessions for a ${course.status.toLowerCase()} treatment course`);
      error.statusCode = 400;
      throw error;
    }

    // Determine session number
    let sessionNumber = sessionData.sessionNumber ? Number(sessionData.sessionNumber) : null;
    if (!sessionNumber) {
      const maxSession = await EecpSession.max('sessionNumber', {
        where: { courseId, hospitalId },
        transaction: t,
      });
      sessionNumber = (maxSession || 0) + 1;
    }

    if (sessionNumber > course.plannedSessions) {
      const error = new Error(
        `Session number ${sessionNumber} exceeds total planned sessions (${course.plannedSessions})`
      );
      error.statusCode = 400;
      throw error;
    }

    // Check duplicate session number
    const existingNum = await EecpSession.findOne({
      where: { courseId, sessionNumber },
      transaction: t,
    });

    if (existingNum) {
      const error = new Error(`Session ${sessionNumber} is already scheduled for this course`);
      error.statusCode = 400;
      throw error;
    }

    const scheduledDate = sessionData.scheduledDate || new Date().toISOString().split('T')[0];

    const session = await EecpSession.create(
      {
        hospitalId,
        courseId,
        patientId: course.patientId,
        encounterId: sessionData.encounterId || null,
        staffId: sessionData.staffId || userId || null,
        doctorId: course.doctorId,
        sessionNumber,
        scheduledDate,
        durationMinutes: sessionData.durationMinutes || 60,
        pressureApplied: sessionData.pressureApplied || '280-300 mmHg',
        status: 'SCHEDULED',
        createdBy: userId || null,
        updatedBy: userId || null,
      },
      { transaction: t }
    );

    return getSessionById(hospitalId, session.id, t);
  });
};

/**
 * Record Pre-Session Assessment & Vitals
 */
export const recordPreAssessment = async (hospitalId, id, preData, userId) => {
  return withTransaction(async (t) => {
    const session = await EecpSession.findOne({
      where: { id, hospitalId },
      transaction: t,
    });

    if (!session) {
      const error = new Error('EECP Session not found');
      error.statusCode = 404;
      throw error;
    }

    if (['COMPLETED', 'CANCELLED'].includes(session.status)) {
      const error = new Error(`Cannot modify pre-session assessment of a ${session.status.toLowerCase()} session`);
      error.statusCode = 400;
      throw error;
    }

    const updates = {
      preBpSystolic: preData.systolicBp !== undefined ? preData.systolicBp : (preData.preBpSystolic !== undefined ? preData.preBpSystolic : session.preBpSystolic),
      preBpDiastolic: preData.diastolicBp !== undefined ? preData.diastolicBp : (preData.preBpDiastolic !== undefined ? preData.preBpDiastolic : session.preBpDiastolic),
      prePulse: preData.pulseRate !== undefined ? preData.pulseRate : (preData.prePulse !== undefined ? preData.prePulse : session.prePulse),
      preSpo2: preData.spo2 !== undefined ? preData.spo2 : (preData.preSpo2 !== undefined ? preData.preSpo2 : session.preSpo2),
      preWeightKg: preData.weightKg !== undefined ? preData.weightKg : (preData.preWeightKg !== undefined ? preData.preWeightKg : session.preWeightKg),
      preSessionNotes: preData.notes !== undefined ? preData.notes : (preData.preSessionNotes !== undefined ? preData.preSessionNotes : session.preSessionNotes),
      patientTolerance: preData.patientTolerance || preData.patientReadiness || session.patientTolerance,
      pressureApplied: preData.pressureApplied !== undefined ? preData.pressureApplied : session.pressureApplied,
      updatedBy: userId || null,
    };

    if (session.status === 'SCHEDULED') {
      updates.status = 'PRE_ASSESSMENT';
    }

    await session.update(updates, { transaction: t });
    return getSessionById(hospitalId, id, t);
  });
};

/**
 * Controlled Session Lifecycle Status Transition
 */
export const updateSessionStatus = async (hospitalId, id, targetStatusOrPayload, statusPayload = {}, userId = null) => {
  let targetStatus;
  let payload;
  let actingUserId;

  if (typeof targetStatusOrPayload === 'object' && targetStatusOrPayload !== null) {
    targetStatus = targetStatusOrPayload.status;
    payload = targetStatusOrPayload;
    actingUserId = typeof statusPayload === 'string' ? statusPayload : userId;
  } else {
    targetStatus = targetStatusOrPayload;
    payload = statusPayload || {};
    actingUserId = userId;
  }

  const ALLOWED_SESSION_TRANSITIONS = {
    SCHEDULED: ['PRE_ASSESSMENT', 'IN_PROGRESS', 'CANCELLED'],
    PRE_ASSESSMENT: ['IN_PROGRESS', 'CANCELLED'],
    IN_PROGRESS: ['PAUSED', 'COMPLETED', 'CANCELLED'],
    PAUSED: ['IN_PROGRESS', 'CANCELLED'],
    COMPLETED: [],
    CANCELLED: [],
  };

  return withTransaction(async (t) => {
    const session = await EecpSession.findOne({
      where: { id, hospitalId },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    if (!session) {
      const error = new Error('EECP Session not found');
      error.statusCode = 404;
      throw error;
    }

    if (session.status === 'COMPLETED' || session.status === 'CANCELLED') {
      const error = new Error(`Cannot modify a ${session.status.toLowerCase()} session`);
      error.statusCode = 400;
      throw error;
    }

    if (session.status === targetStatus) {
      return getSessionById(hospitalId, id, t);
    }

    const allowed = ALLOWED_SESSION_TRANSITIONS[session.status] || [];
    if (!allowed.includes(targetStatus)) {
      const error = new Error(`Cannot transition EECP session from ${session.status} to ${targetStatus}`);
      error.statusCode = 400;
      throw error;
    }

    const updates = {
      status: targetStatus,
      updatedBy: actingUserId || null,
    };

    if (targetStatus === 'IN_PROGRESS') {
      if (!session.startedAt) updates.startedAt = new Date();
    } else if (targetStatus === 'COMPLETED') {
      updates.completedAt = new Date();

      if (payload.postAssessment) {
        const post = payload.postAssessment;
        if (post.systolicBp !== undefined) updates.postBpSystolic = post.systolicBp;
        if (post.postBpSystolic !== undefined) updates.postBpSystolic = post.postBpSystolic;
        if (post.diastolicBp !== undefined) updates.postBpDiastolic = post.diastolicBp;
        if (post.postBpDiastolic !== undefined) updates.postBpDiastolic = post.postBpDiastolic;
        if (post.pulseRate !== undefined) updates.postPulse = post.pulseRate;
        if (post.postPulse !== undefined) updates.postPulse = post.postPulse;
        if (post.spo2 !== undefined) updates.postSpo2 = post.spo2;
        if (post.postSpo2 !== undefined) updates.postSpo2 = post.postSpo2;
        if (post.patientTolerance) updates.patientTolerance = post.patientTolerance;
      }

      if (payload.postBpSystolic !== undefined) updates.postBpSystolic = payload.postBpSystolic;
      if (payload.postBpDiastolic !== undefined) updates.postBpDiastolic = payload.postBpDiastolic;
      if (payload.postPulse !== undefined) updates.postPulse = payload.postPulse;
      if (payload.postSpo2 !== undefined) updates.postSpo2 = payload.postSpo2;
      if (payload.postSessionNotes !== undefined) updates.postSessionNotes = payload.postSessionNotes;
      if (payload.patientTolerance !== undefined) updates.patientTolerance = payload.patientTolerance;
      if (payload.adverseEvent !== undefined) updates.adverseEvent = payload.adverseEvent;
      if (payload.adverseEventNotes !== undefined) updates.adverseEventNotes = payload.adverseEventNotes;

      // Increment completed sessions on Course
      const course = await EecpTreatmentCourse.findOne({
        where: { id: session.courseId, hospitalId },
        lock: t.LOCK.UPDATE,
        transaction: t,
      });

      if (course) {
        const nextCompleted = Number(course.completedSessions) + 1;
        const courseUpdates = {
          completedSessions: nextCompleted,
          updatedBy: actingUserId || null,
        };

        if (nextCompleted >= course.plannedSessions) {
          courseUpdates.status = 'COMPLETED';
          courseUpdates.endDate = new Date().toISOString().split('T')[0];
        }

        await course.update(courseUpdates, { transaction: t });
      }
    } else if (targetStatus === 'CANCELLED') {
      updates.cancellationReason = payload.cancellationReason?.trim() || 'Session cancelled';
    }

    await session.update(updates, { transaction: t });
    return getSessionById(hospitalId, id, t);
  });
};



/**
 * Record Telemetric Session Reading during Therapy
 */
export const addSessionReading = async (hospitalId, sessionId, readingData, userId) => {
  return withTransaction(async (t) => {
    const session = await EecpSession.findOne({
      where: { id: sessionId, hospitalId },
      transaction: t,
    });

    if (!session) {
      const error = new Error('EECP Session not found');
      error.statusCode = 404;
      throw error;
    }

    if (['COMPLETED', 'CANCELLED'].includes(session.status)) {
      const error = new Error(`Cannot record monitoring readings on a ${session.status.toLowerCase()} session`);
      error.statusCode = 400;
      throw error;
    }

    const reading = await EecpSessionReading.create(
      {
        hospitalId,
        sessionId,
        recordedAt: readingData.recordedAt || new Date(),
        systolicBp: readingData.systolicBp ? Number(readingData.systolicBp) : null,
        diastolicBp: readingData.diastolicBp ? Number(readingData.diastolicBp) : null,
        pulseRate: readingData.pulseRate ? Number(readingData.pulseRate) : null,
        spo2: readingData.spo2 ? Number(readingData.spo2) : null,
        treatmentPressure: readingData.treatmentPressure !== undefined && readingData.treatmentPressure !== null
          ? String(readingData.treatmentPressure).trim()
          : (session.pressureApplied || '280 mmHg'),
        patientComfort: readingData.patientComfort ? String(readingData.patientComfort).trim() : 'COMFORTABLE',
        symptoms: readingData.symptoms ? String(readingData.symptoms).trim() : null,
        notes: readingData.notes ? String(readingData.notes).trim() : null,
        recordedBy: userId || null,
      },
      { transaction: t }
    );


    return EecpSessionReading.findByPk(reading.id, {
      include: [{ model: User, as: 'recorder', attributes: ['id', 'name'] }],
      transaction: t,
    });
  });
};

/**
 * Get All Monitoring Readings of Session (Chronological)
 */
export const getSessionReadings = async (hospitalId, sessionId) => {
  const session = await EecpSession.findOne({
    where: { id: sessionId, hospitalId },
  });

  if (!session) {
    const error = new Error('EECP Session not found');
    error.statusCode = 404;
    throw error;
  }

  return EecpSessionReading.findAll({
    where: { sessionId, hospitalId },
    include: [
      {
        model: User,
        as: 'recorder',
        attributes: ['id', 'name'],
      },
    ],
    order: [['recordedAt', 'ASC']],
  });
};

/**
 * Delete a Session (only if still in SCHEDULED state)
 */
export const deleteSession = async (hospitalId, id) => {
  return withTransaction(async (t) => {
    const session = await EecpSession.findOne({
      where: { id, hospitalId },
      transaction: t,
    });

    if (!session) {
      const error = new Error('EECP Session not found');
      error.statusCode = 404;
      throw error;
    }

    if (session.status !== 'SCHEDULED') {
      const error = new Error('Cannot delete a session that has already commenced or been finalized');
      error.statusCode = 400;
      throw error;
    }

    await session.destroy({ transaction: t });
    return { success: true, message: 'Scheduled session removed' };
  });
};

/**
 * Aggregated Dashboard Metrics for EECP Staff
 */
export const getEecpDashboardMetrics = async (hospitalId, date) => {
  const targetDate = date || new Date().toISOString().split('T')[0];

  const todaySessions = await EecpSession.findAll({
    where: { hospitalId, scheduledDate: targetDate },
    attributes: ['status'],
  });

  const scheduled = todaySessions.filter((s) => s.status === 'SCHEDULED').length;
  const preAssessment = todaySessions.filter((s) => s.status === 'PRE_ASSESSMENT').length;
  const inProgress = todaySessions.filter((s) => s.status === 'IN_PROGRESS' || s.status === 'PAUSED').length;
  const completed = todaySessions.filter((s) => s.status === 'COMPLETED').length;
  const cancelled = todaySessions.filter((s) => s.status === 'CANCELLED').length;

  const activeCoursesCount = await EecpTreatmentCourse.count({
    where: { hospitalId, status: 'ACTIVE' },
  });

  const totalPatientsInTherapy = await EecpTreatmentCourse.count({
    where: { hospitalId, status: 'ACTIVE' },
    distinct: true,
    col: 'patient_id',
  });

  return {
    todayTotal: todaySessions.length,
    todaySessions: todaySessions.length,
    scheduled,
    preAssessment,
    inProgress,
    completed,
    cancelled,
    activeCourses: activeCoursesCount,
    activePatients: totalPatientsInTherapy,
  };
};

export default {
  generateNextCourseNumber,
  getEncounterAssessment,
  upsertAssessment,
  getCourses,
  getCourseById,
  createCourse,
  updateCourse,
  updateCourseStatus,
  getCourseProgress,
  getCourseSessions,
  getTodaySessions,
  getSessionById,
  scheduleSession,
  recordPreAssessment,
  updateSessionStatus,
  addSessionReading,
  getSessionReadings,
  deleteSession,
  getEecpDashboardMetrics,
};
