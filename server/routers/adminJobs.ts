import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createIngestionRun, createJob, finishIngestionRun, getJob, getJobBySource, listAdminJobs, listIngestionRuns, reviewImportedJob, updateImportedJob, updateJobStatus } from "../db";
import { getConfiguredJobFeedProvider, normalizeFeedJob } from "../jobFeeds";
import { addNewJobToRelevantRecommendations } from "../newJobRefresh";
import { adminProcedure, router } from "../_core/trpc";

const statusSchema = z.enum(["active", "paused", "closed", "archived"]);
const reviewSchema = z.enum(["pending_review", "approved", "rejected"]);
const jobInput = z.object({
  title: z.string().min(2).max(180), company: z.string().min(2).max(180), location: z.string().min(2).max(180),
  workMode: z.enum(["remote", "hybrid", "onsite"]), employmentType: z.enum(["internship", "full_time"]), experienceLevel: z.enum(["student", "entry", "mid", "senior"]),
  salaryRange: z.string().max(100).nullable().default(null), description: z.string().min(30).max(12_000), responsibilities: z.array(z.string().min(2).max(500)).max(20).default([]),
  requirements: z.array(z.string().min(1).max(120)).min(1).max(40), niceToHave: z.array(z.string().min(1).max(120)).max(40).default([]), category: z.string().max(120).nullable().default(null),
  requiredEducation: z.string().max(180).nullable().default(null), applicationUrl: z.string().url().max(500).nullable().default(null), deadline: z.coerce.date().nullable().default(null), status: statusSchema.default("active"),
});

function assertPublishable(job: Awaited<ReturnType<typeof getJob>>) {
  if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found." });
  if (job.reviewStatus !== "approved") throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Approve this job before publishing it." });
  if (!job.applicationUrl || !job.requirements.length || job.description.trim().length < 30) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "A publishable job requires a description, required skills, and an external application URL." });
  return job;
}

