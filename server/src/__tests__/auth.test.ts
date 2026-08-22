import request from "supertest";
import app from "../app";
import { User } from "../models/user.model";
import { OTP } from "../models/otp.model";
import { API_PREFIX } from "@healos/shared";
import { sendOtpEmail } from "../utils/mailer";

jest.mock("../utils/mailer", () => ({
  sendOtpEmail: jest.fn().mockResolvedValue(true),
}));

describe("Authentication API", () => {
  const mockedSendOtpEmail = jest.mocked(sendOtpEmail);

  beforeEach(() => {
    mockedSendOtpEmail.mockClear();
    mockedSendOtpEmail.mockResolvedValue(true);
  });

  const registerPayload = {
    name: "Test User",
    email: "test@example.com",
    password: "Password123!",
  };

  it("should successfully register a new user", async () => {
    const res = await request(app)
      .post(`${API_PREFIX}/auth/register`)
      .send(registerPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.email).toBe(registerPayload.email);

    // Verify it was saved to DB
    const userInDb = await User.findOne({ email: registerPayload.email });
    expect(userInDb).toBeTruthy();
  });

  it("should fail registration when OTP email delivery fails", async () => {
    mockedSendOtpEmail.mockResolvedValue(false);

    const res = await request(app)
      .post(`${API_PREFIX}/auth/register`)
      .send(registerPayload);

    expect(res.status).toBe(502);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/couldn't send/i);

    const otpInDb = await OTP.findOne({ email: registerPayload.email });
    expect(otpInDb).toBeNull();
  });

  it("should resend email verification OTP for an unverified user", async () => {
    await request(app).post(`${API_PREFIX}/auth/register`).send(registerPayload);
    mockedSendOtpEmail.mockClear();

    const res = await request(app)
      .post(`${API_PREFIX}/auth/resend-otp`)
      .send({ email: registerPayload.email });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockedSendOtpEmail).toHaveBeenCalledWith(
      registerPayload.email,
      expect.stringMatching(/^\d{6}$/),
      "email_verification"
    );

    const otpInDb = await OTP.findOne({ email: registerPayload.email, purpose: "email_verification" });
    expect(otpInDb).toBeTruthy();
  });

  it("should send a password reset OTP and reset the password", async () => {
    const newPassword = "NewPassword123!";
    await request(app).post(`${API_PREFIX}/auth/register`).send(registerPayload);
    await User.updateOne({ email: registerPayload.email }, { isEmailVerified: true });
    mockedSendOtpEmail.mockClear();

    const forgotRes = await request(app)
      .post(`${API_PREFIX}/auth/forgot-password`)
      .send({ email: registerPayload.email });

    expect(forgotRes.status).toBe(200);
    expect(forgotRes.body.success).toBe(true);
    expect(mockedSendOtpEmail).toHaveBeenCalledWith(
      registerPayload.email,
      expect.stringMatching(/^\d{6}$/),
      "password_reset"
    );

    const resetOtp = await OTP.findOne({ email: registerPayload.email, purpose: "password_reset" });
    expect(resetOtp).toBeTruthy();

    const resetRes = await request(app)
      .post(`${API_PREFIX}/auth/reset-password`)
      .send({ email: registerPayload.email, otp: resetOtp?.otp, password: newPassword });

    expect(resetRes.status).toBe(200);
    expect(resetRes.body.success).toBe(true);

    const oldLoginRes = await request(app)
      .post(`${API_PREFIX}/auth/login`)
      .send({ email: registerPayload.email, password: registerPayload.password });
    expect(oldLoginRes.status).toBe(401);

    const newLoginRes = await request(app)
      .post(`${API_PREFIX}/auth/login`)
      .send({ email: registerPayload.email, password: newPassword });
    expect(newLoginRes.status).toBe(200);
    expect(newLoginRes.body.success).toBe(true);
  });

  it("should not allow registration with an existing email", async () => {
    // Register once
    await request(app).post(`${API_PREFIX}/auth/register`).send(registerPayload);
    await User.updateOne({ email: registerPayload.email }, { isEmailVerified: true });

    // Try again
    const res = await request(app)
      .post(`${API_PREFIX}/auth/register`)
      .send(registerPayload);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/already exists/i);
  });

  it("should successfully login with correct credentials", async () => {
    await request(app).post(`${API_PREFIX}/auth/register`).send(registerPayload);
    await User.updateOne({ email: registerPayload.email }, { isEmailVerified: true });

    const res = await request(app)
      .post(`${API_PREFIX}/auth/login`)
      .send({
        email: registerPayload.email,
        password: registerPayload.password,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
  });

  it("should fail login with incorrect password", async () => {
    await request(app).post(`${API_PREFIX}/auth/register`).send(registerPayload);
    await User.updateOne({ email: registerPayload.email }, { isEmailVerified: true });

    const res = await request(app)
      .post(`${API_PREFIX}/auth/login`)
      .send({
        email: registerPayload.email,
        password: "WrongPassword123!",
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });
});
