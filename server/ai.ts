import type { CandidateProfile, Job } from "../drizzle/schema";
import { invokeLLM } from "./_core/llm";
import { calculateRuleBasedMatch, createMatchExplanation } from "./matching";

type ExplanationResult = { jobId: number; explanation: string };

const recommendationSchema = {
  name: "job_sarthi_recommendation_explanations",
  strict: true,
  schema: {
    type: "object",
    properties: {
      explanations: {
        type: "array",
        items: {
          type: "object",
          properties: { jobId: { type: "integer" }, explanation: { type: "string" } },
          required: ["jobId", "explanation"],
          additionalProperties: false,
        },
      },
    },
    required: ["explanations"],
    additionalProperties: false,
  },
} as const;

export async function generateProfileGroundedRecommendations(profile: CandidateProfile, jobs: Job[]) {
  const fallback = jobs.map(job => {
    const match = calculateRuleBasedMatch(profile, job);
    return { jobId: job.id, ...match, explanation: createMatchExplanation(match, job) };
  }).sort((a, b) => b.score - a.score);
  if (!jobs.length) return fallback;

  try {
    const response = await invokeLLM({
      model: "gpt-5-mini",
      messages: [
        { role: "system", content: "You write short, careful career-match explanations. Use only the supplied calculated evidence. Do not change scores, claim hiring probability, or add skills, qualifications, or facts not provided." },
        { role: "user", content: JSON.stringify({ candidateSkills: profile.skills, evidence: fallback.map(item => ({ jobId: item.jobId, score: item.score, matchingSkills: item.matchingSkills, missingSkills: item.missingSkills, roleScore: item.roleScore, experienceScore: item.experienceScore, educationScore: item.educationScore, locationScore: item.locationScore, preferenceScore: item.preferenceScore })) }) },
      ],
      response_format: { type: "json_schema", json_schema: recommendationSchema },
      maxTokens: 2200,
    });
    const text = response.choices[0]?.message.content;
    if (typeof text !== "string") throw new Error("The recommendation model did not return JSON text");
    const explanations = new Map((JSON.parse(text).explanations as ExplanationResult[]).filter(item => fallback.some(fallbackItem => fallbackItem.jobId === item.jobId)).map(item => [item.jobId, item.explanation.trim()]));
    return fallback.map(item => ({ ...item, explanation: explanations.get(item.jobId) || item.explanation }));
  } catch (error) {
    console.warn("[AI] Recommendation explanation fell back to calculated evidence", error);
    return fallback;
  }
}

const insightSchema = {
  name: "job_sarthi_career_insight",
  strict: true,
  schema: {
    type: "object",
    properties: { topSkills: { type: "array", items: { type: "string" } }, skillGaps: { type: "array", items: { type: "string" } }, nextActions: { type: "array", items: { type: "string" } }, narrative: { type: "string" } },
    required: ["topSkills", "skillGaps", "nextActions", "narrative"],
    additionalProperties: false,
  },
} as const;

export async function generateProfileGroundedInsight(profile: CandidateProfile, recommendedJobs: Job[]) {
  const response = await invokeLLM({
    model: "gpt-5-mini",
    messages: [
      { role: "system", content: "You are a precise career coach. Ground every suggestion strictly in supplied profile data and opportunity requirements. Never claim learning a skill guarantees employment." },
      { role: "user", content: JSON.stringify({ candidate: { desiredRoles: profile.desiredRoles, desiredLocations: profile.desiredLocations, workPreference: profile.workPreference, skills: profile.skills, experience: profile.experience, education: profile.education }, opportunities: recommendedJobs.map(job => ({ title: job.title, requirements: job.requirements, niceToHave: job.niceToHave })) }) },
    ],
    response_format: { type: "json_schema", json_schema: insightSchema },
    maxTokens: 1800,
  });
  const content = response.choices[0]?.message.content;
  if (typeof content !== "string") throw new Error("The career guidance model did not return JSON text");
  return JSON.parse(content);
}
