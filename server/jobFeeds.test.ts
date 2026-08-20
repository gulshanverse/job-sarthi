import { describe, expect, it } from "vitest";
import { FixtureJobFeedProvider, getConfiguredJobFeedProvider, normalizeFeedJob, sourceKeyForJob } from "./jobFeeds";

const base = { externalId: "feed-101", title: "Frontend Engineer", company: "Northstar", location: "Remote", workMode: "remote" as const, employmentType: "full_time" as const, experienceLevel: "mid" as const, description: "Build accessible candidate-facing workflow experiences with a collaborative engineering team.", requirements: ["React", "TypeScript"], applicationUrl: "https://employer.example/apply/101", sourceUrl: "https://feed.example/jobs/101" };

describe("job-feed normalization", () => {
  it("keeps provider source identity and places imported jobs into review without publishing them", () => {
    const normalized = normalizeFeedJob("fixture", base);
    expect(normalized).toMatchObject({ sourceProvider: "fixture", sourceKey: "external:feed-101", externalJobId: "feed-101", reviewStatus: "pending_review", status: "paused" });
  });

  it("uses a stable fallback identity, rejects incomplete feed records, and keeps the fixture provider test-only", async () => {
    const fallback = { ...base, externalId: undefined };
    expect(sourceKeyForJob(fallback)).toBe(sourceKeyForJob(fallback));
    expect(() => normalizeFeedJob("fixture", { ...base, requirements: [] })).toThrow(/required candidate-facing fields/i);
    expect(await new FixtureJobFeedProvider([base]).fetchJobs()).toEqual([base]);
    expect(getConfiguredJobFeedProvider().isConfigured()).toBe(false);
  });
});
