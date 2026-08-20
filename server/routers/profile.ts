import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createHash } from "crypto";
import { extractResumeProfile } from "../resume";
import { createNotification, createResume, findResumeByHash, getCandidateProfile, getResumeForUser, listResumes, updateResume, upsertCandidateProfile } from "../db";
import { storageGetBuffer, storagePut } from "../storage";
import { protectedProcedure, router } from "../_core/trpc";
import { normaliseSkills } from "../skills";
import { refreshRecommendationsForUser } from "../recommendationRefresh";

const experienceItem = z.object({ title: z.string().max(140), company: z.string().max(140), duration: z.string().max(80), highlights: z.array(z.string().max(280)).max(8) });
const educationItem = z.object({ institution: z.string().max(180), qualification: z.string().max(180), year: z.string().max(30), field: z.string().max(120).default(""), score: z.string().max(40).default("") });
const projectItem = z.object({ title: z.string().max(180), description: z.string().max(1000), technologies: z.array(z.string().max(80)).max(20) });
const certificationItem = z.object({ name: z.string().max(180), issuer: z.string().max(180), year: z.string().max(30) });
const profileInput = z.object({
  fullName: z.string().max(180).default(""),
  email: z.string().email().max(320).or(z.literal("")).nullable().default(null),
  phone: z.string().max(40).nullable().default(null),
  currentLocation: z.string().max(180).nullable().default(null),
  linkedInUrl: z.string().max(500).nullable().default(null),
  githubUrl: z.string().max(500).nullable().default(null),
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
  projects: z.array(projectItem).max(12).default([]),
  certifications: z.array(certificationItem).max(12).default([]),
  profileConfirmed: z.boolean().default(false),
  onboardingStep: z.number().int().min(0).max(5).default(0),
});

function cleanName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-180) || "resume";
}

function validateResumeFile(name: string, mimeType: string, buffer: Buffer) {
  const extension = name.toLowerCase().split(".").pop();
  const isPdf = mimeType === "application/pdf" && extension === "pdf";
  const isDocx = mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" && extension === "docx";
  if (!isPdf && !isDocx) throw new TRPCError({ code: "BAD_REQUEST", message: "Choose a PDF or DOCX resume whose file type matches its extension." });
  if (!buffer.length) throw new TRPCError({ code: "BAD_REQUEST", message: "This file is empty. Choose a resume with readable content." });
  if (buffer.length > 5 * 1024 * 1024) throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Resume files must be 5 MB or smaller." });
  if (isPdf && !buffer.subarray(0, 5).toString("utf8").startsWith("%PDF-")) throw new TRPCError({ code: "BAD_REQUEST", message: "This PDF appears unreadable or corrupted. Try another PDF or DOCX file." });
  if (isDocx && buffer.subarray(0, 2).toString("utf8") !== "PK") throw new TRPCError({ code: "BAD_REQUEST", message: "This DOCX appears unreadable or corrupted. Try another PDF or DOCX file." });
}

async function applyExtraction(userId: number, extraction: Awaited<ReturnType<typeof extractResumeProfile>>) {
  const current = await getCandidateProfile(userId);
  return upsertCandidateProfile(userId, {
    fullName: current?.fullName || extraction.fullName,
    email: current?.email || extraction.email || null,
    phone: current?.phone || extraction.phone || null,
    currentLocation: current?.currentLocation || extraction.currentLocation || null,
    linkedInUrl: current?.linkedInUrl || extraction.linkedInUrl || null,
    githubUrl: current?.githubUrl || extraction.githubUrl || null,
    headline: extraction.headline || current?.headline || "",
    bio: current?.bio ?? null,
    desiredRoles: extraction.desiredRoles.length ? extraction.desiredRoles : (current?.desiredRoles ?? []),
    desiredLocations: current?.desiredLocations ?? [],
    workPreference: current?.workPreference ?? "flexible",
    employmentPreference: current?.employmentPreference ?? "both",
    experienceLevel: current?.experienceLevel ?? "entry",
    skills: normaliseSkills(extraction.skills.length ? extraction.skills : (current?.skills ?? [])),
    experience: extraction.experience.length ? extraction.experience : (current?.experience ?? []),
    education: extraction.education.length ? extraction.education : (current?.education ?? []),
    projects: extraction.projects.length ? extraction.projects : (current?.projects ?? []),
    certifications: extraction.certifications.length ? extraction.certifications : (current?.certifications ?? []),
    profileConfirmed: false,
    onboardingStep: Math.max(current?.onboardingStep ?? 0, 4),
  });
}

