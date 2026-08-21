import { afterEach, describe, expect, it } from "vitest";
import { schedulerHealth } from "./internalScheduler";
import { resetSchedulerAuthRateLimitForTests } from "./schedulerAuth";

function responseRecorder() {
  const result: { status?: number; body?: unknown } = {};
  const res = {
    status(code: number) { result.status = code; return this; },
    json(body: unknown) { result.body = body; return this; },
  };
  return { res, result };
}

function requestWithAuthorization(authorization?: string) {
  return {
    headers: authorization ? { authorization } : {},
    header(name: string) { return this.headers[name.toLowerCase() as "authorization"]; },
    ip: "127.0.0.1",
    socket: { remoteAddress: "127.0.0.1" },
  };
}

afterEach(() => resetSchedulerAuthRateLimitForTests());

describe("internal scheduler health", () => {
  it("accepts only the configured Job Sarthi scheduler secret", () => {
    const secret = process.env.JOB_SCHEDULER_SECRET;
    expect(secret).toBeTruthy();

    const success = responseRecorder();
    schedulerHealth(requestWithAuthorization(`Bearer ${secret}`) as never, success.res as never);
    expect(success.result.body).toMatchObject({ ok: true, authentication: "job-sarthi-machine-secret" });

    const missing = responseRecorder();
    schedulerHealth(requestWithAuthorization() as never, missing.res as never);
    expect(missing.result).toMatchObject({ status: 401, body: { error: "scheduler-unauthorized" } });

    const candidateCookie = responseRecorder();
    schedulerHealth(requestWithAuthorization("Bearer candidate-session-token") as never, candidateCookie.res as never);
    expect(candidateCookie.result).toMatchObject({ status: 401, body: { error: "scheduler-unauthorized" } });
  });

  it("rate limits repeated invalid machine-credential attempts", () => {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const res = responseRecorder();
      schedulerHealth(requestWithAuthorization("Bearer invalid") as never, res.res as never);
      expect(res.result.status).toBe(401);
    }
    const limited = responseRecorder();
    schedulerHealth(requestWithAuthorization("Bearer invalid") as never, limited.res as never);
    expect(limited.result).toMatchObject({ status: 429, body: { error: "scheduler-rate-limited" } });
  });
});
