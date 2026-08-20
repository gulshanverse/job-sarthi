import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { extractResumeProfile } from "../resume";
import { createResume, getCandidateProfile, listResumes, updateResume, upsertCandidateProfile } from "../db";
import { storagePut } from "../storage";
import { protectedProcedure, router } from "../_core/trpc";

const experienceItem = z.object({ title: z.string().max(140), company: z.string().max(140), duration: z.string().max(80), highlights: z.array(z.string().max(280)).max(8) });
const educationItem = z.object({ institution: z.string().max(180), qualification: z.string().max(180), year: z.string().max(30) });
const profileInput = z.object({
  headline: z.string().max(180).default(""),
  bio: z.string().max(2000).nullable().default(null),
  desiredRoles: z.array(z.string().max(80)).max(8).default([]),
  desiredLocations: z.array(z.string().max(80)).max(8).default([]),
  workPreference: z.enum(["remote", "hybrid", "onsite", "flexible"]),
  employmentPreference: z.enum(["internship", "full_time", "both"]),
  experienceLevel: z.enum(["student", "entry", "mid", "senior"]),
  skills: z.array(z.string().max(80)).max(80).default([]),
  experience: z.array(experienceItem).max(12).default([]),
  education: z.array(educationItem).max(8).default([]),
  profileConfirmed: z.boolean().default(false),
  onboardingStep: z.number().int().min(0).max(5).default(0),
});

function cleanName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-180) || "resume";
}

export const profileRouter = router({
  get: protectedProcedure.query(({ ctx }) => getCandidateProfile(ctx.user.id)),
  resumes: protectedProcedure.query(({ ctx }) => listResumes(ctx.user.id)),
  upsert: protectedProcedure.input(profileInput).mutation(({ ctx, input }) => upsertCandidateProfile(ctx.user.id, input)),
  uploadResume: protectedProcedure.input(z.object({
    name: z.string().min(1).max(255),
    mimeType: z.enum(["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]),
    base64: z.string().min(20).max(10_000_000),
  })).mutation(async ({ ctx, input }) => {
    const buffer = Buffer.from(input.base64, "base64");
    if (!buffer.length || buffer.length > 7 * 1024 * 1024) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Resume files must be 7 MB or smaller." });
    const safeName = cleanName(input.name);
    const stored = await storagePut(`${ctx.user.id}/resumes/${Date.now()}-${safeName}`, buffer, input.mimeType);
    const resume = await createResume({
      userId: ctx.user.id,
      originalName: safeName,
      mimeType: input.mimeType,
      storageKey: stored.key,
      storageUrl: stored.url,
      sizeBytes: buffer.length,
      status: "processing",
    });
    try {
      const extraction = await extractResumeProfile({ buffer, mimeType: input.mimeType, storageKey: stored.key });
      const updatedResume = await updateResume(resume.id, ctx.user.id, { status: "ready", extraction });
      const current = await getCandidateProfile(ctx.user.id);
      const profile = await upsertCandidateProfile(ctx.user.id, {
        headline: extraction.headline,
        bio: current?.bio ?? null,
        desiredRoles: extraction.desiredRoles,
        desiredLocations: current?.desiredLocations ?? [],
        workPreference: current?.workPreference ?? "flexible",
        employmentPreference: current?.employmentPreference ?? "both",
        experienceLevel: current?.experienceLevel ?? "entry",
        skills: extraction.skills,
        experience: extraction.experience,
        education: extraction.education,
        profileConfirmed: false,
        onboardingStep: Math.max(current?.onboardingStep ?? 0, 4),
      });
      return { resume: updatedResume, extraction, profile };
    } catch (error) {
      await updateResume(resume.id, ctx.user.id, { status: "failed" });
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Your resume was stored securely, but it could not be processed. Please try again." });
    }
  }),
});
