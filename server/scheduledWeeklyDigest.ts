import type { Request, Response } from "express";
import { createNotification, getCandidateProfileByDigestTask, listRecommendations, updateWeeklyDigestSchedule } from "./db";
import { refreshRecommendationsForUser } from "./recommendationRefresh";
import { sdk } from "./_core/sdk";

function currentWeekKey() {
  const now = new Date();
  const day = (now.getUTCDay() + 6) % 7;
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day));
  return monday.toISOString().slice(0, 10);
}

export async function scheduledWeeklyDigest(req: Request, res: Response) {
  try {
    const actor = await sdk.authenticateRequest(req);
    if (!actor.isCron || !actor.taskUid) return res.status(403).json({ error: "cron-only" });
    const profile = await getCandidateProfileByDigestTask(actor.taskUid);
    if (!profile || !profile.weeklyDigestEnabled) return res.json({ ok: true, skipped: "orphan-or-disabled" });
    const weekKey = currentWeekKey();
    if (profile.weeklyDigestLastSentAt?.toISOString().slice(0, 10) === weekKey) return res.json({ ok: true, skipped: "already-sent", weekKey });
    await refreshRecommendationsForUser(profile.userId);
    const recommendations = await listRecommendations(profile.userId);
    const top = recommendations.slice(0, 3);
    if (top.length) await createNotification({ userId: profile.userId, type: "weekly_digest", title: "Your weekly match digest is ready", body: `${top.length} current opportunity${top.length === 1 ? "" : "ies"} are ready to review, led by ${top[0]!.job.title} at ${top[0]!.job.company}.`, href: "/recommendations", fingerprint: `weekly-digest:${actor.taskUid}:${weekKey}` });
    await updateWeeklyDigestSchedule(profile.userId, { lastSentAt: new Date() });
    return res.json({ ok: true, recommendations: top.length, weekKey });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "weekly digest failed", timestamp: new Date().toISOString() });
  }
}
