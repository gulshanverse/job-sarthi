import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createNotification, getJob, getSavedJobIds, listApplications, listJobsPage, listSavedJobs, saveJob, unsaveJob, upsertApplication } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

const filters = z.object({
  query: z.string().max(120).optional(),
  role: z.string().max(120).optional(),
  location: z.string().max(120).optional(),
  skills: z.string().max(120).optional(),
  category: z.string().max(120).optional(),
  workMode: z.enum(["remote", "hybrid", "onsite"]).optional(),
  employmentType: z.enum(["internship", "full_time"]).optional(),
  experienceLevel: z.enum(["student", "entry", "mid", "senior"]).optional(),
  sort: z.enum(["latest", "title"]).default("latest"),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(6).max(24).default(12),
});

export const jobsRouter = router({
  list: protectedProcedure.input(filters).query(async ({ ctx, input }) => {
    const result = await listJobsPage(input);
    const savedIds = new Set(await getSavedJobIds(ctx.user.id));
    return { items: result.items.map(job => ({ ...job, saved: savedIds.has(job.id) })), total: result.total, page: input.page, pageSize: input.pageSize };
  }),
  get: protectedProcedure.input(z.object({ jobId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    const job = await getJob(input.jobId);
    if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found." });
    const saved = (await getSavedJobIds(ctx.user.id)).includes(job.id);
    return { ...job, saved };
  }),
  toggleSaved: protectedProcedure.input(z.object({ jobId: z.number().int().positive(), saved: z.boolean() })).mutation(async ({ ctx, input }) => {
    if (!await getJob(input.jobId)) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found." });
    if (input.saved) await saveJob(ctx.user.id, input.jobId); else await unsaveJob(ctx.user.id, input.jobId);
    return { success: true };
  }),
  saved: protectedProcedure.query(async ({ ctx }) => (await listSavedJobs(ctx.user.id)).map(({ job }) => ({ ...job, saved: true }))),
  applications: protectedProcedure.query(({ ctx }) => listApplications(ctx.user.id)),
  setApplicationStatus: protectedProcedure.input(z.object({
    jobId: z.number().int().positive(),
    status: z.enum(["saved", "applied", "under_review", "interviewing", "offer", "selected", "rejected"]),
    notes: z.string().max(2000).optional(),
  })).mutation(async ({ ctx, input }) => {
    const job = await getJob(input.jobId);
    if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found." });
    await upsertApplication(ctx.user.id, input.jobId, input.status, input.notes);
    const milestone = input.status === "under_review" ? ["Application under review", `You marked ${job.title} at ${job.company} as under review.`] : input.status === "interviewing" ? ["Interview stage recorded", `You marked ${job.title} at ${job.company} as interviewing.`] : input.status === "offer" ? ["Offer stage recorded", `You marked ${job.title} at ${job.company} as an offer.`] : input.status === "selected" ? ["Selected stage recorded", `You marked ${job.title} at ${job.company} as selected.`] : null;
    if (milestone) await createNotification({ userId: ctx.user.id, type: `application_${input.status}`, title: milestone[0], body: milestone[1], href: "/applications", fingerprint: `application:${job.id}:${input.status}` });
    return { success: true };
  }),
});
