import { and, asc, desc, eq, inArray, isNull, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  applications,
  applicationNotes,
  applicationTimelineEvents,
  authSessions,
  candidateProfiles,
  careerInsights,
  type CandidateProfile,
  type InsertCandidateProfile,
  type InsertUser,
  interviewReminders,
  jobIngestionRuns,
  jobs,
  notifications,
  passwordResetTokens,
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

export async function getUserById(userId: number): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(users).where(eq(users.id, userId)).limit(1))[0];
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  return (await db.select().from(users).where(eq(users.email, email.trim().toLowerCase())).limit(1))[0];
}

export async function createCredentialUser(input: { name: string; email: string; passwordHash: string; termsAcceptedAt: Date }) {
  const db = await requireDb();
  const email = input.email.trim().toLowerCase();
  const result = await db.insert(users).values({ name: input.name.trim(), email, passwordHash: input.passwordHash, authStatus: "active", emailVerified: false, termsAcceptedAt: input.termsAcceptedAt, loginMethod: "password", role: "user", lastSignedIn: new Date() });
  const id = Number((result as unknown as Array<{ insertId: number }>)[0]?.insertId);
  return getUserById(id);
}

export async function updateUserPassword(userId: number, passwordHash: string, options: { activateLegacy?: boolean } = {}) {
  const db = await requireDb();
  await db.update(users).set({ passwordHash, authStatus: options.activateLegacy ? "active" : undefined, loginMethod: "password", passwordChangedAt: new Date(), lastSignedIn: new Date() }).where(eq(users.id, userId));
  return getUserById(userId);
}

export async function createAuthSession(input: { userId: number; tokenHash: string; expiresAt: Date; userAgent?: string | null; ipHash?: string | null; rotatedFromSessionId?: number | null }) {
  const db = await requireDb();
  const result = await db.insert(authSessions).values({ ...input, userAgent: input.userAgent ?? null, ipHash: input.ipHash ?? null, rotatedFromSessionId: input.rotatedFromSessionId ?? null });
  const id = Number((result as unknown as Array<{ insertId: number }>)[0]?.insertId);
  return (await db.select().from(authSessions).where(eq(authSessions.id, id)).limit(1))[0];
}

export async function getActiveSessionWithUser(tokenHash: string) {
  const db = await requireDb();
  const row = (await db.select({ session: authSessions, user: users }).from(authSessions).innerJoin(users, eq(authSessions.userId, users.id)).where(and(eq(authSessions.tokenHash, tokenHash), isNull(authSessions.revokedAt))).limit(1))[0] ?? null;
  if (!row || row.session.expiresAt.getTime() <= Date.now()) return null;
  return row;
}

export async function touchAuthSession(sessionId: number) {
  const db = await requireDb();
  await db.update(authSessions).set({ lastActiveAt: new Date() }).where(and(eq(authSessions.id, sessionId), isNull(authSessions.revokedAt)));
}

export async function revokeAuthSession(sessionId: number) {
  const db = await requireDb();
  await db.update(authSessions).set({ revokedAt: new Date() }).where(and(eq(authSessions.id, sessionId), isNull(authSessions.revokedAt)));
}

export async function revokeOtherAuthSessions(userId: number, currentSessionId: number) {
  const db = await requireDb();
  await db.update(authSessions).set({ revokedAt: new Date() }).where(and(eq(authSessions.userId, userId), sql`${authSessions.id} <> ${currentSessionId}`, isNull(authSessions.revokedAt)));
}

export async function revokeAllAuthSessions(userId: number) {
  const db = await requireDb();
  await db.update(authSessions).set({ revokedAt: new Date() }).where(and(eq(authSessions.userId, userId), isNull(authSessions.revokedAt)));
}

export async function listActiveAuthSessions(userId: number) {
  const db = await requireDb();
  const sessions = await db.select().from(authSessions).where(and(eq(authSessions.userId, userId), isNull(authSessions.revokedAt))).orderBy(desc(authSessions.lastActiveAt));
  return sessions.filter(session => session.expiresAt.getTime() > Date.now());
}

