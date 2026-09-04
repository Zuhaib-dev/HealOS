import { NextResponse } from "next/server";

export const dynamic = "force-static";

const AUTH_MD_CONTENT = `# HealOS Authentication & Agent Authorization Walkthrough

---
title: HealOS Authentication & Authorization Walkthrough
description: Complete 8-step agent authentication guide for OAuth 2.0, PRM RFC 9728, and Bearer credential usage.
canonical: https://healos-theta.vercel.app/auth.md
last-updated: 2026-09-04
---

This document provides autonomous agents, developers, and LLM toolcallers with the complete 8-step walkthrough for discovering, obtaining, exchanging, using, and revoking API credentials for the HealOS Healthcare Platform.

---

## Discover

<a id="discover"></a>
<a id="oauth-protected-resource"></a>
<a id="oauth-authorization-server"></a>

Agents must discover authorization and resource metadata before making clinical requests:

- **OAuth Protected Resource Metadata (RFC 9728)**: [\`https://healos-theta.vercel.app/.well-known/oauth-protected-resource\`](https://healos-theta.vercel.app/.well-known/oauth-protected-resource)
- **OAuth Authorization Server Metadata**: [\`https://healos-theta.vercel.app/.well-known/oauth-authorization-server\`](https://healos-theta.vercel.app/.well-known/oauth-authorization-server)
- **OpenID Configuration**: [\`https://healos-theta.vercel.app/.well-known/openid-configuration\`](https://healos-theta.vercel.app/.well-known/openid-configuration)
- **OpenAPI 3.1 Specification**: [\`https://healos-theta.vercel.app/openapi.json\`](https://healos-theta.vercel.app/openapi.json)

---

## Pick a method

<a id="pick-a-method"></a>

HealOS supports three distinct authentication methods tailored for different client types:

1. **Client Credentials Flow (\`client_credentials\`)**: Recommended for backend AI agents, server daemons, and automated microservices requiring machine-to-machine clinical access.
2. **Instant Sandbox Token (\`sandbox\`)**: Zero-auth test environment for quick agent evaluation. Call \`POST /api/v1/sandbox\` or \`GET /api/v1/sandbox\` to receive immediate, rate-limited test credentials without registration friction.
3. **Authorization Code Flow with PKCE (\`authorization_code\`)**: Recommended for browser clients and user-facing clinician / patient applications.

---

## Register

<a id="register"></a>

Autonomous agents can dynamically register with the authorization server via RFC 7591 Dynamic Client Registration:

\`\`\`http
POST /api/auth/register HTTP/1.1
Host: healos-theta.vercel.app
Content-Type: application/json

{
  "client_name": "Autonomous Clinical Agent",
  "grant_types": ["client_credentials"],
  "response_types": ["token"],
  "token_endpoint_auth_method": "client_secret_post",
  "scope": "read:patients write:appointments read:vitals"
}
\`\`\`

The response returns your unique \`client_id\` and \`client_secret\`.

---

## Claim

<a id="claim"></a>

To claim an agent identity, present your registered credentials or sign an assertion using your agent JWK key:

\`\`\`http
POST /api/auth/oauth2/token HTTP/1.1
Host: healos-theta.vercel.app
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials&client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET&scope=read:patients%20write:appointments
\`\`\`

You can also probe identity verification via:
\`\`\`http
GET /agent/identity HTTP/1.1
Host: healos-theta.vercel.app
Authorization: Bearer YOUR_TOKEN
\`\`\`

---

## Exchange

<a id="exchange"></a>
<a id="token-exchange"></a>

### Token Exchange (RFC 8693)

To exchange an external identity assertion, Google token, or federated credentials for a HealOS clinical access token:

\`\`\`http
POST /api/auth/oauth2/token HTTP/1.1
Host: healos-theta.vercel.app
Content-Type: application/x-www-form-urlencoded

grant_type=urn:ietf:params:oauth:grant-type:token-exchange
&subject_token=EXTERNAL_IDENTITY_TOKEN
&subject_token_type=urn:ietf:params:oauth:token-type:jwt
&scope=read:patients%20write:appointments
\`\`\`

The authorization server exchanges the token and returns a scoped HealOS Bearer access token.

---

## Use credential

<a id="use-credential"></a>

Include the issued token in the standard HTTP \`Authorization\` header as a Bearer credential:

\`\`\`http
GET /api/v1/appointments HTTP/1.1
Host: healos-theta.vercel.app
Authorization: Bearer healos_live_eyJhbGciOiJSUzI1Ni...
Accept: application/json
\`\`\`

---

## Revocation

<a id="revocation"></a>

When an agent session completes or credentials need to be invalidated, invoke the token revocation endpoint (RFC 7009):

\`\`\`http
POST /api/auth/revoke HTTP/1.1
Host: healos-theta.vercel.app
Content-Type: application/x-www-form-urlencoded

token=YOUR_ACCESS_OR_REFRESH_TOKEN&token_type_hint=access_token
\`\`\`

The server returns HTTP \`200 OK\` confirming the credential is immediately revoked.

---

## Errors

<a id="errors"></a>
<a id="www-authenticate"></a>

When an unauthenticated, expired, or unauthorized request arrives, HealOS responds with an HTTP \`401 Unauthorized\` or \`403 Forbidden\` status, including a \`WWW-Authenticate\` header pointing directly to the Protected Resource Metadata:

\`\`\`http
HTTP/1.1 401 Unauthorized
Content-Type: application/json
WWW-Authenticate: Bearer realm="healos", resource_metadata="https://healos-theta.vercel.app/.well-known/oauth-protected-resource"

{
  "type": "https://healos-theta.vercel.app/errors/unauthorized",
  "title": "Unauthorized",
  "status": 401,
  "detail": "Bearer token required or invalid. Consult https://healos-theta.vercel.app/auth.md"
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
