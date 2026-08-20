import { parse as parseCookie } from "cookie";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "../../shared/const";
import { getCandidateProfile, updateWeeklyDigestSchedule } from "../db";
import { createHeartbeatJob, updateHeartbeatJob } from "../_core/heartbeat";
import { protectedProcedure, router } from "../_core/trpc";

const WEEKLY_CRON = "0 0 9 * * 1";

function sessionFromHeaders(cookieHeader: string | undefined) {
  return parseCookie(cookieHeader ?? "")[COOKIE_NAME] ?? "";
}

export const digestRouter = router({
  status: protectedProcedure.query(async ({ ctx }) => {
    const profile = await getCandidateProfile(ctx.user.id);
    return { enabled: profile?.weeklyDigestEnabled ?? false, scheduled: Boolean(profile?.weeklyDigestCronTaskUid), nextFrequency: "Weekly on Monday at 09:00 UTC" };
  }),
  configure: protectedProcedure.input(z.object({ enabled: z.boolean() })).mutation(async ({ ctx, input }) => {
    const profile = await getCandidateProfile(ctx.user.id);
    if (!profile?.profileConfirmed) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Confirm your profile before enabling a weekly digest." });
    const session = sessionFromHeaders(ctx.req.headers.cookie);
    if (input.enabled) {
      if (profile.weeklyDigestCronTaskUid) {
        await updateHeartbeatJob(profile.weeklyDigestCronTaskUid, { enable: true }, session);
        return updateWeeklyDigestSchedule(ctx.user.id, { enabled: true });
      }
      const job = await createHeartbeatJob({ name: `job-sarthi-weekly-digest-${ctx.user.id}`, cron: WEEKLY_CRON, path: "/api/scheduled/weekly-digest", payload: {}, description: "Weekly Job Sarthi in-app recommendation digest" }, session);
      return updateWeeklyDigestSchedule(ctx.user.id, { enabled: true, taskUid: job.taskUid });
    }
    if (profile.weeklyDigestCronTaskUid) await updateHeartbeatJob(profile.weeklyDigestCronTaskUid, { enable: false }, session);
    return updateWeeklyDigestSchedule(ctx.user.id, { enabled: false });
  }),
});
