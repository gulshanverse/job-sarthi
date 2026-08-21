import {
  claimWeeklyDigestDelivery,
  createNotification,
  finishWeeklyDigestDelivery,
  listRecommendations,
  listWeeklyDigestCandidates,
  updateWeeklyDigestSchedule,
} from "./db";
import { refreshRecommendationsForUser } from "./recommendationRefresh";

const DEFAULT_BATCH_SIZE = 50;

/** UTC is the documented default until a candidate-specific timezone is stored. */
export function weeklyDigestPeriodKey(now = new Date()) {
  const day = (now.getUTCDay() + 6) % 7;
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - day));
  const thursday = new Date(monday);
  thursday.setUTCDate(monday.getUTCDate() + 3);
  const isoYear = thursday.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(isoYear, 0, 4));
  const firstMonday = new Date(firstThursday);
  firstMonday.setUTCDate(firstThursday.getUTCDate() - ((firstThursday.getUTCDay() + 6) % 7));
  const week = Math.floor((monday.getTime() - firstMonday.getTime()) / 604_800_000) + 1;
  return `${isoYear}-W${String(week).padStart(2, "0")}`;
}

export type WeeklyDigestRunSummary = {
  periodKey: string;
  candidates: number;
  delivered: number;
  skipped: number;
  failed: number;
  pendingEmailProvider: number;
};

export async function runWeeklyDigestBatch({ now = new Date(), limit = DEFAULT_BATCH_SIZE }: { now?: Date; limit?: number } = {}): Promise<WeeklyDigestRunSummary> {
  const periodKey = weeklyDigestPeriodKey(now);
  const candidates = await listWeeklyDigestCandidates(limit);
  const summary: WeeklyDigestRunSummary = { periodKey, candidates: candidates.length, delivered: 0, skipped: 0, failed: 0, pendingEmailProvider: 0 };

  for (const profile of candidates) {
    const claim = await claimWeeklyDigestDelivery(profile.userId, periodKey);
    if (!claim.delivery || !claim.claimed) {
      summary.skipped += 1;
      continue;
    }
    try {
      await refreshRecommendationsForUser(profile.userId);
      const recommendations = await listRecommendations(profile.userId);
      const top = recommendations.slice(0, 3);
      const body = top.length
        ? `${top.length} current opportunity${top.length === 1 ? " is" : "ies are"} ready to review, led by ${top[0]!.job.title} at ${top[0]!.job.company}.`
        : "Your current profile did not produce new high-confidence matches this week. Keep your profile current and check back soon.";
      await createNotification({
        userId: profile.userId,
        type: "weekly_digest",
        title: "Your weekly Job Sarthi career digest is ready",
        body,
        href: "/recommendations",
        fingerprint: `weekly-digest:${profile.userId}:${periodKey}`,
      });
      await finishWeeklyDigestDelivery(claim.delivery.id, {
        status: "delivered",
        emailStatus: "pending_provider",
        recommendationCount: top.length,
        failureReason: null,
        inAppDeliveredAt: now,
      });
      await updateWeeklyDigestSchedule(profile.userId, { lastSentAt: now });
      summary.delivered += 1;
      summary.pendingEmailProvider += 1;
    } catch (error) {
      await finishWeeklyDigestDelivery(claim.delivery.id, {
        status: "failed",
        emailStatus: "pending_provider",
        failureReason: error instanceof Error ? error.message.slice(0, 500) : "Weekly digest processing failed.",
      });
      summary.failed += 1;
    }
  }
  return summary;
}
