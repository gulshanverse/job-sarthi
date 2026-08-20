import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { generateProfileGroundedInsight, generateProfileGroundedRecommendations } from "../ai";
import { getCandidateProfile, getJobsByIds, getLatestCareerInsight, getSavedJobIds, listJobs, listRecommendations, replaceRecommendations, saveCareerInsight } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const recommendationsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const savedIds = new Set(await getSavedJobIds(ctx.user.id));
    return (await listRecommendations(ctx.user.id)).map(item => ({ ...item, job: { ...item.job, saved: savedIds.has(item.job.id) } }));
  }),
  generate: protectedProcedure.mutation(async ({ ctx }) => {
    const profile = await getCandidateProfile(ctx.user.id);
    if (!profile?.profileConfirmed) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Complete and confirm your profile before generating recommendations." });
    const jobs = await listJobs();
    const recommendations = await generateProfileGroundedRecommendations(profile, jobs.slice(0, 24));
    await replaceRecommendations(ctx.user.id, recommendations);
    const savedIds = new Set(await getSavedJobIds(ctx.user.id));
    return (await listRecommendations(ctx.user.id)).map(item => ({ ...item, job: { ...item.job, saved: savedIds.has(item.job.id) } }));
  }),
  latestInsight: protectedProcedure.query(({ ctx }) => getLatestCareerInsight(ctx.user.id)),
  generateInsight: protectedProcedure.input(z.object({ jobIds: z.array(z.number().int().positive()).max(8).default([]) })).mutation(async ({ ctx, input }) => {
    const profile = await getCandidateProfile(ctx.user.id);
    if (!profile?.profileConfirmed) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Complete and confirm your profile before generating career guidance." });
    const existing = await listRecommendations(ctx.user.id);
    const recommendedIds = new Set(existing.map(item => item.job.id));
    const selectedIds = input.jobIds.filter(id => recommendedIds.has(id));
    const relevantJobs = await getJobsByIds(selectedIds.length ? selectedIds : existing.slice(0, 8).map(item => item.job.id));
    const insight = await generateProfileGroundedInsight(profile, relevantJobs);
    if (!insight?.narrative) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Career guidance could not be generated. Please try again." });
    await saveCareerInsight(ctx.user.id, insight);
    return getLatestCareerInsight(ctx.user.id);
  }),
});
