import type { CandidateProfile, Job } from "../drizzle/schema";
import { invokeLLM } from "./_core/llm";
import { calculateRuleBasedMatch } from "./matching";

type RecommendationResult = {
  jobId: number;
  score: number;
  explanation: string;
  matchingSkills: string[];
  missingSkills: string[];
};

const recommendationSchema = {
  name: "job_sarthi_recommendations",
  strict: true,
  schema: {
    type: "object",
    properties: {
      recommendations: {
        type: "array",
        items: {
          type: "object",
          properties: {
            jobId: { type: "integer" },
            score: { type: "integer", minimum: 0, maximum: 100 },
            explanation: { type: "string" },
            matchingSkills: { type: "array", items: { type: "string" } },
            missingSkills: { type: "array", items: { type: "string" } },
          },
          required: ["jobId", "score", "explanation", "matchingSkills", "missingSkills"],
          additionalProperties: false,
        },
      },
    },
    required: ["recommendations"],
    additionalProperties: false,
  },
} as const;

export async function generateProfileGroundedRecommendations(profile: CandidateProfile, jobs: Job[]) {
  const fallback = jobs
    .map(job => {
      const match = calculateRuleBasedMatch(profile, job);
      return {
        jobId: job.id,
        score: match.score,
        explanation: `${match.matchingSkills.length ? `Matched skills: ${match.matchingSkills.join(", ")}.` : "This role aligns with your stated career preferences."}${match.missingSkills.length ? ` Consider developing: ${match.missingSkills.join(", ")}.` : ""}`,
        matchingSkills: match.matchingSkills,
        missingSkills: match.missingSkills,
      };
    })
    .sort((a, b) => b.score - a.score);

  if (!jobs.length) return fallback;

  try {
    const response = await invokeLLM({
      model: "gpt-5-mini",
      messages: [
        {
          role: "system",
          content: "You are Job Sarthi's evidence-led career matching engine. Use only the candidate profile and job records supplied. Do not invent qualifications, employers, responsibilities, skills, locations, or outcomes. Rank every supplied job by fit and make each explanation specific, useful, and concise.",
        },
        {
          role: "user",
          content: JSON.stringify({
            candidate: {
              headline: profile.headline,
              desiredRoles: profile.desiredRoles,
              desiredLocations: profile.desiredLocations,
              workPreference: profile.workPreference,
              employmentPreference: profile.employmentPreference,
              experienceLevel: profile.experienceLevel,
              skills: profile.skills,
              experience: profile.experience,
              education: profile.education,
            },
            jobs: jobs.map(job => ({
              id: job.id,
              title: job.title,
              company: job.company,
              location: job.location,
              workMode: job.workMode,
              employmentType: job.employmentType,
              experienceLevel: job.experienceLevel,
              requirements: job.requirements,
              niceToHave: job.niceToHave,
              description: job.description,
            })),
          }),
        },
      ],
      response_format: { type: "json_schema", json_schema: recommendationSchema },
      maxTokens: 3500,
    });
    const content = response.choices[0]?.message.content;
    if (typeof content !== "string") throw new Error("The recommendation model did not return JSON text");
    const parsed = JSON.parse(content);
    const validIds = new Set(jobs.map(job => job.id));
    const result = (parsed.recommendations as RecommendationResult[] | undefined)
      ?.filter(item => validIds.has(item.jobId))
      .map(item => ({ ...item, score: Math.max(0, Math.min(100, Math.round(item.score))) }));
    return result?.length ? result : fallback;
  } catch (error) {
    console.warn("[AI] Recommendation generation fell back to explainable rules", error);
    return fallback;
  }
}

const insightSchema = {
  name: "job_sarthi_career_insight",
  strict: true,
  schema: {
    type: "object",
    properties: {
      topSkills: { type: "array", items: { type: "string" } },
      skillGaps: { type: "array", items: { type: "string" } },
      nextActions: { type: "array", items: { type: "string" } },
      narrative: { type: "string" },
    },
    required: ["topSkills", "skillGaps", "nextActions", "narrative"],
    additionalProperties: false,
  },
} as const;

export async function generateProfileGroundedInsight(profile: CandidateProfile, recommendedJobs: Job[]) {
  const response = await invokeLLM({
    model: "gpt-5-mini",
    messages: [
      {
        role: "system",
        content: "You are a precise career coach. Ground every suggestion strictly in the supplied candidate profile and opportunity requirements. Do not claim a skill gap without a cited supplied job requirement. Make next actions practical and concise.",
      },
      {
        role: "user",
        content: JSON.stringify({
          candidate: {
            desiredRoles: profile.desiredRoles,
            desiredLocations: profile.desiredLocations,
            workPreference: profile.workPreference,
            skills: profile.skills,
            experience: profile.experience,
            education: profile.education,
          },
          opportunities: recommendedJobs.map(job => ({ title: job.title, requirements: job.requirements, niceToHave: job.niceToHave })),
        }),
      },
    ],
    response_format: { type: "json_schema", json_schema: insightSchema },
    maxTokens: 1800,
  });
  const content = response.choices[0]?.message.content;
  if (typeof content !== "string") throw new Error("The career guidance model did not return JSON text");
  return JSON.parse(content);
}
