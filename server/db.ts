import { and, desc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  applications,
  candidateProfiles,
  careerInsights,
  type CandidateProfile,
  type InsertCandidateProfile,
  type InsertUser,
  jobs,
  recommendations,
  resumes,
  savedJobs,
  type User,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { ...user, role: user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user"), lastSignedIn: user.lastSignedIn ?? new Date() };
  await db.insert(users).values(values).onDuplicateKeyUpdate({
    set: { name: values.name, email: values.email, loginMethod: values.loginMethod, lastSignedIn: values.lastSignedIn },
  });
}

export async function getUserByOpenId(openId: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(users).where(eq(users.openId, openId)).limit(1))[0];
}

export async function getCandidateProfile(userId: number) {
  const db = await requireDb();
  return (await db.select().from(candidateProfiles).where(eq(candidateProfiles.userId, userId)).limit(1))[0] ?? null;
}

export async function upsertCandidateProfile(userId: number, input: Omit<InsertCandidateProfile, "id" | "userId" | "createdAt" | "updatedAt">) {
  const db = await requireDb();
  const values: InsertCandidateProfile = { userId, ...input };
  await db.insert(candidateProfiles).values(values).onDuplicateKeyUpdate({
    set: {
      headline: values.headline,
      bio: values.bio,
      desiredRoles: values.desiredRoles,
      desiredLocations: values.desiredLocations,
      workPreference: values.workPreference,
      employmentPreference: values.employmentPreference,
      experienceLevel: values.experienceLevel,
      skills: values.skills,
      experience: values.experience,
      education: values.education,
      profileConfirmed: values.profileConfirmed,
      onboardingStep: values.onboardingStep,
    },
  });
  return getCandidateProfile(userId);
}

export async function createResume(input: typeof resumes.$inferInsert) {
  const db = await requireDb();
  const result = await db.insert(resumes).values(input);
  const id = Number((result as unknown as Array<{ insertId: number }>)[0]?.insertId);
  return (await db.select().from(resumes).where(eq(resumes.id, id)).limit(1))[0];
}

export async function updateResume(id: number, userId: number, values: Partial<typeof resumes.$inferInsert>) {
  const db = await requireDb();
  await db.update(resumes).set(values).where(and(eq(resumes.id, id), eq(resumes.userId, userId)));
  return (await db.select().from(resumes).where(and(eq(resumes.id, id), eq(resumes.userId, userId))).limit(1))[0];
}

export async function listResumes(userId: number) {
  const db = await requireDb();
  return db.select().from(resumes).where(eq(resumes.userId, userId)).orderBy(desc(resumes.createdAt));
}

export async function listJobs() {
  const db = await requireDb();
  return db.select().from(jobs).orderBy(desc(jobs.postedAt));
}

export async function getJob(jobId: number) {
  const db = await requireDb();
  return (await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1))[0];
}

export async function saveJob(userId: number, jobId: number) {
  const db = await requireDb();
  await db.insert(savedJobs).values({ userId, jobId }).onDuplicateKeyUpdate({ set: { jobId } });
}

export async function unsaveJob(userId: number, jobId: number) {
  const db = await requireDb();
  await db.delete(savedJobs).where(and(eq(savedJobs.userId, userId), eq(savedJobs.jobId, jobId)));
}

export async function getSavedJobIds(userId: number) {
  const db = await requireDb();
  const result = await db.select({ jobId: savedJobs.jobId }).from(savedJobs).where(eq(savedJobs.userId, userId));
  return result.map(row => row.jobId);
}

export async function upsertApplication(userId: number, jobId: number, status: "saved" | "applied" | "interviewing" | "offer" | "rejected", notes?: string) {
  const db = await requireDb();
  await db.insert(applications).values({ userId, jobId, status, notes: notes ?? null }).onDuplicateKeyUpdate({ set: { status, notes: notes ?? null } });
}

export async function listApplications(userId: number) {
  const db = await requireDb();
  return db.select({ application: applications, job: jobs }).from(applications).innerJoin(jobs, eq(applications.jobId, jobs.id)).where(eq(applications.userId, userId)).orderBy(desc(applications.updatedAt));
}

export async function replaceRecommendations(userId: number, items: Array<{ jobId: number; score: number; explanation: string; matchingSkills: string[]; missingSkills: string[] }>) {
  const db = await requireDb();
  await db.delete(recommendations).where(eq(recommendations.userId, userId));
  if (items.length) await db.insert(recommendations).values(items.map(item => ({ userId, ...item })));
}

export async function listRecommendations(userId: number) {
  const db = await requireDb();
  return db.select({ recommendation: recommendations, job: jobs }).from(recommendations).innerJoin(jobs, eq(recommendations.jobId, jobs.id)).where(eq(recommendations.userId, userId)).orderBy(desc(recommendations.score));
}

export async function getJobsByIds(ids: number[]) {
  if (!ids.length) return [];
  const db = await requireDb();
  return db.select().from(jobs).where(inArray(jobs.id, ids));
}

export async function saveCareerInsight(userId: number, input: { topSkills: string[]; skillGaps: string[]; nextActions: string[]; narrative: string }) {
  const db = await requireDb();
  await db.insert(careerInsights).values({ userId, ...input });
}

export async function getLatestCareerInsight(userId: number) {
  const db = await requireDb();
  return (await db.select().from(careerInsights).where(eq(careerInsights.userId, userId)).orderBy(desc(careerInsights.generatedAt)).limit(1))[0] ?? null;
}