export async function createPasswordResetToken(input: { userId: number; tokenHash: string; expiresAt: Date }) {
  const db = await requireDb();
  await db.insert(passwordResetTokens).values(input);
}

export async function getUsablePasswordResetToken(tokenHash: string) {
  const db = await requireDb();
  const token = (await db.select().from(passwordResetTokens).where(and(eq(passwordResetTokens.tokenHash, tokenHash), isNull(passwordResetTokens.usedAt))).limit(1))[0] ?? null;
  if (!token || token.expiresAt.getTime() <= Date.now()) return null;
  return token;
}

export async function consumePasswordResetToken(tokenId: number) {
  const db = await requireDb();
  await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(and(eq(passwordResetTokens.id, tokenId), isNull(passwordResetTokens.usedAt)));
}

export async function getCandidateProfile(userId: number) {
  const db = await requireDb();
  return (await db.select().from(candidateProfiles).where(eq(candidateProfiles.userId, userId)).limit(1))[0] ?? null;
}

export async function getCandidateProfileByDigestTask(taskUid: string) {
  const db = await requireDb();
  return (await db.select().from(candidateProfiles).where(eq(candidateProfiles.weeklyDigestCronTaskUid, taskUid)).limit(1))[0] ?? null;
}

export async function listConfirmedCandidateProfiles(limit = 100) {
  const db = await requireDb();
  return db.select().from(candidateProfiles).where(eq(candidateProfiles.profileConfirmed, true)).limit(limit);
}

export async function updateWeeklyDigestSchedule(userId: number, values: { enabled?: boolean; taskUid?: string | null; lastSentAt?: Date | null }) {
  const db = await requireDb();
  await db.update(candidateProfiles).set({ weeklyDigestEnabled: values.enabled, weeklyDigestCronTaskUid: values.taskUid, weeklyDigestLastSentAt: values.lastSentAt }).where(eq(candidateProfiles.userId, userId));
  return getCandidateProfile(userId);
}

