import request from "supertest";
import app from "../app";
import { User, UserRole } from "../models/user.model";
import { API_PREFIX } from "@healos/shared";

describe("Authentication API", () => {
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
    expect(res.body.data.user.email).toBe(registerPayload.email);
    expect(res.body.data.user.role).toBe(UserRole.USER);
    expect(res.body.data.token).toBeDefined();

    // Verify it was saved to DB
    const userInDb = await User.findOne({ email: registerPayload.email });
    expect(userInDb).toBeTruthy();
  });

  it("should not allow registration with an existing email", async () => {
    // Register once
    await request(app).post(`${API_PREFIX}/auth/register`).send(registerPayload);

    // Try again
    const res = await request(app)
      .post(`${API_PREFIX}/auth/register`)
      .send(registerPayload);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Email already in use/i);
  });

  it("should successfully login with correct credentials", async () => {
    await request(app).post(`${API_PREFIX}/auth/register`).send(registerPayload);

    const res = await request(app)
      .post(`${API_PREFIX}/auth/login`)
      .send({
        email: registerPayload.email,
        password: registerPayload.password,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
  });

  it("should fail login with incorrect password", async () => {
    await request(app).post(`${API_PREFIX}/auth/register`).send(registerPayload);

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
