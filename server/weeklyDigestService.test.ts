import { beforeEach, describe, expect, it, vi } from "vitest";

const runtime = vi.hoisted(() => ({
  profiles: [] as Array<{ userId: number }>,
  claims: new Map<number, { delivery: { id: number }; claimed: boolean }>(),
  notifications: vi.fn(),
  finish: vi.fn(),
  update: vi.fn(),
  refresh: vi.fn(),
  recommendations: vi.fn(),
}));

vi.mock("./db", () => ({
  listWeeklyDigestCandidates: vi.fn(async () => runtime.profiles),
  claimWeeklyDigestDelivery: vi.fn(async (userId: number) => runtime.claims.get(userId) ?? { delivery: { id: userId }, claimed: true }),
  createNotification: runtime.notifications,
  finishWeeklyDigestDelivery: runtime.finish,
  updateWeeklyDigestSchedule: runtime.update,
  listRecommendations: runtime.recommendations,
}));
vi.mock("./recommendationRefresh", () => ({ refreshRecommendationsForUser: runtime.refresh }));

import { runWeeklyDigestBatch, weeklyDigestPeriodKey } from "./weeklyDigestService";

beforeEach(() => {
  runtime.profiles = [];
  runtime.claims.clear();
  runtime.notifications.mockReset();
  runtime.finish.mockReset();
  runtime.update.mockReset();
  runtime.refresh.mockReset();
  runtime.recommendations.mockReset();
  runtime.refresh.mockResolvedValue(undefined);
  runtime.recommendations.mockResolvedValue([]);
  runtime.finish.mockResolvedValue(undefined);
  runtime.update.mockResolvedValue(undefined);
  runtime.notifications.mockResolvedValue(undefined);
});

describe("weekly digest batch service", () => {
  it("uses an ISO UTC weekly period key", () => {
    expect(weeklyDigestPeriodKey(new Date("2026-08-17T09:00:00.000Z"))).toBe("2026-W34");
  });

  it("skips when no enabled confirmed profiles are available", async () => {
    await expect(runWeeklyDigestBatch({ now: new Date("2026-08-17T09:00:00.000Z") })).resolves.toMatchObject({ candidates: 0, delivered: 0, skipped: 0 });
    expect(runtime.notifications).not.toHaveBeenCalled();
  });

  it("creates one real in-app fallback and records pending email delivery", async () => {
    runtime.profiles = [{ userId: 11 }];
    runtime.recommendations.mockResolvedValue([{ job: { title: "Engineer", company: "Northstar" } }]);
    const result = await runWeeklyDigestBatch({ now: new Date("2026-08-17T09:00:00.000Z") });
    expect(result).toMatchObject({ delivered: 1, pendingEmailProvider: 1, failed: 0 });
    expect(runtime.notifications).toHaveBeenCalledWith(expect.objectContaining({ userId: 11, fingerprint: "weekly-digest:11:2026-W34" }));
    expect(runtime.finish).toHaveBeenCalledWith(11, expect.objectContaining({ status: "delivered", emailStatus: "pending_provider", recommendationCount: 1 }));
  });

  it("skips an already-claimed delivery period so repeated invocations cannot duplicate it", async () => {
    runtime.profiles = [{ userId: 12 }];
    runtime.claims.set(12, { delivery: { id: 12 }, claimed: false });
    await expect(runWeeklyDigestBatch({ now: new Date("2026-08-17T09:00:00.000Z") })).resolves.toMatchObject({ skipped: 1, delivered: 0 });
    expect(runtime.notifications).not.toHaveBeenCalled();
  });

  it("continues processing later users when one digest fails", async () => {
    runtime.profiles = [{ userId: 21 }, { userId: 22 }, { userId: 23 }];
    runtime.refresh.mockImplementation(async (userId: number) => { if (userId === 22) throw new Error("refresh failed"); });
    const result = await runWeeklyDigestBatch({ now: new Date("2026-08-17T09:00:00.000Z") });
    expect(result).toMatchObject({ delivered: 2, failed: 1, pendingEmailProvider: 2 });
    expect(runtime.finish).toHaveBeenCalledWith(22, expect.objectContaining({ status: "failed", emailStatus: "pending_provider", failureReason: "refresh failed" }));
    expect(runtime.notifications).toHaveBeenCalledTimes(2);
  });
});
