import type { CandidateProfile, Job } from "../drizzle/schema";

const normalise = (value: string) => value.trim().toLowerCase();

export type MatchBreakdown = {
  score: number;
  matchingSkills: string[];
  missingSkills: string[];
  roleMatch: boolean;
  locationMatch: boolean;
};

export function calculateRuleBasedMatch(profile: CandidateProfile, job: Job): MatchBreakdown {
  const candidateSkills = new Map(profile.skills.map(skill => [normalise(skill), skill]));
  const requiredSkills = job.requirements.map(normalise);
  const matchingSkills = requiredSkills
    .filter(skill => candidateSkills.has(skill))
    .map(skill => candidateSkills.get(skill) ?? skill);
  const missingSkills = job.requirements.filter(skill => !candidateSkills.has(normalise(skill)));
  const skillScore = requiredSkills.length
    ? Math.round((matchingSkills.length / requiredSkills.length) * 65)
    : 42;
  const desiredRoles = profile.desiredRoles.map(normalise);
  const roleMatch = desiredRoles.some(role => normalise(job.title).includes(role) || role.includes(normalise(job.title)));
  const locationMatch = profile.desiredLocations.length === 0 || profile.desiredLocations.some(
    location => normalise(job.location).includes(normalise(location)) || normalise(location).includes(normalise(job.location)),
  );
  const workMatch = profile.workPreference === "flexible" || profile.workPreference === job.workMode;
  const employmentMatch = profile.employmentPreference === "both" ||
    (profile.employmentPreference === "internship" && job.employmentType === "internship") ||
    (profile.employmentPreference === "full_time" && job.employmentType === "full_time");
  const levelMatch = profile.experienceLevel === job.experienceLevel ||
    (profile.experienceLevel === "student" && job.experienceLevel === "entry");
  const score = Math.min(100, skillScore + (roleMatch ? 17 : 4) + (locationMatch ? 7 : 0) + (workMatch ? 6 : 0) + (employmentMatch ? 3 : 0) + (levelMatch ? 2 : 0));

  return { score, matchingSkills, missingSkills, roleMatch, locationMatch };
}