export const profileRouter = router({
  get: protectedProcedure.query(({ ctx }) => getCandidateProfile(ctx.user.id)),
  resumes: protectedProcedure.query(({ ctx }) => listResumes(ctx.user.id)),
  upsert: protectedProcedure.input(profileInput).mutation(async ({ ctx, input }) => {
    const current = await getCandidateProfile(ctx.user.id);
    const profile = await upsertCandidateProfile(ctx.user.id, input);
    if (!current?.profileConfirmed && input.profileConfirmed) await createNotification({ userId: ctx.user.id, type: "profile_confirmed", title: "Profile confirmed", body: "Your confirmed profile is now ready for explainable job matching.", href: "/recommendations", fingerprint: "profile-confirmed" });
    if (input.profileConfirmed) {
      try { await refreshRecommendationsForUser(ctx.user.id); } catch (error) { console.warn("[Recommendations] Profile update could not refresh matches", error); }
    }
    return profile;
  }),
  uploadResume: protectedProcedure.input(z.object({
    name: z.string().min(1).max(255),
    mimeType: z.enum(["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]),
    base64: z.string().min(20).max(10_000_000),
  })).mutation(async ({ ctx, input }) => {
    const buffer = Buffer.from(input.base64, "base64");
    validateResumeFile(input.name, input.mimeType, buffer);
    const safeName = cleanName(input.name);
    const fileHash = createHash("sha256").update(buffer).digest("hex");
    const existing = await findResumeByHash(ctx.user.id, fileHash);
    if (existing) return { resume: existing, extraction: existing.extraction ?? null, profile: await getCandidateProfile(ctx.user.id), duplicate: true };
    const stored = await storagePut(`${ctx.user.id}/resumes/${Date.now()}-${safeName}`, buffer, input.mimeType);
    const resume = await createResume({
      userId: ctx.user.id,
      originalName: safeName,
      mimeType: input.mimeType,
      storageKey: stored.key,
      storageUrl: stored.url,
      sizeBytes: buffer.length,
      fileHash,
      status: "processing",
    });
    try {
      const extraction = await extractResumeProfile({ buffer, mimeType: input.mimeType, storageKey: stored.key });
      const updatedResume = await updateResume(resume.id, ctx.user.id, { status: "ready", extraction, processedAt: new Date(), failureReason: null });
      const profile = await applyExtraction(ctx.user.id, extraction);
      await createNotification({ userId: ctx.user.id, type: "resume_ready", title: "Resume ready to review", body: "We extracted profile details from your resume. Review and keep only the details you want to use.", href: "/profile", fingerprint: `resume-ready:${fileHash}` });
      return { resume: updatedResume, extraction, profile, duplicate: false };
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 500) : "The document could not be processed.";
      await updateResume(resume.id, ctx.user.id, { status: "failed", failureReason: message });
      await createNotification({ userId: ctx.user.id, type: "resume_failed", title: "Resume needs another try", body: "Your file was stored securely but could not be processed. You can retry it or upload another PDF or DOCX.", href: "/profile", fingerprint: `resume-failed:${fileHash}` });
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Your resume was stored securely, but it could not be processed. Please try again." });
    }
  }),
  retryResume: protectedProcedure.input(z.object({ resumeId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    const resume = await getResumeForUser(input.resumeId, ctx.user.id);
    if (!resume) throw new TRPCError({ code: "NOT_FOUND", message: "Resume not found." });
    if (resume.status === "ready") throw new TRPCError({ code: "BAD_REQUEST", message: "This resume has already been processed." });
    await updateResume(resume.id, ctx.user.id, { status: "processing", failureReason: null });
    try {
      const extraction = await extractResumeProfile({ buffer: await storageGetBuffer(resume.storageKey), mimeType: resume.mimeType, storageKey: resume.storageKey });
      const updatedResume = await updateResume(resume.id, ctx.user.id, { status: "ready", extraction, processedAt: new Date() });
      const profile = await applyExtraction(ctx.user.id, extraction);
      await createNotification({ userId: ctx.user.id, type: "resume_ready", title: "Resume ready to review", body: "We extracted profile details from your resume. Review and keep only the details you want to use.", href: "/profile", fingerprint: `resume-ready:${resume.fileHash ?? resume.id}` });
      return { resume: updatedResume, profile };
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 500) : "The document could not be processed.";
      await updateResume(resume.id, ctx.user.id, { status: "failed", failureReason: message });
      await createNotification({ userId: ctx.user.id, type: "resume_failed", title: "Resume needs another try", body: "This file still could not be processed. You can upload another readable PDF or DOCX.", href: "/profile", fingerprint: `resume-failed:${resume.fileHash ?? resume.id}` });
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "We couldn't analyze this resume. The document may be scanned, protected, or unreadable. Try another PDF or DOCX file." });
    }
  }),
});
