import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";

const dbMocks = vi.hoisted(() => ({ createIngestionRun: vi.fn(), createJob: vi.fn(), finishIngestionRun: vi.fn(), getJob: vi.fn(), getJobBySource: vi.fn(), listAdminJobs: vi.fn(), listIngestionRuns: vi.fn(), reviewImportedJob: vi.fn(), updateImportedJob: vi.fn(), updateJobStatus: vi.fn() }));
const providerState = vi.hoisted(() => ({ configured: false }));
const refresh = vi.hoisted(() => vi.fn());
vi.mock("../db", () => dbMocks);
vi.mock("../jobFeeds", () => ({ getConfiguredJobFeedProvider: () => ({ id: "verified-feed", label: "Verified feed", isConfigured: () => providerState.configured, fetchJobs: vi.fn() }), normalizeFeedJob: vi.fn() }));
vi.mock("../newJobRefresh", () => ({ addNewJobToRelevantRecommendations: refresh }));
import { adminJobsRouter } from "./adminJobs";

const admin = { id: 5, openId: "preserved-admin", name: "Admin", email: "admin@example.com", passwordHash: "hash", authStatus: "active" as const, emailVerified: false, termsAcceptedAt: null, passwordChangedAt: new Date(), loginMethod: "password", role: "admin" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() };
const context = { user: admin, sessionId: 2, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] } as TrpcContext;
const approvedJob = { id: 73, reviewStatus: "approved", description: "A legitimate job description that is longer than thirty characters.", requirements: ["TypeScript"], applicationUrl: "https://example.com/apply", publishedAt: null };

describe("admin job ingestion lifecycle", () => {
  beforeEach(() => { vi.clearAllMocks(); providerState.configured = false; dbMocks.createIngestionRun.mockResolvedValue({ id: 9 }); dbMocks.finishIngestionRun.mockResolvedValue({ id: 9, status: "failed" }); refresh.mockResolvedValue({ evaluated: 0, added: 0 }); });

  it("audits a failed import without mutating jobs when no verified feed is connected", async () => {
    await expect(adminJobsRouter.createCaller(context).import()).rejects.toMatchObject({ code: "PRECONDITION_FAILED" });
    expect(dbMocks.createIngestionRun).toHaveBeenCalledWith({ provider: "verified-feed", triggeredByUserId: admin.id });
    expect(dbMocks.finishIngestionRun).toHaveBeenCalledWith(9, expect.objectContaining({ status: "failed", fetchedCount: 0, newCount: 0, updatedCount: 0 }));
    expect(dbMocks.createJob).not.toHaveBeenCalled();
  });

  it("records review before publishing an approved, candidate-safe role", async () => {
    dbMocks.reviewImportedJob.mockResolvedValue({ ...approvedJob, reviewStatus: "approved" });
    dbMocks.getJob.mockResolvedValue(approvedJob);
    dbMocks.updateImportedJob.mockResolvedValue({ ...approvedJob, status: "active" });
    await expect(adminJobsRouter.createCaller(context).review({ jobId: approvedJob.id, reviewStatus: "approved", rejectionReason: null })).resolves.toMatchObject({ reviewStatus: "approved" });
    await expect(adminJobsRouter.createCaller(context).publish({ jobId: approvedJob.id })).resolves.toMatchObject({ job: expect.objectContaining({ status: "active" }), refresh: { evaluated: 0, added: 0 } });
    expect(dbMocks.reviewImportedJob).toHaveBeenCalledWith(approvedJob.id, admin.id, { jobId: approvedJob.id, reviewStatus: "approved", rejectionReason: null });
    expect(dbMocks.updateImportedJob).toHaveBeenCalledWith(approvedJob.id, expect.objectContaining({ status: "active", publishedAt: expect.any(Date) }));
    expect(refresh).toHaveBeenCalled();
  });
});
