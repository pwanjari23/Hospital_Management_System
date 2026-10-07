import {
  Hospital,
  User,
  UserRole,
  Role,
  Department,
  Patient,
  DoctorSchedule,
  DoctorLeave,
  Appointment,
} from '../models/index.js';
import doctorScheduleService from '../services/doctorSchedule.service.js';
import doctorLeaveService from '../services/doctorLeave.service.js';
import appointmentService from '../services/appointment.service.js';


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
  console.log('\n=== PHASE 6 VERIFICATION TEST SUITE: APPOINTMENTS & DOCTOR ROSTERING ===\n');

  let hospA, hospB;
  let docA, docB, receptionistA, patientA, patientB, deptA;

  try {
    // ----------------------------------------------------
    // SETUP: Tenants, Doctors, Receptionist & Patient
    // ----------------------------------------------------
    console.log('--- Setup: Test Tenants & Users ---');

    hospA = await Hospital.create({
      name: 'Alpha Cardiac Hospital',
      slug: 'alpha-cardiac',
      status: 'ACTIVE',
    });

    hospB = await Hospital.create({
      name: 'Beta General Hospital',
      slug: 'beta-general',
      status: 'ACTIVE',
    });

    deptA = await Department.create({
      hospitalId: hospA.id,
      name: 'Cardiology',
      code: 'CARD-01',
      status: 'ACTIVE',
    });

    const docRole = await Role.findOne({ where: { name: 'DOCTOR' } });
    const recRole = await Role.findOne({ where: { name: 'RECEPTIONIST' } });

    // Doctor in Hospital A
    docA = await User.create({
      hospitalId: hospA.id,
      name: 'Dr. Siddharth Verma',
      email: 'dr.siddharth@alpha.test',
      passwordHash: 'hashed_pass_dummy',
      status: 'ACTIVE',
      departmentId: deptA.id,
      qualification: 'MBBS, MD (Cardiology)',
      specialization: 'Interventional Cardiology',
      consultationFee: 750.0,
    });
    await UserRole.create({ userId: docA.id, roleId: docRole.id });

    // Doctor in Hospital B
    docB = await User.create({
      hospitalId: hospB.id,
      name: 'Dr. Neha Sharma',
      email: 'dr.neha@beta.test',
      passwordHash: 'hashed_pass_dummy',
      status: 'ACTIVE',
      qualification: 'MBBS, MD',
      specialization: 'General Medicine',
      consultationFee: 500.0,
    });
    await UserRole.create({ userId: docB.id, roleId: docRole.id });

    // Receptionist in Hospital A
    receptionistA = await User.create({
      hospitalId: hospA.id,
      name: 'Receptionist Pooja',
      email: 'pooja.rec@alpha.test',
      passwordHash: 'hashed_pass_dummy',
      status: 'ACTIVE',
    });
    await UserRole.create({ userId: receptionistA.id, roleId: recRole.id });

    // Patients
    patientA = await Patient.create({
      hospitalId: hospA.id,
      uhid: 'ALPH-000101',
      firstName: 'Rajesh',
      lastName: 'Khanna',
      dateOfBirth: '1975-06-15',
      gender: 'MALE',
      bloodGroup: 'B_POSITIVE',
      phone: '+919876543210',
    });

    patientB = await Patient.create({
      hospitalId: hospB.id,
      uhid: 'BETA-000201',
      firstName: 'Sunita',
      lastName: 'Patil',
      dateOfBirth: '1982-08-20',
      gender: 'FEMALE',
      phone: '+919876543211',
    });

    assert(docA && docB && patientA && patientB, 'Test tenants, doctors, and patients setup successfully');

    // ----------------------------------------------------
    // TEST 1: Doctor Schedule Management
    // ----------------------------------------------------
    console.log('\n--- 1. Testing Doctor Schedules ---');

    // Schedule: Monday 09:00 - 13:00, Break 11:00 - 11:30, 30 min slots
    const scheduleMon = await doctorScheduleService.createDoctorSchedule(hospA.id, {
      doctorId: docA.id,
      departmentId: deptA.id,
      dayOfWeek: 'MONDAY',
      startTime: '09:00',
      endTime: '13:00',
      breakStartTime: '11:00',
      breakEndTime: '11:30',
      slotDurationMinutes: 30,
      maxAppointmentsPerSlot: 1,
      consultationType: 'OPD Consultation',
    });

    assert(scheduleMon && scheduleMon.dayOfWeek === 'MONDAY', 'Doctor schedule created for Monday');
    assert(scheduleMon.slotDurationMinutes === 30, 'Slot duration configured as 30 minutes');

    // Test Overlapping Schedule prevention
    let overlapError = null;
    try {
      await doctorScheduleService.createDoctorSchedule(hospA.id, {
        doctorId: docA.id,
        dayOfWeek: 'MONDAY',
        startTime: '10:00',
        endTime: '14:00',
      });
    } catch (err) {
      overlapError = err;
    }
    assert(overlapError && overlapError.statusCode === 409, 'Overlapping schedule on same day rejected (409 Conflict)');

    // Toggle status
    const toggled = await doctorScheduleService.toggleDoctorScheduleStatus(hospA.id, scheduleMon.id);
    assert(toggled.isActive === false, 'Schedule successfully deactivated');
    await doctorScheduleService.toggleDoctorScheduleStatus(hospA.id, scheduleMon.id);

    // ----------------------------------------------------
    // TEST 2: Doctor Leave Management
    // ----------------------------------------------------
    console.log('\n--- 2. Testing Doctor Leave ---');

    // Doctor on leave next Monday: 2026-10-19
    const leave = await doctorLeaveService.createDoctorLeave(hospA.id, {
      doctorId: docA.id,
      startDate: '2026-10-19',
      endDate: '2026-10-19',
      reason: 'Cardiology Conference at AIIMS',
      notes: 'Emergency cases cover by Dr. Sharma',
    });

    assert(leave && leave.startDate === '2026-10-19', 'Doctor leave recorded successfully');

    // Test duplicate/overlap leave prevention
    let overlapLeaveError = null;
    try {
      await doctorLeaveService.createDoctorLeave(hospA.id, {
        doctorId: docA.id,
        startDate: '2026-10-19',
        endDate: '2026-10-20',
        reason: 'Duplicate conference',
      });
    } catch (err) {
      overlapLeaveError = err;
    }
    assert(overlapLeaveError && overlapLeaveError.statusCode === 409, 'Overlapping leave rejected (409 Conflict)');

    // ----------------------------------------------------
    // TEST 3: Slot Generation Logic
    // ----------------------------------------------------
    console.log('\n--- 3. Testing Slot Generation ---');

    // Normal Monday: 2026-10-12
    const slotsResult = await appointmentService.getAvailableSlots(hospA.id, {
      doctorId: docA.id,
      date: '2026-10-12', // Monday
    });

    assert(slotsResult.isAvailable === true, 'Doctor is available on working Monday 2026-10-12');
    assert(slotsResult.slots.length > 0, `Generated ${slotsResult.slots.length} consultation slots`);

    // Ensure break time 11:00 - 11:30 is excluded from generated slots
    const hasBreakSlot = slotsResult.slots.some((s) => s.startTime === '11:00');
    assert(!hasBreakSlot, 'Break interval (11:00 - 11:30) excluded from bookable slots');

    // Test Leave Day: 2026-10-19
    const leaveSlotsResult = await appointmentService.getAvailableSlots(hospA.id, {
      doctorId: docA.id,
      date: '2026-10-19', // Monday on leave
    });
    assert(leaveSlotsResult.isAvailable === false, 'Doctor correctly flagged unavailable on leave date');
    assert(leaveSlotsResult.slots.length === 0, 'Zero slots generated on doctor leave date');

    // Test Off-Day (e.g. Wednesday without schedule)
    const offDaySlots = await appointmentService.getAvailableSlots(hospA.id, {
      doctorId: docA.id,
      date: '2026-10-14', // Wednesday
    });
    assert(offDaySlots.isAvailable === false, 'Doctor flagged unavailable on day with no schedule');

    // ----------------------------------------------------
    // TEST 4: Appointment Booking & Atomic Sequence
    // ----------------------------------------------------
    console.log('\n--- 4. Testing Appointment Booking ---');

    const appointment = await appointmentService.createAppointment(
      hospA.id,
      {
        patientId: patientA.id,
        doctorId: docA.id,
        appointmentDate: '2026-10-12',
        startTime: '09:00',
        endTime: '09:30',
        appointmentType: 'OPD Consultation',
        reason: 'Recurrent palpitation',
      },
      receptionistA.id
    );

    assert(appointment && appointment.appointmentNumber.startsWith('APT-'), `Appointment created with number ${appointment.appointmentNumber}`);
    assert(appointment.status === 'SCHEDULED', 'Initial status is SCHEDULED');
    assert(Number(appointment.consultationFee) === 750, 'Consultation fee pulled from doctor profile (750.00)');

    // Slot should now show as booked / unavailable
    const refreshedSlots = await appointmentService.getAvailableSlots(hospA.id, {
      doctorId: docA.id,
      date: '2026-10-12',
    });
    const bookedSlot = refreshedSlots.slots.find((s) => s.startTime === '09:00');
    assert(bookedSlot && bookedSlot.isAvailable === false, '09:00 slot correctly marked as booked/unavailable');

    // Test Double Booking Prevention
    let doubleBookingError = null;
    try {
      await appointmentService.createAppointment(
        hospA.id,
        {
          patientId: patientA.id,
          doctorId: docA.id,
          appointmentDate: '2026-10-12',
          startTime: '09:00',
          endTime: '09:30',
        },
        receptionistA.id
      );
    } catch (err) {
      doubleBookingError = err;
    }
    assert(doubleBookingError && doubleBookingError.statusCode === 409, 'Double booking prevented by transaction check (409 Conflict)');

    // ----------------------------------------------------
    // TEST 5: Reschedule & Status Lifecycle
    // ----------------------------------------------------
    console.log('\n--- 5. Testing Reschedule & Lifecycle ---');

    // Reschedule 09:00 to 09:30
    const rescheduled = await appointmentService.rescheduleAppointment(
      hospA.id,
      appointment.id,
      {
        appointmentDate: '2026-10-12',
        startTime: '09:30',
        endTime: '10:00',
        reason: 'Patient requested later morning slot',
      },
      receptionistA.id
    );

    assert(rescheduled.status === 'RESCHEDULED', 'Appointment status transitioned to RESCHEDULED');
    assert(rescheduled.startTime === '09:30', 'Appointment start time updated to 09:30');

    // Old slot 09:00 should now be freed
    const slotsAfterReschedule = await appointmentService.getAvailableSlots(hospA.id, {
      doctorId: docA.id,
      date: '2026-10-12',
    });
    const freedSlot = slotsAfterReschedule.slots.find((s) => s.startTime === '09:00');
    assert(freedSlot && freedSlot.isAvailable === true, 'Previous slot 09:00 freed upon rescheduling');

    // Check In
    const checkedIn = await appointmentService.updateAppointmentStatus(hospA.id, appointment.id, {
      status: 'CHECKED_IN',
    });
    assert(checkedIn.status === 'CHECKED_IN', 'Status transitioned to CHECKED_IN');
    assert(checkedIn.checkedInAt !== null, 'checkedInAt timestamp populated');

    // Cancellation
    const cancelled = await appointmentService.cancelAppointment(hospA.id, appointment.id, {
      cancellationReason: 'Patient emergency travel',
    });
    assert(cancelled.status === 'CANCELLED', 'Status transitioned to CANCELLED');
    assert(cancelled.cancellationReason === 'Patient emergency travel', 'cancellationReason recorded');

    // ----------------------------------------------------
    // TEST 6: Tenant Isolation & Cross-Tenant Security
    // ----------------------------------------------------
    console.log('\n--- 6. Testing Strict Tenant Isolation ---');

    // Hospital B query for Hospital A appointment
    let crossTenantApt = null;
    try {
      crossTenantApt = await appointmentService.getAppointmentById(hospB.id, appointment.id);
    } catch {
      crossTenantApt = null;
    }
    assert(crossTenantApt === null, 'Hospital B cannot access Hospital A appointment (404/Null)');

    // Hospital B trying to book with Hospital A Doctor
    let crossBookingError = null;
    try {
      await appointmentService.createAppointment(hospB.id, {
        patientId: patientB.id,
        doctorId: docA.id, // Doctor belonging to Hospital A!
        appointmentDate: '2026-10-12',
        startTime: '09:00',
        endTime: '09:30',
      });
    } catch (err) {
      crossBookingError = err;
    }
    assert(crossBookingError && crossBookingError.statusCode === 404, 'Hospital B cannot book against Hospital A doctor (404)');

    // Hospital B trying to access Hospital A Doctor Schedules
    const hospBSchedules = await doctorScheduleService.getDoctorSchedules(hospB.id, {
      doctorId: docA.id,
    });
    assert(hospBSchedules.length === 0, 'Hospital B query for Hospital A doctor schedules returns 0 records');

    // ----------------------------------------------------
    // TEST 7: Summary Metrics
    // ----------------------------------------------------
    console.log('\n--- 7. Testing Summary Metrics ---');
    const stats = await appointmentService.getAppointmentStats(hospA.id, '2026-10-12');
    assert(stats && typeof stats.cancelled === 'number', 'Summary statistics calculation returned valid counts');
    assert(stats.cancelled >= 1, 'Cancelled appointment reflected in dashboard stats');

  } catch (err) {
    console.error('Fatal Test Exception:', err);
    failed++;
  } finally {
    console.log('\nCleaning up Phase 6 verification records...');
    try {
      if (hospA && hospB) {
        await Appointment.destroy({ where: { hospitalId: [hospA.id, hospB.id] } });
        await DoctorLeave.destroy({ where: { hospitalId: [hospA.id, hospB.id] } });
        await DoctorSchedule.destroy({ where: { hospitalId: [hospA.id, hospB.id] } });
        await Patient.destroy({ where: { hospitalId: [hospA.id, hospB.id] } });
        await UserRole.destroy({ where: { userId: [docA?.id, docB?.id, receptionistA?.id].filter(Boolean) } });
        await User.destroy({ where: { hospitalId: [hospA.id, hospB.id] } });
        await Department.destroy({ where: { hospitalId: [hospA.id, hospB.id] } });
        await Hospital.destroy({ where: { id: [hospA.id, hospB.id] } });
      }
      console.log('✓ Cleanup complete.\n');
    } catch (cleanupErr) {
      console.error('Cleanup error:', cleanupErr);
    }
  }

  console.log(`Results: ${passed} passed, ${failed} failed.\n`);
  if (failed > 0) process.exit(1);
}

run();