export const adminJobsRouter = router({
  list: adminProcedure.query(() => listAdminJobs()),
  history: adminProcedure.query(() => listIngestionRuns()),
  providerStatus: adminProcedure.query(() => {
    const provider = getConfiguredJobFeedProvider();
    return { id: provider.id, label: provider.label, configured: provider.isConfigured() };
  }),
  create: adminProcedure.input(jobInput).mutation(async ({ input }) => {
    const now = new Date();
    const job = await createJob({ ...input, sourceProvider: "manual", sourceKey: `manual:${crypto.randomUUID()}`, reviewStatus: "approved", sourceUrl: input.applicationUrl, importedAt: null, lastSyncedAt: null, publishedAt: input.status === "active" ? now : null, reviewedAt: now, reviewedByUserId: null, rejectionReason: null, externalJobId: null, lastIngestionRunId: null });
    if (!job) throw new Error("Job creation did not return a record");
    const refresh = input.status === "active" ? await addNewJobToRelevantRecommendations(job) : { evaluated: 0, added: 0 };
    return { job, refresh };
  }),
  edit: adminProcedure.input(z.object({ jobId: z.number().int().positive(), values: jobInput.partial().omit({ status: true }) })).mutation(async ({ input }) => {
    const existing = await getJob(input.jobId);
    if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found." });
    const job = await updateImportedJob(existing.id, input.values);
    if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found." });
    return job;
  }),
  import: adminProcedure.mutation(async ({ ctx }) => {
    const provider = getConfiguredJobFeedProvider();
    const run = await createIngestionRun({ provider: provider.id, triggeredByUserId: ctx.user.id });
    if (!run) throw new Error("Could not start ingestion audit record.");
    if (!provider.isConfigured()) {
      await finishIngestionRun(run.id, { status: "failed", fetchedCount: 0, newCount: 0, updatedCount: 0, duplicateCount: 0, failedCount: 0, errorSummary: "No permitted verified feed is configured." });
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "No permitted verified job feed is configured. Existing jobs were not changed." });
    }
    let fetchedCount = 0; let newCount = 0; let updatedCount = 0; let duplicateCount = 0; let failedCount = 0; const errors: string[] = [];
    try {
      const rawJobs = await provider.fetchJobs(); fetchedCount = rawJobs.length;
      for (const raw of rawJobs) {
        try {
          const normalized = normalizeFeedJob(provider.id, raw);
          const existing = await getJobBySource(provider.id, normalized.sourceKey);
          if (existing) {
            await updateImportedJob(existing.id, { ...normalized, status: existing.status, reviewStatus: existing.reviewStatus, publishedAt: existing.publishedAt, reviewedAt: existing.reviewedAt, reviewedByUserId: existing.reviewedByUserId, rejectionReason: existing.rejectionReason, lastIngestionRunId: run.id });
            updatedCount += 1; duplicateCount += 1;
          } else {
            await createJob({ ...normalized, lastIngestionRunId: run.id }); newCount += 1;
          }
        } catch (error) { failedCount += 1; errors.push(error instanceof Error ? error.message : "Invalid feed item."); }
      }
      const status = failedCount ? "partial" : "completed";
      const completed = await finishIngestionRun(run.id, { status, fetchedCount, newCount, updatedCount, duplicateCount, failedCount, errorSummary: errors.slice(0, 3).join(" ") || null });
      return { run: completed, fetchedCount, newCount, updatedCount, duplicateCount, failedCount };
    } catch (error) {
      await finishIngestionRun(run.id, { status: "failed", fetchedCount, newCount, updatedCount, duplicateCount, failedCount: failedCount || 1, errorSummary: error instanceof Error ? error.message.slice(0, 1000) : "Feed import failed." });
      throw new TRPCError({ code: "BAD_GATEWAY", message: "The job feed could not be synchronized. Existing jobs were not changed." });
    }
  }),
  review: adminProcedure.input(z.object({ jobId: z.number().int().positive(), reviewStatus: z.enum(["approved", "rejected"]), rejectionReason: z.string().trim().max(500).nullable().default(null) })).mutation(async ({ ctx, input }) => {
    if (input.reviewStatus === "rejected" && !input.rejectionReason) throw new TRPCError({ code: "BAD_REQUEST", message: "Provide a short reason when rejecting an imported job." });
    const job = await reviewImportedJob(input.jobId, ctx.user.id, input);
    if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found." });
    return job;
  }),
  publish: adminProcedure.input(z.object({ jobId: z.number().int().positive() })).mutation(async ({ input }) => {
    const job = assertPublishable(await getJob(input.jobId));
    const published = await updateImportedJob(job.id, { status: "active", publishedAt: new Date() });
    if (!published) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found." });
    return { job: published, refresh: await addNewJobToRelevantRecommendations(published) };
  }),
  setStatus: adminProcedure.input(z.object({ jobId: z.number().int().positive(), status: statusSchema })).mutation(async ({ input }) => {
    if (input.status === "active") {
      const job = assertPublishable(await getJob(input.jobId));
      const published = await updateImportedJob(job.id, { status: "active", publishedAt: job.publishedAt ?? new Date() });
      if (!published) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found." });
      return { job: published, refresh: await addNewJobToRelevantRecommendations(published) };
    }
    const job = await updateJobStatus(input.jobId, input.status);
    if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found." });
    return { job, refresh: null };
  }),
  bulkReview: adminProcedure.input(z.object({ jobIds: z.array(z.number().int().positive()).min(1).max(100), reviewStatus: z.enum(["approved", "rejected"]), rejectionReason: z.string().trim().max(500).nullable().default(null) })).mutation(async ({ ctx, input }) => {
    if (input.reviewStatus === "rejected" && !input.rejectionReason) throw new TRPCError({ code: "BAD_REQUEST", message: "Provide a reason before rejecting selected jobs." });
    const results = await Promise.all(input.jobIds.map(jobId => reviewImportedJob(jobId, ctx.user.id, input)));
    return { requested: input.jobIds.length, updated: results.filter(Boolean).length };
  }),
  bulkSetStatus: adminProcedure.input(z.object({ jobIds: z.array(z.number().int().positive()).min(1).max(100), status: z.enum(["paused", "closed", "archived"]) })).mutation(async ({ input }) => {
    const results = await Promise.all(input.jobIds.map(jobId => updateJobStatus(jobId, input.status)));
    return { requested: input.jobIds.length, updated: results.filter(Boolean).length };
  }),
});
