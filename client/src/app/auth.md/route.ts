import { NextResponse } from "next/server";

export const dynamic = "force-static";

const AUTH_MD_CONTENT = `# Authentication

This document outlines how autonomous AI agents and client applications authenticate with the HealOS Healthcare Platform API.

## Overview

HealOS implements standard **OAuth 2.0 (RFC 6749)** with **PKCE (RFC 7636)**, **OpenID Connect Core 1.0**, and **RFC 9728 (OAuth Protected Resource Metadata)**. All clinical requests must include a valid Bearer token in the HTTP \`Authorization\` header.

## Discovery Metadata

Agents can discover authorization endpoints and supported cryptographic configurations automatically:

- **OpenID Discovery**: [https://healos-theta.vercel.app/.well-known/openid-configuration](https://healos-theta.vercel.app/.well-known/openid-configuration)
- **Protected Resource Metadata (RFC 9728)**: [https://healos-theta.vercel.app/.well-known/oauth-protected-resource](https://healos-theta.vercel.app/.well-known/oauth-protected-resource)
- **OAuth Authorization Server Metadata**: [https://healos-theta.vercel.app/.well-known/oauth-authorization-server](https://healos-theta.vercel.app/.well-known/oauth-authorization-server)
- **OpenAPI Specification**: [https://healos-theta.vercel.app/openapi.json](https://healos-theta.vercel.app/openapi.json)

## Authorization Endpoints

| Flow | URL |
|:---|:---|
| **Authorization Endpoint** | \`https://healos-theta.vercel.app/api/auth/oauth2/authorize\` |
| **Token Endpoint** | \`https://healos-theta.vercel.app/api/auth/oauth2/token\` |
| **UserInfo Endpoint** | \`https://healos-theta.vercel.app/api/auth/oauth2/userinfo\` |

## Scopes and Permissions

HealOS enforces granular role-based and clinical-scoped permissions:

| Scope | Description | Allowed Roles |
|:---|:---|:---|
| \`read:patients\` | Read patient demographics and medical records | Doctor, Nurse, Admin, Reception |
| \`write:patients\` | Register and modify patient profiles | Reception, Admin |
| \`read:appointments\` | Query scheduled consultations | All authenticated roles |
| \`write:appointments\` | Book, reschedule, or cancel appointments | Patient, Doctor, Reception, Admin |
| \`read:vitals\` | Access physiological telemetry observations | Doctor, Nurse |
| \`write:vitals\` | Record new bedside vital signs rounds | Nurse, Doctor |
| \`read:reports\` | View radiology PACS and laboratory findings | Doctor, Radiologist, Lab Tech, Patient |
| \`emergency:triage\` | Manage Emergency Department triage priority | Triage Nurse, Emergency Physician |

## Using Tokens

Pass the access token as a Bearer credential in the standard \`Authorization\` header:

\`\`\`http
GET /api/v1/appointments HTTP/1.1
Host: healos-theta.vercel.app
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
Accept: application/json
\`\`\`

## Error Handling & WWW-Authenticate

When an unauthenticated or expired token request arrives, the server returns an HTTP \`401 Unauthorized\` response with a diagnostic \`WWW-Authenticate\` header pointing agents to the resource metadata:

\`\`\`http
HTTP/1.1 401 Unauthorized
Content-Type: application/json
WWW-Authenticate: Bearer realm="HealOS", resource_metadata="https://healos-theta.vercel.app/.well-known/oauth-protected-resource"

{
  "error": "Unauthorized",
  "message": "Valid Bearer token required. Refer to https://healos-theta.vercel.app/auth.md",
  "statusCode": 401
}
\`\`\`
`;

export async function GET() {
  return new NextResponse(AUTH_MD_CONTENT, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
