import type { CandidateProfile, Job } from "../drizzle/schema";
import { normaliseSkill, skillKey } from "./skills";

export const MATCH_WEIGHTS = {
  skills: 45,
  role: 20,
  experience: 15,
  education: 10,
  location: 5,
  preference: 5,
} as const;

export type MatchBreakdown = {
  score: number;
  skillScore: number;
  roleScore: number;
  experienceScore: number;
  educationScore: number;
  locationScore: number;
  preferenceScore: number;
  matchingSkills: string[];
  missingSkills: string[];
  roleMatch: boolean;
  locationMatch: boolean;
};

function words(value: string) {
  return value.toLowerCase().split(/[^a-z0-9+#.]+/).filter(token => token.length > 2);
}

function textMatches(left: string, right: string) {
  const normalizedLeft = left.trim().toLowerCase();
  const normalizedRight = right.trim().toLowerCase();
  if (!normalizedLeft || !normalizedRight) return false;
  if (normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft)) return true;
  const rightWords = new Set(words(normalizedRight));
  return words(normalizedLeft).some(word => rightWords.has(word));
}

const levels: Record<NonNullable<CandidateProfile["experienceLevel"]>, number> = { student: 0, entry: 1, mid: 2, senior: 3 };

export function calculateRuleBasedMatch(profile: CandidateProfile, job: Job): MatchBreakdown {
  const candidateSkills = new Map((profile.skills ?? []).map(skill => [skillKey(skill), normaliseSkill(skill)]));
  const requirements = job.requirements.map(skill => ({ label: normaliseSkill(skill), key: skillKey(skill) }));
  const matchingSkills = requirements.filter(skill => candidateSkills.has(skill.key)).map(skill => candidateSkills.get(skill.key) ?? skill.label);
  const missingSkills = requirements.filter(skill => !candidateSkills.has(skill.key)).map(skill => skill.label);
  const skillScore = requirements.length ? Math.round((matchingSkills.length / requirements.length) * MATCH_WEIGHTS.skills) : MATCH_WEIGHTS.skills;

  const roleMatch = (profile.desiredRoles ?? []).some(role => textMatches(role, job.title)) || textMatches(profile.headline ?? "", job.title);
  const roleScore = roleMatch ? MATCH_WEIGHTS.role : 0;

  const difference = Math.abs(levels[profile.experienceLevel ?? "entry"] - levels[job.experienceLevel]);
  const experienceScore = difference === 0 ? MATCH_WEIGHTS.experience : difference === 1 ? 10 : difference === 2 ? 4 : 0;

  const requiredEducation = job.requiredEducation?.trim() ?? "";
  const education = profile.education ?? [];
  const educationText = education.map(item => `${item.qualification} ${item.field ?? ""} ${item.institution}`).join(" ");
  const educationScore = !requiredEducation ? MATCH_WEIGHTS.education : textMatches(educationText, requiredEducation) ? MATCH_WEIGHTS.education : education.length ? 3 : 0;

  const desiredLocations = profile.desiredLocations ?? [];
  const locationMatch = desiredLocations.length === 0 || desiredLocations.some(location => textMatches(location, job.location));
  const locationScore = locationMatch ? MATCH_WEIGHTS.location : 0;
  const workPreference = profile.workPreference ?? "flexible";
  const employmentPreference = profile.employmentPreference ?? "both";
  const workMatch = workPreference === "flexible" || workPreference === job.workMode;
  const employmentMatch = employmentPreference === "both" || (employmentPreference === "internship" && job.employmentType === "internship") || (employmentPreference === "full_time" && job.employmentType === "full_time");
  const preferenceScore = workMatch && employmentMatch ? MATCH_WEIGHTS.preference : workMatch || employmentMatch ? 3 : 0;
  const score = skillScore + roleScore + experienceScore + educationScore + locationScore + preferenceScore;

  return { score, skillScore, roleScore, experienceScore, educationScore, locationScore, preferenceScore, matchingSkills, missingSkills, roleMatch, locationMatch };
}

export function createMatchExplanation(match: MatchBreakdown, job: Job) {
  const skillSentence = job.requirements.length
    ? match.matchingSkills.length ? `Your ${match.matchingSkills.join(", ")} skills match ${match.matchingSkills.length} of ${job.requirements.length} core requirement${job.requirements.length === 1 ? "" : "s"}.` : `This role lists ${job.requirements.length} core skill requirement${job.requirements.length === 1 ? "" : "s"} that are not yet in your profile.`
    : "This role does not list core skill requirements, so the match relies on your stated direction and preferences.";
  const fitSentence = [match.roleScore ? "Your target role aligns with the title." : "The title is outside your stated role direction.", match.locationScore ? "Location aligns with your preferences." : "Location does not align with your preferences.", match.preferenceScore ? "Work and employment preferences align." : "Work or employment preferences differ."].join(" ");
  const gapSentence = match.missingSkills.length ? `Skills to review: ${match.missingSkills.join(", ")}.` : "No listed core skills are missing from your profile.";
  return `${skillSentence} ${fitSentence} ${gapSentence}`;
}
