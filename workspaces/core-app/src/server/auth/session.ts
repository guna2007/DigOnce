import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { FastifyRequest } from "fastify";
import { ApiFailure } from "../errors";

export const OPERATOR_COOKIE = "onedig_operator_session";
export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

export function assertSameOrigin(request: FastifyRequest): void {
  const origin = request.headers.origin;
  if (!origin) throw new ApiFailure(403, "FORBIDDEN_ORIGIN", "This request origin is not allowed.");

  try {
    const originUrl = new URL(origin);
    const configuredOrigin = process.env.APP_ORIGIN;
    const allowed = configuredOrigin
      ? originUrl.origin === new URL(configuredOrigin).origin
      : originUrl.hostname === request.hostname;
    if (!allowed) throw new ApiFailure(403, "FORBIDDEN_ORIGIN", "This request origin is not allowed.");
  } catch (error) {
    if (error instanceof ApiFailure) throw error;
    throw new ApiFailure(403, "FORBIDDEN_ORIGIN", "This request origin is not allowed.");
  }
}

export function requireOperator(request: FastifyRequest): void {
  const session = readSessionToken(request.cookies?.[OPERATOR_COOKIE]);
  if (!session) throw new ApiFailure(401, "UNAUTHENTICATED", "Sign in to continue.");
}

interface SessionPayload {
  operatorLabel: string;
  expiresAt: number;
  nonce: string;
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function passwordDigest(password: string, secret: string): Buffer {
  const salt = createHmac("sha256", secret).update("onedig:operator-password-salt:v1").digest();
  return scryptSync(password, salt, 32);
}

export function isOperatorPasswordValid(candidate: string): boolean {
  const password = process.env.OPERATOR_PASSWORD;
  const secret = process.env.OPERATOR_SECRET;
  if (!password || !secret || secret.length < 32) return false;
  const expected = passwordDigest(password, secret);
  const actual = passwordDigest(candidate, secret);
  return timingSafeEqual(expected, actual);
}

export function createSessionToken(now = Date.now()): string | null {
  const secret = process.env.OPERATOR_SECRET;
  if (!secret || secret.length < 32) return null;
  const payload: SessionPayload = {
    operatorLabel: process.env.OPERATOR_LABEL?.trim() || "Operator",
    expiresAt: now + SESSION_MAX_AGE_SECONDS * 1000,
    nonce: randomBytes(16).toString("base64url"),
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded, secret)}`;
}

export function readSessionToken(token: string | undefined, now = Date.now()): SessionPayload | null {
  const secret = process.env.OPERATOR_SECRET;
  if (!token || !secret || secret.length < 32) return null;
  const [encoded, suppliedSignature, extra] = token.split(".");
  if (!encoded || !suppliedSignature || extra !== undefined) return null;

  const expectedSignature = Buffer.from(sign(encoded, secret), "base64url");
  const actualSignature = Buffer.from(suppliedSignature, "base64url");
  if (expectedSignature.length !== actualSignature.length || !timingSafeEqual(expectedSignature, actualSignature)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as Partial<SessionPayload>;
    if (typeof payload.operatorLabel !== "string" || typeof payload.expiresAt !== "number" ||
        typeof payload.nonce !== "string" || payload.expiresAt <= now) {
      return null;
    }
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}
