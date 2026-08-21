import { Algorithm, hash, verify } from "@node-rs/argon2";
import { createHash, randomBytes } from "node:crypto";
import { parse as parseCookie } from "cookie";
import type { Request, Response } from "express";
import * as db from "./db";

export const AUTH_SESSION_COOKIE = "job_sarthi_session";
export const AUTH_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

type RateEntry = { count: number; resetAt: number };
const rateWindows = new Map<string, RateEntry>();

function secureRequest(req: Request) {
  if (req.protocol === "https") return true;
  const forwarded = req.headers["x-forwarded-proto"];
  return (Array.isArray(forwarded) ? forwarded : String(forwarded ?? "").split(",")).some(value => value.trim().toLowerCase() === "https");
}

export function sessionCookieOptions(req: Request) {
  return { httpOnly: true, secure: secureRequest(req), sameSite: "lax" as const, path: "/" };
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function passwordProblem(password: string) {
  if (password.length < 10) return "Use at least 10 characters.";
  if (password.length > 200) return "Password is too long.";
  if (/^(password|password123|1234567890|qwertyuiop)$/i.test(password)) return "Choose a less predictable password.";
  return null;
}

export async function hashPassword(password: string) {
  return hash(password, { algorithm: Algorithm.Argon2id, memoryCost: 19_456, timeCost: 2, parallelism: 1 });
}

export async function verifyPassword(hash: string, password: string) {
  return verify(hash, password);
}

export function hashToken(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function randomToken() {
  return randomBytes(32).toString("base64url");
}

export function allowRateLimit(key: string, limit = 8, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const existing = rateWindows.get(key);
  if (!existing || existing.resetAt <= now) {
    rateWindows.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (existing.count >= limit) return false;
  existing.count += 1;
  return true;
}

function clientFingerprint(req: Request) {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  return hashToken(ip);
}

export async function establishSession(req: Request, res: Response, userId: number, rotatedFromSessionId?: number | null) {
  const token = randomToken();
  const session = await db.createAuthSession({
    userId,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + AUTH_SESSION_TTL_MS),
    userAgent: req.get("user-agent")?.slice(0, 250) ?? null,
    ipHash: clientFingerprint(req),
    rotatedFromSessionId: rotatedFromSessionId ?? null,
  });
  res.cookie(AUTH_SESSION_COOKIE, token, { ...sessionCookieOptions(req), maxAge: AUTH_SESSION_TTL_MS });
  return session;
}

export async function resolveSession(req: Request) {
  const token = parseCookie(req.headers.cookie ?? "")[AUTH_SESSION_COOKIE];
  if (!token) return null;
  const record = await db.getActiveSessionWithUser(hashToken(token));
  if (!record) return null;
  await db.touchAuthSession(record.session.id);
  return record;
}

export async function clearCurrentSession(req: Request, res: Response, sessionId: number | null) {
  if (sessionId) await db.revokeAuthSession(sessionId);
  res.clearCookie(AUTH_SESSION_COOKIE, { ...sessionCookieOptions(req), maxAge: -1 });
}

export async function issuePasswordReset(userId: number) {
  const token = randomToken();
  await db.createPasswordResetToken({ userId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) });
  return token;
}

export async function consumePasswordReset(rawToken: string) {
  const reset = await db.getUsablePasswordResetToken(hashToken(rawToken));
  if (!reset) return null;
  await db.consumePasswordResetToken(reset.id);
  return reset;
}
