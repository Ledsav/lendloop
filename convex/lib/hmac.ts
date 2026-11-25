/**
 * HMAC-SHA256 request signing, shared by both directions of the n8n integration.
 *
 *   X-LendLoop-Timestamp: <unix seconds>
 *   X-LendLoop-Signature: v1=<hex HMAC-SHA256(secret, `${timestamp}.${rawBody}`)>
 *
 * The timestamp is part of the signed string and must be within TOLERANCE_SECONDS of the receiver's
 * clock, so a captured request can't be replayed later. Uses Web Crypto (available in Convex, Node
 * and n8n's Code node).
 */
export const TIMESTAMP_HEADER = "X-LendLoop-Timestamp";
export const SIGNATURE_HEADER = "X-LendLoop-Signature";
export const EVENT_ID_HEADER = "X-LendLoop-Event-Id";
export const TOLERANCE_SECONDS = 300;

const encoder = new TextEncoder();

export async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(mac), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function signatureHeaders(secret: string, body: string, nowMs: number = Date.now()) {
  const timestamp = Math.floor(nowMs / 1000).toString();
  return {
    [TIMESTAMP_HEADER]: timestamp,
    [SIGNATURE_HEADER]: `v1=${await hmacHex(secret, `${timestamp}.${body}`)}`,
  };
}

/** Compares in time independent of where the strings differ. */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export type VerifyResult = { ok: true } | { ok: false; reason: string };

export async function verifySignature(
  secret: string | undefined,
  body: string,
  timestamp: string | null,
  signature: string | null,
  nowMs: number = Date.now(),
): Promise<VerifyResult> {
  if (!secret) return { ok: false, reason: "receiver has no secret configured" };
  if (!timestamp || !signature) return { ok: false, reason: "missing signature headers" };
  if (!/^\d{1,12}$/.test(timestamp)) return { ok: false, reason: "bad timestamp" };
  if (Math.abs(nowMs / 1000 - Number(timestamp)) > TOLERANCE_SECONDS) return { ok: false, reason: "stale timestamp" };
  const expected = `v1=${await hmacHex(secret, `${timestamp}.${body}`)}`;
  return timingSafeEqual(expected, signature) ? { ok: true } : { ok: false, reason: "bad signature" };
}
