import { generateProfileGroundedRecommendations } from "./ai";
import { createNotification, getCandidateProfile, listJobs, replaceRecommendations } from "./db";

export async function refreshRecommendationsForUser(userId: number) {
  const profile = await getCandidateProfile(userId);
  if (!profile?.profileConfirmed) return [];
  const jobs = await listJobs();
  const recommendations = await generateProfileGroundedRecommendations(profile, jobs.slice(0, 24));
  await replaceRecommendations(userId, recommendations);
  const highMatch = recommendations.find(item => item.score >= 80);
  if (highMatch) {
    const job = jobs.find(item => item.id === highMatch.jobId);
    if (job) await createNotification({ userId, type: "high_match", title: `${highMatch.score}% relevance match`, body: `${job.title} at ${job.company} is a high-relevance role based on your confirmed profile.`, href: `/jobs/${job.id}`, fingerprint: `high-match:${job.id}` });
  }
  return recommendations;
}
