import "server-only";

import { createPublicKey, verify as verifySignature } from "node:crypto";

import { publicEnv } from "@/lib/env";

const CERTS_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
const CLOCK_SKEW_SECONDS = 60;

type JsonObject = Record<string, unknown>;

type CertCache = {
  certs: Record<string, string>;
  expiresAt: number;
};

const globalForFirebase = globalThis as typeof globalThis & {
  __starviaFirebaseCerts?: CertCache;
};

export interface VerifiedFirebaseUser {
  uid: string;
  email: string;
  name: string | null;
  picture: string | null;
  projectId: string;
}

function decodePart(value: string): JsonObject {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Invalid token payload");
    }
    return parsed as JsonObject;
  } catch {
    throw new Error("Invalid Firebase ID token.");
  }
}

function stringClaim(payload: JsonObject, key: string) {
  const value = payload[key];
  return typeof value === "string" ? value : "";
}

function numberClaim(payload: JsonObject, key: string) {
  const value = payload[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

async function googleCertificates() {
  const cached = globalForFirebase.__starviaFirebaseCerts;
  if (cached && cached.expiresAt > Date.now() + 5_000) return cached.certs;

  const response = await fetch(CERTS_URL, {
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error("Google certificate service is unavailable.");

  const body = (await response.json()) as unknown;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error("Google returned invalid signing certificates.");
  }

  const certs = Object.fromEntries(
    Object.entries(body as Record<string, unknown>).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
  if (!Object.keys(certs).length) throw new Error("No Google signing certificates were returned.");

  const cacheControl = response.headers.get("cache-control") ?? "";
  const maxAge = Number(cacheControl.match(/max-age=(\d+)/i)?.[1] ?? 3600);
  globalForFirebase.__starviaFirebaseCerts = {
    certs,
    expiresAt: Date.now() + Math.max(60, maxAge) * 1_000,
  };
  return certs;
}

/**
 * Verifies a Firebase ID token without firebase-admin. The signature, issuer,
 * audience, timestamps and verified Google email are all checked server-side.
 */
export async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedFirebaseUser> {
  const projectId = publicEnv.firebaseProjectId;
  if (!projectId) throw new Error("Firebase authentication is not configured.");
  if (!idToken || idToken.length > 8_192) throw new Error("Invalid Firebase ID token.");

  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("Invalid Firebase ID token.");
  const [encodedHeader, encodedPayload, encodedSignature] = parts as [string, string, string];
  const header = decodePart(encodedHeader);
  const payload = decodePart(encodedPayload);

  const algorithm = stringClaim(header, "alg");
  const keyId = stringClaim(header, "kid");
  if (algorithm !== "RS256" || !keyId) throw new Error("Invalid Firebase signing header.");

  const certs = await googleCertificates();
  const certificate = certs[keyId];
  if (!certificate) throw new Error("Firebase signing key is no longer valid.");

  const validSignature = verifySignature(
    "RSA-SHA256",
    Buffer.from(`${encodedHeader}.${encodedPayload}`),
    createPublicKey(certificate),
    Buffer.from(encodedSignature, "base64url"),
  );
  if (!validSignature) throw new Error("Invalid Firebase token signature.");

  const now = Math.floor(Date.now() / 1_000);
  const audience = stringClaim(payload, "aud");
  const issuer = stringClaim(payload, "iss");
  const subject = stringClaim(payload, "sub");
  const expiresAt = numberClaim(payload, "exp");
  const issuedAt = numberClaim(payload, "iat");
  const authTime = numberClaim(payload, "auth_time");
  const email = stringClaim(payload, "email").trim().toLowerCase();

  if (audience !== projectId) throw new Error("Firebase token audience does not match.");
  if (issuer !== `https://securetoken.google.com/${projectId}`) {
    throw new Error("Firebase token issuer does not match.");
  }
  if (!subject || subject.length > 128) throw new Error("Firebase user id is invalid.");
  if (!expiresAt || expiresAt < now - CLOCK_SKEW_SECONDS) throw new Error("Firebase ID token has expired.");
  if (!issuedAt || issuedAt > now + CLOCK_SKEW_SECONDS) throw new Error("Firebase ID token was issued in the future.");
  if (authTime && authTime > now + CLOCK_SKEW_SECONDS) throw new Error("Firebase authentication time is invalid.");
  if (!email || payload.email_verified !== true) throw new Error("Google email is not verified.");

  return {
    uid: subject,
    email,
    name: stringClaim(payload, "name") || null,
    picture: stringClaim(payload, "picture") || null,
    projectId,
  };
}