export async function upsertCandidateProfile(userId: number, input: Omit<InsertCandidateProfile, "id" | "userId" | "createdAt" | "updatedAt">) {
  const db = await requireDb();
  const values: InsertCandidateProfile = { userId, ...input };
  await db.insert(candidateProfiles).values(values).onDuplicateKeyUpdate({
    set: {
      fullName: values.fullName,
      email: values.email,
      phone: values.phone,
      currentLocation: values.currentLocation,
      linkedInUrl: values.linkedInUrl,
      githubUrl: values.githubUrl,
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
      projects: values.projects,
      certifications: values.certifications,
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

export async function findResumeByHash(userId: number, fileHash: string) {
  const db = await requireDb();
  return (await db.select().from(resumes).where(and(eq(resumes.userId, userId), eq(resumes.fileHash, fileHash))).limit(1))[0] ?? null;
}

export async function getResumeForUser(id: number, userId: number) {
  const db = await requireDb();
  return (await db.select().from(resumes).where(and(eq(resumes.id, id), eq(resumes.userId, userId))).limit(1))[0] ?? null;
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
  return db.select().from(jobs).where(eq(jobs.status, "active")).orderBy(desc(jobs.postedAt));
}

export type JobListFilters = {
  query?: string;
  role?: string;
  location?: string;
  skills?: string;
  category?: string;
  workMode?: "remote" | "hybrid" | "onsite";
  employmentType?: "internship" | "full_time";
  experienceLevel?: "student" | "entry" | "mid" | "senior";
  sort?: "latest" | "title";
  page: number;
  pageSize: number;
};

export async function listJobsPage(filters: JobListFilters) {
  const db = await requireDb();
  const contains = (value: string) => `%${value.trim().replace(/[%_]/g, "\\$&")}%`;
  const conditions = [eq(jobs.status, "active")];
  if (filters.query?.trim()) conditions.push(or(like(jobs.title, contains(filters.query)), like(jobs.company, contains(filters.query)), like(jobs.location, contains(filters.query)), like(jobs.description, contains(filters.query)), sql`${jobs.requirements} LIKE ${contains(filters.query)}`)!);
  if (filters.role?.trim()) conditions.push(like(jobs.title, contains(filters.role)));
  if (filters.location?.trim()) conditions.push(like(jobs.location, contains(filters.location)));
  if (filters.skills?.trim()) conditions.push(sql`${jobs.requirements} LIKE ${contains(filters.skills)}`);
  if (filters.category?.trim()) conditions.push(like(jobs.category, contains(filters.category)));
  if (filters.workMode) conditions.push(eq(jobs.workMode, filters.workMode));
  if (filters.employmentType) conditions.push(eq(jobs.employmentType, filters.employmentType));
  if (filters.experienceLevel) conditions.push(eq(jobs.experienceLevel, filters.experienceLevel));
  const where = and(...conditions);
  const [{ total }] = await db.select({ total: sql<number>`count(*)` }).from(jobs).where(where);
  const items = await db.select().from(jobs).where(where).orderBy(filters.sort === "title" ? asc(jobs.title) : desc(jobs.postedAt)).limit(filters.pageSize).offset((filters.page - 1) * filters.pageSize);
  return { items, total: Number(total) };
}

export async function getJob(jobId: number) {
  const db = await requireDb();
  return (await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1))[0];
}

export async function listAdminJobs() {
  const db = await requireDb();
  return db.select().from(jobs).orderBy(desc(jobs.createdAt)).limit(100);
}

export async function createJob(input: typeof jobs.$inferInsert) {
  const db = await requireDb();
  const result = await db.insert(jobs).values(input);
  const id = Number((result as unknown as Array<{ insertId: number }>)[0]?.insertId);
  return getJob(id);
}

export async function updateJobStatus(jobId: number, status: "active" | "paused" | "closed" | "archived") {
  const db = await requireDb();
  await db.update(jobs).set({ status }).where(eq(jobs.id, jobId));
  return getJob(jobId);
}

export async function getJobBySource(provider: string, sourceKey: string) {
  const db = await requireDb();
  return (await db.select().from(jobs).where(and(eq(jobs.sourceProvider, provider), eq(jobs.sourceKey, sourceKey))).limit(1))[0] ?? null;
}

export async function createIngestionRun(input: { provider: string; triggeredByUserId?: number | null }) {
  const db = await requireDb();
  const result = await db.insert(jobIngestionRuns).values({ provider: input.provider, triggeredByUserId: input.triggeredByUserId ?? null, status: "started" });
  const id = Number((result as unknown as Array<{ insertId: number }>)[0]?.insertId);
  return (await db.select().from(jobIngestionRuns).where(eq(jobIngestionRuns.id, id)).limit(1))[0] ?? null;
}

export async function finishIngestionRun(runId: number, input: { status: "completed" | "partial" | "failed"; fetchedCount: number; newCount: number; updatedCount: number; duplicateCount: number; failedCount: number; errorSummary?: string | null }) {
  const db = await requireDb();
  await db.update(jobIngestionRuns).set({ ...input, completedAt: new Date() }).where(eq(jobIngestionRuns.id, runId));
  return (await db.select().from(jobIngestionRuns).where(eq(jobIngestionRuns.id, runId)).limit(1))[0] ?? null;
}

export async function listIngestionRuns(limit = 20) {
  const db = await requireDb();
  return db.select().from(jobIngestionRuns).orderBy(desc(jobIngestionRuns.createdAt)).limit(limit);
}

export async function updateImportedJob(jobId: number, input: Partial<typeof jobs.$inferInsert>) {
  const db = await requireDb();
  await db.update(jobs).set(input).where(eq(jobs.id, jobId));
  return getJob(jobId);
}

export async function reviewImportedJob(jobId: number, userId: number, input: { reviewStatus: "approved" | "rejected"; rejectionReason?: string | null }) {
  const db = await requireDb();
  await db.update(jobs).set({ reviewStatus: input.reviewStatus, rejectionReason: input.rejectionReason ?? null, reviewedAt: new Date(), reviewedByUserId: userId }).where(eq(jobs.id, jobId));
  return getJob(jobId);
}

export async function upsertRecommendationForUser(userId: number, item: { jobId: number; score: number; skillScore: number; roleScore: number; experienceScore: number; educationScore: number; locationScore: number; preferenceScore: number; explanation: string; matchingSkills: string[]; missingSkills: string[] }) {
  const db = await requireDb();
  await db.insert(recommendations).values({ userId, ...item }).onDuplicateKeyUpdate({ set: item });
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

export async function listSavedJobs(userId: number) {
  const db = await requireDb();
  return db.select({ job: jobs }).from(savedJobs).innerJoin(jobs, eq(savedJobs.jobId, jobs.id)).where(eq(savedJobs.userId, userId)).orderBy(desc(savedJobs.createdAt));
}

export async function upsertApplication(userId: number, jobId: number, status: "saved" | "applied" | "under_review" | "interviewing" | "offer" | "selected" | "rejected", notes?: string) {
  const db = await requireDb();
  await db.insert(applications).values({ userId, jobId, status, notes: notes ?? null }).onDuplicateKeyUpdate({ set: { status, notes: notes ?? null } });
  return (await db.select().from(applications).where(and(eq(applications.userId, userId), eq(applications.jobId, jobId))).limit(1))[0] ?? null;
}

export async function listApplications(userId: number) {
  const db = await requireDb();
  return db.select({ application: applications, job: jobs }).from(applications).innerJoin(jobs, eq(applications.jobId, jobs.id)).where(eq(applications.userId, userId)).orderBy(desc(applications.updatedAt));
}

export async function getApplicationForUser(applicationId: number, userId: number) {
  const db = await requireDb();
  return (await db.select({ application: applications, job: jobs }).from(applications).innerJoin(jobs, eq(applications.jobId, jobs.id)).where(and(eq(applications.id, applicationId), eq(applications.userId, userId))).limit(1))[0] ?? null;
}

export async function listApplicationNotes(applicationId: number, userId: number) {
  const db = await requireDb();
  return db.select().from(applicationNotes).where(and(eq(applicationNotes.applicationId, applicationId), eq(applicationNotes.userId, userId))).orderBy(desc(applicationNotes.updatedAt));
}

export async function createApplicationNote(applicationId: number, userId: number, content: string) {
  const db = await requireDb();
  const result = await db.insert(applicationNotes).values({ applicationId, userId, content });
  const id = Number((result as unknown as Array<{ insertId: number }>)[0]?.insertId);
  return (await db.select().from(applicationNotes).where(and(eq(applicationNotes.id, id), eq(applicationNotes.userId, userId))).limit(1))[0] ?? null;
}

export async function updateApplicationNote(noteId: number, applicationId: number, userId: number, content: string) {
  const db = await requireDb();
  await db.update(applicationNotes).set({ content }).where(and(eq(applicationNotes.id, noteId), eq(applicationNotes.applicationId, applicationId), eq(applicationNotes.userId, userId)));
  return (await db.select().from(applicationNotes).where(and(eq(applicationNotes.id, noteId), eq(applicationNotes.applicationId, applicationId), eq(applicationNotes.userId, userId))).limit(1))[0] ?? null;
}

export async function deleteApplicationNote(noteId: number, applicationId: number, userId: number) {
  const db = await requireDb();
  await db.delete(applicationNotes).where(and(eq(applicationNotes.id, noteId), eq(applicationNotes.applicationId, applicationId), eq(applicationNotes.userId, userId)));
}

export async function listApplicationTimeline(applicationId: number, userId: number) {
  const db = await requireDb();
  return db.select().from(applicationTimelineEvents).where(and(eq(applicationTimelineEvents.applicationId, applicationId), eq(applicationTimelineEvents.userId, userId))).orderBy(desc(applicationTimelineEvents.createdAt));
}

export async function createApplicationTimelineEvent(applicationId: number, userId: number, type: string, body: string) {
  const db = await requireDb();
  await db.insert(applicationTimelineEvents).values({ applicationId, userId, type, body });
}

export async function getInterviewReminderForApplication(applicationId: number, userId: number) {
  const db = await requireDb();
  return (await db.select().from(interviewReminders).where(and(eq(interviewReminders.applicationId, applicationId), eq(interviewReminders.userId, userId))).limit(1))[0] ?? null;
}

export async function getInterviewReminderByTaskUid(taskUid: string) {
  const db = await requireDb();
  return (await db.select().from(interviewReminders).where(eq(interviewReminders.scheduleCronTaskUid, taskUid)).limit(1))[0] ?? null;
}

export async function listDueInterviewReminders(limit = 50) {
  const db = await requireDb();
  return db.select().from(interviewReminders).where(and(eq(interviewReminders.status, "scheduled"), sql`${interviewReminders.remindAt} <= NOW()`)).orderBy(asc(interviewReminders.remindAt)).limit(limit);
}

export async function saveInterviewReminder(applicationId: number, userId: number, input: { scheduledFor: Date; remindAt: Date; title: string; notes?: string | null; scheduleCronTaskUid?: string | null }) {
  const db = await requireDb();
  const existing = await getInterviewReminderForApplication(applicationId, userId);
  if (existing) await db.update(interviewReminders).set({ ...input, status: "scheduled", sentAt: null }).where(eq(interviewReminders.id, existing.id));
  else await db.insert(interviewReminders).values({ applicationId, userId, scheduledFor: input.scheduledFor, remindAt: input.remindAt, title: input.title, notes: input.notes ?? null, scheduleCronTaskUid: input.scheduleCronTaskUid ?? null, status: "scheduled" });
  return getInterviewReminderForApplication(applicationId, userId);
}

export async function updateInterviewReminderTaskUid(reminderId: number, userId: number, taskUid: string | null) {
  const db = await requireDb();
  await db.update(interviewReminders).set({ scheduleCronTaskUid: taskUid }).where(and(eq(interviewReminders.id, reminderId), eq(interviewReminders.userId, userId)));
}

export async function cancelInterviewReminder(applicationId: number, userId: number) {
  const db = await requireDb();
  await db.update(interviewReminders).set({ status: "cancelled" }).where(and(eq(interviewReminders.applicationId, applicationId), eq(interviewReminders.userId, userId)));
  return getInterviewReminderForApplication(applicationId, userId);
}

export async function markInterviewReminderSent(reminderId: number) {
  const db = await requireDb();
  await db.update(interviewReminders).set({ status: "sent", sentAt: new Date() }).where(and(eq(interviewReminders.id, reminderId), eq(interviewReminders.status, "scheduled")));
}

export async function createNotification(input: { userId: number; type: string; title: string; body: string; href?: string | null; fingerprint: string; jobId?: number | null; applicationId?: number | null }) {
  const db = await requireDb();
  await db.insert(notifications).values(input).onDuplicateKeyUpdate({ set: { fingerprint: input.fingerprint } });
}

export async function listNotifications(userId: number) {
  const db = await requireDb();
  const items = await db.select().from(notifications).where(and(eq(notifications.userId, userId), isNull(notifications.dismissedAt))).orderBy(desc(notifications.createdAt)).limit(30);
  return { items, unreadCount: items.filter(item => !item.readAt).length };
}

export async function markNotificationRead(userId: number, notificationId: number) {
  const db = await requireDb();
  await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.userId, userId), eq(notifications.id, notificationId)));
}

export async function markAllNotificationsRead(userId: number) {
  const db = await requireDb();
  await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.userId, userId), isNull(notifications.readAt), isNull(notifications.dismissedAt)));
}

export async function updateNotificationPreferences(userId: number, input: { highMatchNotificationsEnabled: boolean; applicationUpdatesEnabled: boolean; interviewRemindersEnabled: boolean; skillInsightsEnabled: boolean }) {
  const db = await requireDb();
  await db.update(candidateProfiles).set(input).where(eq(candidateProfiles.userId, userId));
  return getCandidateProfile(userId);
}

export async function dismissNotification(userId: number, notificationId: number) {
  const db = await requireDb();
  await db.update(notifications).set({ dismissedAt: new Date() }).where(and(eq(notifications.userId, userId), eq(notifications.id, notificationId)));
}

export async function replaceRecommendations(userId: number, items: Array<{ jobId: number; score: number; skillScore: number; roleScore: number; experienceScore: number; educationScore: number; locationScore: number; preferenceScore: number; explanation: string; matchingSkills: string[]; missingSkills: string[] }>) {
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
