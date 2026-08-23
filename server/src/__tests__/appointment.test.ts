import request from "supertest";
import app from "../app";
import { User, UserRole, AppointmentType, PaymentMethod, AppointmentStatus } from "../models";
import { API_PREFIX } from "@healos/shared"; 
import jwt from "jsonwebtoken";
import { envConfig } from "../config/env";

const generateTestToken = (userId: string, role: UserRole) => {
  return jwt.sign({ userId, role, tokenVersion: 0 }, envConfig.JWT_SECRET, { expiresIn: "1h" });
};

describe("Appointment API", () => {
  let patientToken: string;
  let doctorToken: string;
  let patientId: string;
  let doctorId: string;

  beforeEach(async () => {
    // 1. Create a mock Patient
    const patient = await User.create({
      name: "Test Patient",
      email: "patient@test.com",
      password: "password123",
      role: UserRole.PATIENT,
      isEmailVerified: true,
    });
    patientId = patient._id.toString();
    patientToken = generateTestToken(patientId, UserRole.PATIENT);

    // 2. Create a mock Doctor
    const doctor = await User.create({
      name: "Dr. Test Doctor",
      email: "doctor@test.com",
      password: "password123",
      role: UserRole.DOCTOR,
      isEmailVerified: true,
    });
    doctorId = doctor._id.toString();
    doctorToken = generateTestToken(doctorId, UserRole.DOCTOR);
  });

  describe("Booking Flow", () => {
    it("should fetch a list of available doctors", async () => {
      const res = await request(app)
        .get(`${API_PREFIX}/appointments/doctors-list`)
        .set("Authorization", `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.doctors)).toBe(true);
      expect(res.body.doctors.length).toBeGreaterThan(0);
      expect(res.body.doctors[0].role).toBe(UserRole.DOCTOR);
    });

    it("should allow a patient to book an appointment", async () => {
      const bookingPayload = {
        doctorId,
        department: "Cardiology",
        date: "2026-10-15",
        timeSlot: "10:00 AM",
        reason: "Routine Checkup",
        type: AppointmentType.IN_PERSON,
        paymentMethod: PaymentMethod.CASH,
      };

      const res = await request(app)
        .post(`${API_PREFIX}/appointments/book`)
        .set("Authorization", `Bearer ${patientToken}`)
        .send(bookingPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.appointment.doctor._id.toString()).toBe(doctorId);
      expect(res.body.appointment.status).toBe(AppointmentStatus.PENDING);
    });

    it("should prevent double-booking the same slot for a doctor", async () => {
      const payload = {
        doctorId,
        department: "Cardiology",
        date: "2026-10-15",
        timeSlot: "10:00 AM",
        reason: "Different Issue",
        type: AppointmentType.IN_PERSON,
        paymentMethod: PaymentMethod.CASH,
      };

      // Book first time
      await request(app)
        .post(`${API_PREFIX}/appointments/book`)
        .set("Authorization", `Bearer ${patientToken}`)
        .send(payload);

      // Book second time
      const res = await request(app)
        .post(`${API_PREFIX}/appointments/book`)
        .set("Authorization", `Bearer ${patientToken}`)
        .send(payload);

      expect(res.status).toBe(409); // Conflict
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already booked/i);
    });
  });

  describe("Appointment Retrieval", () => {
    beforeEach(async () => {
      // Explicitly create an appointment for retrieval tests
      await request(app)
        .post(`${API_PREFIX}/appointments/book`)
        .set("Authorization", `Bearer ${patientToken}`)
        .send({
          doctorId,
          department: "Cardiology",
          date: "2026-10-16",
          timeSlot: "11:00 AM",
          reason: "Follow up",
          type: AppointmentType.IN_PERSON,
          paymentMethod: PaymentMethod.CASH,
        });
    });

    it("should allow the patient to fetch their appointments", async () => {
      const res = await request(app)
        .get(`${API_PREFIX}/appointments/patient`)
        .set("Authorization", `Bearer ${patientToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.appointments.length).toBe(1);
      expect(res.body.appointments[0].patient.toString()).toBe(patientId);
    });

    it("should allow the doctor to fetch their assigned appointments", async () => {
      const res = await request(app)
        .get(`${API_PREFIX}/appointments/doctor`)
        .set("Authorization", `Bearer ${doctorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.appointments.length).toBe(1);
      expect(res.body.appointments[0].doctor.toString()).toBe(doctorId);
    });
  });
});
