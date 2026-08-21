import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getCandidateProfile, updateWeeklyDigestSchedule } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

export const digestRouter = router({
  status: protectedProcedure.query(async ({ ctx }) => {
    const profile = await getCandidateProfile(ctx.user.id);
    return { enabled: profile?.weeklyDigestEnabled ?? false, scheduled: Boolean(profile?.weeklyDigestCronTaskUid), nextFrequency: "Weekly on Monday at 09:00 UTC" };
  }),
  configure: protectedProcedure.input(z.object({ enabled: z.boolean() })).mutation(async ({ ctx, input }) => {
    const profile = await getCandidateProfile(ctx.user.id);
    if (!profile?.profileConfirmed) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Confirm your profile before enabling a weekly digest." });
    return updateWeeklyDigestSchedule(ctx.user.id, { enabled: input.enabled });
  }),
});
