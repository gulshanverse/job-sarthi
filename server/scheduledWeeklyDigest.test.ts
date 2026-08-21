import { beforeEach, describe, expect, it, vi } from "vitest";

const runtime = vi.hoisted(() => ({ authorized: true, run: vi.fn() }));
vi.mock("./schedulerAuth", () => ({ requireSchedulerAuth: vi.fn(() => runtime.authorized) }));
vi.mock("./weeklyDigestService", () => ({ runWeeklyDigestBatch: runtime.run }));
import { scheduledWeeklyDigest } from "./scheduledWeeklyDigest";

function response() { const result = { status: vi.fn(), json: vi.fn() }; result.status.mockReturnValue(result); return result; }

beforeEach(() => { runtime.authorized = true; runtime.run.mockReset(); runtime.run.mockResolvedValue({ periodKey: "2026-W34", candidates: 1, delivered: 1, skipped: 0, failed: 0, pendingEmailProvider: 1 }); });

describe("internal weekly digest endpoint", () => {
  it("runs only after the Job Sarthi machine guard succeeds", async () => {
    const res = response();
    await scheduledWeeklyDigest({} as never, res as never);
    expect(runtime.run).toHaveBeenCalledOnce();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ ok: true, delivered: 1 }));
  });

  it("does not run when a candidate or administrator request lacks the machine credential", async () => {
    runtime.authorized = false;
    const res = response();
    await scheduledWeeklyDigest({ headers: { cookie: "job_sarthi_session=candidate-or-admin" } } as never, res as never);
    expect(runtime.run).not.toHaveBeenCalled();
  });
});
