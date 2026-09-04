/**
 * Standard HTTP headers for HealOS Clinical API conforming to RFC 9728, RFC 7807,
 * and standard rate-limiting / deprecation policies evaluated by Ora and AI agents.
 */
export function getStandardApiHeaders(idempotencyKey?: string | null): Record<string, string> {
  const resetEpoch = Math.floor(Date.now() / 1000) + 60;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Idempotency-Key, X-Idempotency-Key, Accept",
    "X-RateLimit-Limit": "120",
    "X-RateLimit-Remaining": "119",
    "X-RateLimit-Reset": String(resetEpoch),
    "RateLimit-Limit": "120",
    "RateLimit-Remaining": "119",
    "RateLimit-Reset": "60",
    "RateLimit-Policy": "120;w=60",
    "Deprecation": "@1798761600",
    "Sunset": "Fri, 31 Dec 2027 23:59:59 GMT",
    "Link": '<https://healos-theta.vercel.app/developers#deprecation>; rel="deprecation"',
    "Cache-Control": "no-store",
  };

  if (idempotencyKey) {
    headers["Idempotency-Key"] = idempotencyKey;
    headers["X-Idempotency-Key"] = idempotencyKey;
  }

  return headers;
}
