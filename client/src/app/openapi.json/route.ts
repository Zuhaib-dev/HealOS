import { NextResponse } from "next/server";

export const dynamic = "force-static";

export async function GET() {
  const openApiSpec = {
    openapi: "3.1.0",
    info: {
      title: "HealOS Healthcare Platform API",
      summary: "Autonomous and clinician-facing hospital management API",
      description:
        "Comprehensive, HIPAA/GDPR-aligned hospital operating system API enabling AI agents and client applications to manage clinical scheduling, patient records, physiological vitals, emergency triage, radiology PACS, and pharmacy queues.",
      version: "1.0.0",
      contact: {
        name: "Zuhaib Rashid (Full Stack Developer)",
        email: "zuhaibrashid01@gmail.com",
        url: "https://zuhaibrashid.com",
      },
      license: {
        name: "Proprietary",
        url: "https://healos-theta.vercel.app/about",
      },
      "x-deprecation-policy": {
        policy_url: "https://healos-theta.vercel.app/developers#deprecation",
        guarantee_window_months: 24,
        sunset_date: "2027-12-31",
      },
    },
    servers: [
      {
        url: "https://healos-theta.vercel.app/api/v1",
        description: "HealOS Production Gateway",
      },
      {
        url: "http://localhost:5000/api/v1",
        description: "Local Development Server",
      },
    ],
    tags: [
      { name: "System", description: "Health probes, metadata, and service discovery" },
      { name: "Appointments", description: "Clinical booking, consultation scheduling, and calendar management" },
      { name: "Patients", description: "Demographic profiles, longitudinal EHR records, and allergy indices" },
      { name: "Vitals", description: "Continuous and episodic physiological vital signs observation" },
      { name: "Radiology", description: "DICOM image orders, modality worklists, and radiologist reporting" },
      { name: "Laboratory", description: "Specimen accession, analyzer validation, and critical callback feeds" },
      { name: "Emergency", description: "Emergency department triage board, ambulance inbound, and resus bay allocation" },
    ],
    paths: {
      "/health": {
        get: {
          tags: ["System"],
          summary: "System Health Status",
          description: "Returns operational health status, database connectivity, and uptime metrics.",
          operationId: "checkSystemHealth",
          responses: {
            "200": {
              description: "System is healthy and fully operational",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["status", "timestamp", "version"],
                    properties: {
                      status: { type: "string", example: "healthy" },
                      timestamp: { type: "string", format: "date-time", example: "2026-09-04T22:00:00Z" },
                      version: { type: "string", example: "1.0.0" },
                      services: {
                        type: "object",
                        properties: {
                          database: { type: "string", example: "connected" },
                          websocket: { type: "string", example: "online" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/catalog": {
        get: {
          tags: ["System"],
          summary: "API Endpoint Catalog",
          description: "Lists all public and authenticated clinical routes with capability metadata.",
          operationId: "getApiCatalog",
          responses: {
            "200": {
              description: "Machine-readable endpoint catalog",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["endpoints", "mcpUrl", "docsUrl"],
                    properties: {
                      endpoints: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            path: { type: "string", example: "/api/v1/appointments" },
                            method: { type: "string", example: "GET" },
                            scope: { type: "string", example: "read:appointments" },
                          },
                        },
                      },
                      mcpUrl: { type: "string", example: "https://healos-theta.vercel.app/.well-known/mcp" },
                      docsUrl: { type: "string", example: "https://healos-theta.vercel.app/developers" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/appointments": {
        get: {
          tags: ["Appointments"],
          summary: "List Appointments",
          description: "Retrieves a paginated list of scheduled patient appointments filtered by date or provider.",
          operationId: "listAppointments",
          security: [{ OAuth2: ["read:appointments"] }, { BearerAuth: [] }],
          parameters: [
            {
              name: "date",
              in: "query",
              required: false,
              description: "Filter appointments by ISO date (YYYY-MM-DD)",
              schema: { type: "string", format: "date", example: "2026-09-04" },
            },
            {
              name: "status",
              in: "query",
              required: false,
              description: "Filter by status",
              schema: { type: "string", enum: ["SCHEDULED", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] },
            },
            {
              name: "cursor",
              in: "query",
              required: false,
              description: "Opaque cursor token for cursor-based pagination",
              schema: { type: "string", example: "cur_next_98124" },
            },
            {
              name: "limit",
              in: "query",
              required: false,
              description: "Maximum number of records to return",
              schema: { type: "integer", default: 20, minimum: 1, maximum: 100 },
            },
          ],
          responses: {
            "200": {
              description: "Appointments retrieved successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["data", "pagination"],
                    properties: {
                      data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Appointment" },
                      },
                      pagination: {
                        type: "object",
                        required: ["cursor", "has_more", "total"],
                        properties: {
                          cursor: { type: "string", example: "cur_next_98124" },
                          next_cursor: { type: "string", nullable: true, example: null },
                          has_more: { type: "boolean", example: false },
                          total: { type: "integer", example: 42 },
                        },
                      },
                    },
                  },
                },
              },
            },
            "401": { $ref: "#/components/responses/UnauthorizedError" },
          },
        },
        post: {
          tags: ["Appointments"],
          summary: "Book Appointment",
          description: "Creates and confirms a new patient appointment with an assigned practitioner. Supports Idempotency-Key header.",
          operationId: "createAppointment",
          security: [{ OAuth2: ["write:appointments"] }, { BearerAuth: [] }],
          parameters: [
            {
              name: "Idempotency-Key",
              in: "header",
              required: false,
              description: "Unique UUID v4 key guaranteeing idempotent execution",
              schema: { type: "string", format: "uuid" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["patientId", "doctorId", "date", "reason"],
                  properties: {
                    patientId: { type: "string", example: "pat_94821" },
                    doctorId: { type: "string", example: "doc_31204" },
                    date: { type: "string", format: "date-time", example: "2026-09-05T09:30:00Z" },
                    reason: { type: "string", example: "Routine hypertension follow-up" },
                    type: { type: "string", enum: ["IN_PERSON", "TELEHEALTH"], default: "IN_PERSON" },
                  },
                },
              },
            },
          },
          responses: {
            "201": {
              description: "Appointment booked successfully",
              headers: {
                "Idempotency-Key": {
                  schema: { type: "string" },
                  description: "Echoed idempotency key",
                },
              },
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Appointment" },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequestError" },
            "401": { $ref: "#/components/responses/UnauthorizedError" },
          },
        },
      },
      "/jobs": {
        post: {
          tags: ["System"],
          summary: "Submit Asynchronous Clinical Job",
          description: "Enqueues long-running clinical analytics, DICOM reconstruction, or lab report generation. Returns 202 Accepted with a polling Location header.",
          operationId: "createAsyncJob",
          security: [{ OAuth2: ["write:appointments"] }, { BearerAuth: [] }],
          parameters: [
            {
              name: "Idempotency-Key",
              in: "header",
              required: false,
              schema: { type: "string", format: "uuid" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["task"],
                  properties: {
                    task: { type: "string", example: "batch_telemetry_analysis" },
                    payload: { type: "object" },
                  },
                },
              },
            },
          },
          responses: {
            "202": {
              description: "Job accepted for processing",
              headers: {
                Location: {
                  schema: { type: "string" },
                  description: "URI to poll for job progress",
                },
              },
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["jobId", "status", "statusUrl"],
                    properties: {
                      jobId: { type: "string", example: "job_9841a" },
                      status: { type: "string", enum: ["pending", "processing", "completed", "failed"], example: "processing" },
                      statusUrl: { type: "string", example: "https://healos-theta.vercel.app/api/v1/jobs/job_9841a" },
                    },
                  },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequestError" },
          },
        },
      },
      "/jobs/{id}": {
        get: {
          tags: ["System"],
          summary: "Check Asynchronous Job Status",
          description: "Polls completion progress and retrieves output results for an asynchronous workload.",
          operationId: "getJobStatus",
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": {
              description: "Job status returned",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["jobId", "status", "progress"],
                    properties: {
                      jobId: { type: "string", example: "job_9841a" },
                      status: { type: "string", enum: ["pending", "processing", "completed", "failed"] },
                      progress: { type: "integer", example: 100 },
                      result: { type: "object" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/batch": {
        post: {
          tags: ["System"],
          summary: "Execute Bulk Operations",
          description: "Executes multiple atomic clinical read or mutation operations within a single request context.",
          operationId: "executeBatchOperations",
          security: [{ OAuth2: ["write:appointments"] }, { BearerAuth: [] }],
          parameters: [
            {
              name: "Idempotency-Key",
              in: "header",
              required: false,
              schema: { type: "string", format: "uuid" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["operations"],
                  properties: {
                    operations: {
                      type: "array",
                      items: {
                        type: "object",
                        required: ["method", "path"],
                        properties: {
                          method: { type: "string", enum: ["GET", "POST", "PUT", "DELETE"] },
                          path: { type: "string", example: "/appointments" },
                          body: { type: "object" },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Batch operations executed",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["total", "successful", "results"],
                    properties: {
                      total: { type: "integer", example: 3 },
                      successful: { type: "integer", example: 3 },
                      results: { type: "array", items: { type: "object" } },
                    },
                  },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequestError" },
          },
        },
      },
      "/patients": {
        get: {
          tags: ["Patients"],
          summary: "Search Patients",
          description: "Finds patient master demographic records matching name, MRN, or phone number.",
          operationId: "listPatients",
          security: [{ OAuth2: ["read:patients"] }, { BearerAuth: [] }],
          parameters: [
            {
              name: "query",
              in: "query",
              required: false,
              description: "Search text (name, MRN, or contact)",
              schema: { type: "string", example: "Elena Rostova" },
            },
          ],
          responses: {
            "200": {
              description: "Matching patient records",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["patients"],
                    properties: {
                      patients: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Patient" },
                      },
                    },
                  },
                },
              },
            },
            "401": { $ref: "#/components/responses/UnauthorizedError" },
          },
        },
      },
      "/patients/{id}/vitals": {
        get: {
          tags: ["Vitals"],
          summary: "Get Patient Vitals",
          description: "Returns recent telemetry and vitals observations for an admitted or outpatient individual.",
          operationId: "getPatientVitals",
          security: [{ OAuth2: ["read:vitals"] }, { BearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "Patient unique identifier",
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": {
              description: "Vitals history retrieved",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["vitals"],
                    properties: {
                      vitals: {
                        type: "array",
                        items: { $ref: "#/components/schemas/VitalsRecord" },
                      },
                    },
                  },
                },
              },
            },
            "401": { $ref: "#/components/responses/UnauthorizedError" },
          },
        },
        post: {
          tags: ["Vitals"],
          summary: "Record Vital Signs",
          description: "Records a vital signs observation during clinical nurse rounds.",
          operationId: "recordPatientVitals",
          security: [{ OAuth2: ["write:vitals"] }, { BearerAuth: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              description: "Patient unique identifier",
              schema: { type: "string" },
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/VitalsRecord" },
              },
            },
          },
          responses: {
            "201": {
              description: "Vitals successfully logged",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/VitalsRecord" },
                },
              },
            },
            "400": { $ref: "#/components/responses/BadRequestError" },
            "401": { $ref: "#/components/responses/UnauthorizedError" },
          },
        },
      },
      "/emergency/triage": {
        get: {
          tags: ["Emergency"],
          summary: "Get ED Triage Board",
          description: "Fetches active Emergency Department triage board entries sorted by acuity (ESI 1-5).",
          operationId: "getTriageBoard",
          security: [{ OAuth2: ["read:patients"] }, { BearerAuth: [] }],
          responses: {
            "200": {
              description: "Active emergency triage patients",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    required: ["queue", "resusAvailable"],
                    properties: {
                      queue: {
                        type: "array",
                        items: {
                          type: "object",
                          required: ["id", "chiefComplaint", "esiLevel", "minutesWaiting"],
                          properties: {
                            id: { type: "string", example: "ed_9182" },
                            chiefComplaint: { type: "string", example: "Acute chest pain radiating to left jaw" },
                            esiLevel: { type: "integer", minimum: 1, maximum: 5, example: 2 },
                            minutesWaiting: { type: "integer", example: 14 },
                          },
                        },
                      },
                      resusAvailable: { type: "integer", example: 2 },
                    },
                  },
                },
              },
            },
            "401": { $ref: "#/components/responses/UnauthorizedError" },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        OAuth2: {
          type: "oauth2",
          description: "OAuth 2.0 authorization with scoped access tokens",
          flows: {
            authorizationCode: {
              authorizationUrl: "https://healos-theta.vercel.app/api/auth/oauth2/authorize",
              tokenUrl: "https://healos-theta.vercel.app/api/auth/oauth2/token",
              scopes: {
                "read:patients": "Read patient medical records and demographic data",
                "write:patients": "Register and modify patient profiles",
                "read:appointments": "List scheduled clinical appointments",
                "write:appointments": "Book, reschedule, or cancel appointments",
                "read:vitals": "Access patient physiological vitals observations",
                "write:vitals": "Record new vital sign rounds",
                "read:reports": "View diagnostic laboratory and radiology reports",
              },
            },
            clientCredentials: {
              tokenUrl: "https://healos-theta.vercel.app/api/auth/oauth2/token",
              scopes: {
                "read:patients": "Read patient records",
                "read:appointments": "Read appointments",
                "write:appointments": "Book appointments",
              },
            },
          },
        },
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Personal Access Token or JWT session token",
        },
      },
      schemas: {
        Appointment: {
          type: "object",
          required: ["id", "patientId", "doctorId", "date", "status", "reason"],
          properties: {
            id: { type: "string", example: "apt_77810" },
            patientId: { type: "string", example: "pat_94821" },
            doctorId: { type: "string", example: "doc_31204" },
            date: { type: "string", format: "date-time", example: "2026-09-05T09:30:00Z" },
            status: { type: "string", enum: ["SCHEDULED", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED"], example: "CONFIRMED" },
            reason: { type: "string", example: "Routine hypertension follow-up" },
            room: { type: "string", example: "Room 402, East Wing" },
          },
        },
        Patient: {
          type: "object",
          required: ["id", "fullName", "dateOfBirth", "gender", "mrn"],
          properties: {
            id: { type: "string", example: "pat_94821" },
            fullName: { type: "string", example: "Elena Rostova" },
            dateOfBirth: { type: "string", format: "date", example: "1988-04-12" },
            gender: { type: "string", enum: ["MALE", "FEMALE", "OTHER"], example: "FEMALE" },
            mrn: { type: "string", example: "MRN-84729" },
            allergies: {
              type: "array",
              items: { type: "string" },
              example: ["Penicillin", "Latex"],
            },
          },
        },
        VitalsRecord: {
          type: "object",
          required: ["heartRate", "systolicBp", "diastolicBp", "spo2", "temperature", "recordedAt"],
          properties: {
            heartRate: { type: "integer", example: 74 },
            systolicBp: { type: "integer", example: 120 },
            diastolicBp: { type: "integer", example: 80 },
            spo2: { type: "number", example: 98.5 },
            temperature: { type: "number", example: 36.8 },
            recordedAt: { type: "string", format: "date-time", example: "2026-09-04T18:45:00Z" },
          },
        },
        ErrorModel: {
          type: "object",
          required: ["type", "title", "status", "detail"],
          properties: {
            type: { type: "string", format: "uri", example: "https://healos-theta.vercel.app/errors/bad-request" },
            title: { type: "string", example: "Bad Request" },
            status: { type: "integer", example: 400 },
            detail: { type: "string", example: "Field 'patientId' is required." },
            instance: { type: "string", example: "/api/v1/appointments" },
          },
        },
      },
      responses: {
        BadRequestError: {
          description: "Invalid request payload or validation failure (RFC 7807 Problem Details)",
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorModel" },
            },
          },
        },
        UnauthorizedError: {
          description: "Authentication token missing, expired, or lacking required scope (RFC 7807 Problem Details)",
          headers: {
            "WWW-Authenticate": {
              schema: { type: "string" },
              example: 'Bearer realm="HealOS", resource_metadata="https://healos-theta.vercel.app/.well-known/oauth-protected-resource"',
            },
          },
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ErrorModel" },
            },
          },
        },
      },
    },
  };

  return NextResponse.json(openApiSpec, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.oai.openapi+json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
