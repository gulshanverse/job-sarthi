import type { Job } from "../drizzle/schema";
import { createNotification, listConfirmedCandidateProfiles, upsertRecommendationForUser } from "./db";
import { calculateRuleBasedMatch, createMatchExplanation } from "./matching";

export const DEFAULT_HIGH_MATCH_THRESHOLD = 80;

/** Adds a newly published job to relevant candidate queues without exposing profiles to admins or bulk-calling an LLM. */
export async function addNewJobToRelevantRecommendations(job: Job) {
  if (job.status !== "active") return { evaluated: 0, added: 0 };
  const profiles = await listConfirmedCandidateProfiles();
  let added = 0;
  for (const profile of profiles) {
    const match = calculateRuleBasedMatch(profile, job);
    if (match.score < 60) continue;
    await upsertRecommendationForUser(profile.userId, { jobId: job.id, ...match, explanation: createMatchExplanation(match, job) });
    if (profile.highMatchNotificationsEnabled && match.score >= DEFAULT_HIGH_MATCH_THRESHOLD) await createNotification({ userId: profile.userId, type: "high_match", title: `${match.score}% relevance match`, body: `${job.title} at ${job.company} is a new high-relevance role based on your confirmed profile.`, href: `/jobs/${job.id}`, jobId: job.id, fingerprint: `high-match:${job.id}` });
    added += 1;
  }
  return { evaluated: profiles.length, added };
}
