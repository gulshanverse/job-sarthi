import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getJob, getSavedJobIds, listApplications, listJobs, saveJob, unsaveJob, upsertApplication } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

const filters = z.object({
  query: z.string().max(120).optional(),
  role: z.string().max(120).optional(),
  location: z.string().max(120).optional(),
  workMode: z.enum(["remote", "hybrid", "onsite"]).optional(),
  employmentType: z.enum(["internship", "full_time"]).optional(),
  experienceLevel: z.enum(["student", "entry", "mid", "senior"]).optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(6).max(24).default(12),
});

export const jobsRouter = router({
  list: protectedProcedure.input(filters).query(async ({ ctx, input }) => {
    const query = (input.query ?? "").trim().toLowerCase();
    const role = (input.role ?? "").trim().toLowerCase();
    const location = (input.location ?? "").trim().toLowerCase();
    const allJobs = await listJobs();
    const filtered = allJobs.filter(job => {
      const haystack = `${job.title} ${job.company} ${job.location} ${job.description} ${job.requirements.join(" ")}`.toLowerCase();
      return (!query || haystack.includes(query)) &&
        (!role || job.title.toLowerCase().includes(role)) &&
        (!location || job.location.toLowerCase().includes(location)) &&
        (!input.workMode || job.workMode === input.workMode) &&
        (!input.employmentType || job.employmentType === input.employmentType) &&
        (!input.experienceLevel || job.experienceLevel === input.experienceLevel);
    });
    const savedIds = new Set(await getSavedJobIds(ctx.user.id));
    const start = (input.page - 1) * input.pageSize;
    return { items: filtered.slice(start, start + input.pageSize).map(job => ({ ...job, saved: savedIds.has(job.id) })), total: filtered.length, page: input.page, pageSize: input.pageSize };
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
  applications: protectedProcedure.query(({ ctx }) => listApplications(ctx.user.id)),
  setApplicationStatus: protectedProcedure.input(z.object({
    jobId: z.number().int().positive(),
    status: z.enum(["saved", "applied", "interviewing", "offer", "rejected"]),
    notes: z.string().max(2000).optional(),
  })).mutation(async ({ ctx, input }) => {
    if (!await getJob(input.jobId)) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found." });
    await upsertApplication(ctx.user.id, input.jobId, input.status, input.notes);
    return { success: true };
  }),
});
