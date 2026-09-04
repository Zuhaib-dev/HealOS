import { NextResponse } from "next/server";

export const dynamic = "force-static";

export async function GET() {
  const directory = {
    keys: [
      {
        kty: "OKP",
        crv: "Ed25519",
        kid: "healos-bot-key-2026",
        use: "sig",
        alg: "EdDSA",
        x: "11qYAYKxCrfVS_7TyWQHOg7hcvPapiMlrwIaaPcHURo",
        nbf: 1704067200,
        exp: 1893456000,
      },
      {
        kty: "OKP",
        crv: "Ed25519",
        kid: "healos-agent-signing-key",
        use: "sig",
        alg: "EdDSA",
        x: "O2bqjt3mytQWmgTqlq3R8hgk5DTWCEhZn31w8vK3q1I",
        nbf: 1704067200,
        exp: 1893456000,
      },
    ],
    service: "https://healos-theta.vercel.app",
    documentation: "https://healos-theta.vercel.app/auth.md",
  };

  return NextResponse.json(directory, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
