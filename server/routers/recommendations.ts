import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { generateProfileGroundedInsight } from "../ai";
import { getCandidateProfile, getJobsByIds, getLatestCareerInsight, getSavedJobIds, listRecommendations, saveCareerInsight } from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { skillKey } from "../skills";
import { refreshRecommendationsForUser } from "../recommendationRefresh";

export const recommendationsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const savedIds = new Set(await getSavedJobIds(ctx.user.id));
    return (await listRecommendations(ctx.user.id)).map(item => ({ ...item, job: { ...item.job, saved: savedIds.has(item.job.id) } }));
  }),
  generate: protectedProcedure.mutation(async ({ ctx }) => {
    const profile = await getCandidateProfile(ctx.user.id);
    if (!profile?.profileConfirmed) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Complete and confirm your profile before generating recommendations." });
    await refreshRecommendationsForUser(ctx.user.id);
    const savedIds = new Set(await getSavedJobIds(ctx.user.id));
    return (await listRecommendations(ctx.user.id)).map(item => ({ ...item, job: { ...item.job, saved: savedIds.has(item.job.id) } }));
  }),
  latestInsight: protectedProcedure.query(({ ctx }) => getLatestCareerInsight(ctx.user.id)),
  skillGapFrequencies: protectedProcedure.input(z.object({ jobIds: z.array(z.number().int().positive()).max(8).default([]) })).query(async ({ ctx, input }) => {
    const profile = await getCandidateProfile(ctx.user.id);
    if (!profile?.profileConfirmed) return [];
    const profileSkills = new Set(profile.skills.map(skillKey));
    const counts = new Map<string, { skill: string; count: number }>();
    const recommendations = await listRecommendations(ctx.user.id);
    const allowedIds = new Set(recommendations.map(item => item.job.id));
    const selectedIds = input.jobIds.filter(id => allowedIds.has(id));
    const context = selectedIds.length ? recommendations.filter(item => selectedIds.includes(item.job.id)) : recommendations.slice(0, 8);
    for (const item of context) {
      for (const requirement of item.job.requirements) {
        const key = skillKey(requirement);
        if (profileSkills.has(key)) continue;
        const current = counts.get(key) ?? { skill: requirement, count: 0 };
        current.count += 1;
        counts.set(key, current);
      }
    }
    return Array.from(counts.values()).sort((a, b) => b.count - a.count || a.skill.localeCompare(b.skill)).slice(0, 6);
  }),
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
