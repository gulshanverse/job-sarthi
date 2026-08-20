import { z } from "zod";
import { createJob, listAdminJobs, updateJobStatus } from "../db";
import { addNewJobToRelevantRecommendations } from "../newJobRefresh";
import { adminProcedure, router } from "../_core/trpc";

const jobInput = z.object({
  title: z.string().min(2).max(180), company: z.string().min(2).max(180), location: z.string().min(2).max(180),
  workMode: z.enum(["remote", "hybrid", "onsite"]), employmentType: z.enum(["internship", "full_time"]), experienceLevel: z.enum(["student", "entry", "mid", "senior"]),
  salaryRange: z.string().max(100).nullable().default(null), description: z.string().min(30).max(12_000), responsibilities: z.array(z.string().min(2).max(500)).max(20).default([]),
  requirements: z.array(z.string().min(1).max(120)).min(1).max(40), niceToHave: z.array(z.string().min(1).max(120)).max(40).default([]), category: z.string().max(120).nullable().default(null),
  requiredEducation: z.string().max(180).nullable().default(null), applicationUrl: z.string().url().max(500).nullable().default(null), deadline: z.coerce.date().nullable().default(null), status: z.enum(["active", "paused", "closed"]).default("active"),
});

export const adminJobsRouter = router({
  list: adminProcedure.query(() => listAdminJobs()),
  create: adminProcedure.input(jobInput).mutation(async ({ input }) => {
    const job = await createJob(input);
    if (!job) throw new Error("Job creation did not return a record");
    const refresh = await addNewJobToRelevantRecommendations(job);
    return { job, refresh };
  }),
  setStatus: adminProcedure.input(z.object({ jobId: z.number().int().positive(), status: z.enum(["active", "paused", "closed"]) })).mutation(async ({ input }) => {
    const job = await updateJobStatus(input.jobId, input.status);
    if (!job) throw new Error("Job not found");
    const refresh = input.status === "active" ? await addNewJobToRelevantRecommendations(job) : null;
    return { job, refresh };
  }),
});
