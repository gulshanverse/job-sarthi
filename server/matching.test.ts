import { describe, expect, it } from "vitest";
import type { CandidateProfile, Job } from "../drizzle/schema";
import { calculateRuleBasedMatch } from "./matching";

const profile = {
  desiredRoles: ["Frontend Developer"],
  desiredLocations: ["Bengaluru"],
  workPreference: "hybrid",
  employmentPreference: "full_time",
  experienceLevel: "entry",
  skills: ["React", "TypeScript", "CSS"],
} as CandidateProfile;

const job = {
  id: 7,
  title: "Frontend Developer",
  company: "Example Co",
  location: "Bengaluru",
  workMode: "hybrid",
  employmentType: "full_time",
  experienceLevel: "entry",
  requirements: ["React", "TypeScript", "Node.js"],
} as Job;

describe("calculateRuleBasedMatch", () => {
  it("uses actual skills and preferences to produce an explainable score", () => {
    const match = calculateRuleBasedMatch(profile, job);
    expect(match.score).toBeGreaterThan(70);
    expect(match.matchingSkills).toEqual(["React", "TypeScript"]);
    expect(match.missingSkills).toEqual(["Node.js"]);
    expect(match.roleMatch).toBe(true);
    expect(match.locationMatch).toBe(true);
  });
});

