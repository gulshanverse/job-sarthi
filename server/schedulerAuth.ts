import { timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";
import { ENV } from "./_core/env";

const WINDOW_MS = 60_000;
const MAX_ATTEMPTS_PER_WINDOW = 12;
const attempts = new Map<string, { count: number; resetAt: number }>();

function requesterKey(req: Request) {
  return req.ip || req.socket.remoteAddress || "unknown";
}

function allowAttempt(req: Request) {
  const now = Date.now();
  const key = requesterKey(req);
  const record = attempts.get(key);
  if (!record || record.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (record.count >= MAX_ATTEMPTS_PER_WINDOW) return false;
  record.count += 1;
  return true;
}

function hasValidBearerToken(req: Request) {
  const header = req.header("authorization") ?? "";
  const supplied = header.startsWith("Bearer ")
    ? header.slice("Bearer ".length).trim()
    : "";
  const expected = ENV.schedulerSecret;
  if (!expected || !supplied) return false;
  const suppliedBuffer = Buffer.from(supplied);
  const expectedBuffer = Buffer.from(expected);
  return (
    suppliedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(suppliedBuffer, expectedBuffer)
  );
}

/**
 * Grants only the application-owned machine identity. Browser session cookies,
 * candidate accounts, and administrator accounts never satisfy this guard.
 */
export function requireSchedulerAuth(req: Request, res: Response) {
  if (!ENV.schedulerSecret) {
    res.status(503).json({ error: "scheduler-unavailable" });
    return false;
  }
  if (!allowAttempt(req)) {
    res.status(429).json({ error: "scheduler-rate-limited" });
    return false;
  }
  if (!hasValidBearerToken(req)) {
    res.status(401).json({ error: "scheduler-unauthorized" });
    return false;
  }
  return true;
}

export function resetSchedulerAuthRateLimitForTests() {
  attempts.clear();
}
