import { createHash } from "node:crypto";

export type FeedJob = {
  externalId?: string;
  title: string;
  company: string;
  location: string;
  workMode: "remote" | "hybrid" | "onsite";
  employmentType: "internship" | "full_time";
  experienceLevel: "student" | "entry" | "mid" | "senior";
  description: string;
  requirements: string[];
  applicationUrl: string;
  sourceUrl: string;
  category?: string | null;
  salaryRange?: string | null;
  deadline?: Date | null;
};

export type JobFeedProvider = {
  id: string;
  label: string;
  isConfigured(): boolean;
  fetchJobs(): Promise<FeedJob[]>;
};

export function sourceKeyForJob(job: Pick<FeedJob, "externalId" | "company" | "title" | "location" | "applicationUrl">) {
  if (job.externalId?.trim()) return `external:${job.externalId.trim()}`;
  const fallback = [job.company, job.title, job.location, job.applicationUrl].map(value => value.trim().toLowerCase()).join("|");
  return `fallback:${createHash("sha256").update(fallback).digest("hex")}`;
}

export function normalizeFeedJob(provider: string, raw: FeedJob) {
  const title = raw.title.trim();
  const company = raw.company.trim();
  const description = raw.description.trim();
  const requirements = raw.requirements.map(item => item.trim()).filter(Boolean);
  if (!title || !company || description.length < 30 || !requirements.length || !raw.applicationUrl || !raw.sourceUrl) throw new Error("The feed item is missing required candidate-facing fields.");
  return {
    title, company, location: raw.location.trim() || "Location not specified", workMode: raw.workMode, employmentType: raw.employmentType,
    experienceLevel: raw.experienceLevel, description, requirements, niceToHave: [], responsibilities: [], category: raw.category ?? null,
    salaryRange: raw.salaryRange ?? null, requiredEducation: null, applicationUrl: raw.applicationUrl, deadline: raw.deadline ?? null,
    status: "paused" as const, reviewStatus: "pending_review" as const, sourceProvider: provider, sourceKey: sourceKeyForJob(raw), externalJobId: raw.externalId?.trim() || null,
    sourceUrl: raw.sourceUrl, importedAt: new Date(), lastSyncedAt: new Date(), publishedAt: null, reviewedAt: null, reviewedByUserId: null, rejectionReason: null,
  };
}

class UnconfiguredVerifiedFeedProvider implements JobFeedProvider {
  id = "verified-feed";
  label = "Verified feed (not connected)";
  isConfigured() { return false; }
  async fetchJobs(): Promise<FeedJob[]> { throw new Error("No permitted verified job-feed provider is configured for this project."); }
}

/** Test-only provider. It is never registered as a production source or used to seed candidate-facing jobs. */
export class FixtureJobFeedProvider implements JobFeedProvider {
  id = "fixture";
  label = "Fixture provider";
  constructor(private readonly items: FeedJob[]) {}
  isConfigured() { return true; }
  async fetchJobs() { return this.items; }
}

export function getConfiguredJobFeedProvider(): JobFeedProvider { return new UnconfiguredVerifiedFeedProvider(); }
