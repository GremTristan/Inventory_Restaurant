// Signed, expiring session/device tokens. Pure Web Crypto so the exact same
// code verifies tokens in proxy.ts (edge runtime) and in Server Components.
// Format: base64url(payload JSON) + "." + base64url(HMAC-SHA256(payload)).

import type { Role } from "@/types";

export interface SessionPayload {
  v: 1;
  kind: "session";
  uid: string;
  tid: string | null;
  role: Role;
  sid: string | null;
  exp: number; // unix seconds
}

// Binds a shared tablet to one site so staff can sign in with a PIN only.
export interface DevicePayload {
  v: 1;
  kind: "device";
  tid: string;
  sid: string;
  exp: number;
}

export type TokenPayload = SessionPayload | DevicePayload;

let warned = false;

function secretMaterial(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 16) return secret;
  // Fallback keeps local setups working; production must set SESSION_SECRET.
  const fallback = process.env.DATABASE_URL;
  if (!fallback) throw new Error("SESSION_SECRET is not configured");
  if (!warned) {
    warned = true;
    console.warn("[auth] SESSION_SECRET is not set — deriving a key from DATABASE_URL. Set SESSION_SECRET in production.");
  }
  return `fallback:${fallback}`;
}

async function hmacKey(): Promise<CryptoKey> {
  const material = new TextEncoder().encode(secretMaterial());
  const digest = await crypto.subtle.digest("SHA-256", material);
  return crypto.subtle.importKey("raw", digest, { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function signToken(payload: TokenPayload): Promise<string> {
  const key = await hmacKey();
  const body = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return `${body}.${toBase64Url(new Uint8Array(sig))}`;
}

export async function verifyToken<T extends TokenPayload["kind"]>(
  token: string | undefined,
  kind: T
): Promise<Extract<TokenPayload, { kind: T }> | null> {
  if (!token) return null;
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  try {
    const key = await hmacKey();
    const valid = await crypto.subtle.verify("HMAC", key, fromBase64Url(sig), new TextEncoder().encode(body));
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as TokenPayload;
    if (payload.v !== 1 || payload.kind !== kind) return null;
    if (typeof payload.exp !== "number" || payload.exp * 1000 < Date.now()) return null;
    return payload as Extract<TokenPayload, { kind: T }>;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = "cg_session";
export const DEVICE_COOKIE = "cg_device";
// Staff shifts are long; directors sit at a desk. One duration keeps things
// predictable: 12h for PIN sessions, 7 days for password sessions.
export const STAFF_SESSION_SECONDS = 60 * 60 * 12;
export const DIRECTOR_SESSION_SECONDS = 60 * 60 * 24 * 7;
export const DEVICE_SECONDS = 60 * 60 * 24 * 365;
