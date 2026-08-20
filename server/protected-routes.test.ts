import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

describe("protected Job Sarthi routes", () => {
  it("rejects unauthenticated profile, jobs, and recommendation requests", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: {} as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    await expect(caller.profile.get()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.jobs.list({ page: 1, pageSize: 9 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.recommendations.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("validates protected profile and jobs procedure inputs before execution", async () => {
    const user = {
      id: 1,
      openId: "candidate-1",
      name: "Candidate",
      email: "candidate@example.com",
      loginMethod: "manus",
      role: "user" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };
    const ctx: TrpcContext = { user, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] };
    const caller = appRouter.createCaller(ctx);
    await expect(caller.jobs.list({ page: 0, pageSize: 9 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.profile.upsert({
      headline: "x".repeat(181),
      bio: null,
      desiredRoles: [],
      desiredLocations: [],
      workPreference: "flexible",
      employmentPreference: "both",
      experienceLevel: "entry",
      skills: [],
      experience: [],
      education: [],
      profileConfirmed: false,
      onboardingStep: 0,
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.jobs.get({ jobId: 0 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.jobs.setApplicationStatus({ jobId: 1, status: "invalid" as "saved" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller.recommendations.generateInsight({ jobIds: Array.from({ length: 9 }, (_, index) => index + 1) })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
