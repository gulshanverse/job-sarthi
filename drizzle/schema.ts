import {
  boolean,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export type ExperienceItem = {
  title: string;
  company: string;
  duration: string;
  highlights: string[];
};

export type EducationItem = {
  institution: string;
  qualification: string;
  year: string;
  field?: string;
  score?: string;
};

export type ProjectItem = {
  title: string;
  description: string;
  technologies: string[];
};

export type CertificationItem = {
  name: string;
  issuer: string;
  year: string;
};

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const candidateProfiles = mysqlTable(
  "candidate_profiles",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    fullName: varchar("fullName", { length: 180 }).default("").notNull(),
    email: varchar("email", { length: 320 }),
    phone: varchar("phone", { length: 40 }),
    currentLocation: varchar("currentLocation", { length: 180 }),
    linkedInUrl: varchar("linkedInUrl", { length: 500 }),
    githubUrl: varchar("githubUrl", { length: 500 }),
    headline: varchar("headline", { length: 180 }).default(""),
    bio: text("bio"),
    desiredRoles: json("desiredRoles").$type<string[]>().notNull(),
    desiredLocations: json("desiredLocations").$type<string[]>().notNull(),
    workPreference: mysqlEnum("workPreference", ["remote", "hybrid", "onsite", "flexible"])
      .default("flexible")
      .notNull(),
    employmentPreference: mysqlEnum("employmentPreference", ["internship", "full_time", "both"])
      .default("both")
      .notNull(),
    experienceLevel: mysqlEnum("experienceLevel", ["student", "entry", "mid", "senior"])
      .default("entry")
      .notNull(),
    skills: json("skills").$type<string[]>().notNull(),
    experience: json("experience").$type<ExperienceItem[]>().notNull(),
    education: json("education").$type<EducationItem[]>().notNull(),
    projects: json("projects").$type<ProjectItem[]>(),
    certifications: json("certifications").$type<CertificationItem[]>(),
    profileConfirmed: boolean("profileConfirmed").default(false).notNull(),
    onboardingStep: int("onboardingStep").default(0).notNull(),
    weeklyDigestEnabled: boolean("weeklyDigestEnabled").default(false).notNull(),
    weeklyDigestCronTaskUid: varchar("weeklyDigestCronTaskUid", { length: 65 }),
    weeklyDigestLastSentAt: timestamp("weeklyDigestLastSentAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [uniqueIndex("candidate_profiles_user_unique").on(table.userId)],
);

export const resumes = mysqlTable(
  "resumes",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    originalName: varchar("originalName", { length: 255 }).notNull(),
    mimeType: varchar("mimeType", { length: 100 }).notNull(),
    storageKey: varchar("storageKey", { length: 500 }).notNull(),
    storageUrl: varchar("storageUrl", { length: 700 }).notNull(),
    sizeBytes: int("sizeBytes").notNull(),
    fileHash: varchar("fileHash", { length: 64 }),
    status: mysqlEnum("status", ["uploaded", "processing", "ready", "failed"])
      .default("uploaded")
      .notNull(),
    extraction: json("extraction").$type<Record<string, unknown>>(),
    failureReason: varchar("failureReason", { length: 500 }),
    processedAt: timestamp("processedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("resumes_user_idx").on(table.userId), uniqueIndex("resumes_user_hash_unique").on(table.userId, table.fileHash)],
);

export const jobs = mysqlTable(
  "jobs",
  {
    id: int("id").autoincrement().primaryKey(),
    title: varchar("title", { length: 180 }).notNull(),
    company: varchar("company", { length: 180 }).notNull(),
    location: varchar("location", { length: 180 }).notNull(),
    workMode: mysqlEnum("workMode", ["remote", "hybrid", "onsite"]).notNull(),
    employmentType: mysqlEnum("employmentType", ["internship", "full_time"]).notNull(),
    experienceLevel: mysqlEnum("experienceLevel", ["student", "entry", "mid", "senior"])
      .notNull(),
    salaryRange: varchar("salaryRange", { length: 100 }),
    description: text("description").notNull(),
    responsibilities: json("responsibilities").$type<string[]>(),
    requirements: json("requirements").$type<string[]>().notNull(),
    niceToHave: json("niceToHave").$type<string[]>().notNull(),
    category: varchar("category", { length: 120 }),
    requiredEducation: varchar("requiredEducation", { length: 180 }),
    applicationUrl: varchar("applicationUrl", { length: 500 }),
    deadline: timestamp("deadline"),
    status: mysqlEnum("status", ["active", "paused", "closed"]).default("active").notNull(),
    postedAt: timestamp("postedAt").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("jobs_location_idx").on(table.location), index("jobs_title_idx").on(table.title)],
);

export const savedJobs = mysqlTable(
  "saved_jobs",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    jobId: int("jobId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [uniqueIndex("saved_jobs_user_job_unique").on(table.userId, table.jobId)],
);

export const applications = mysqlTable(
  "applications",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    jobId: int("jobId").notNull(),
    status: mysqlEnum("status", ["saved", "applied", "under_review", "interviewing", "offer", "selected", "rejected"])
      .default("saved")
      .notNull(),
    notes: text("notes"),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [uniqueIndex("applications_user_job_unique").on(table.userId, table.jobId)],
);

export const recommendations = mysqlTable(
  "recommendations",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    jobId: int("jobId").notNull(),
    score: int("score").notNull(),
    skillScore: int("skillScore").default(0).notNull(),
    roleScore: int("roleScore").default(0).notNull(),
    experienceScore: int("experienceScore").default(0).notNull(),
    educationScore: int("educationScore").default(0).notNull(),
    locationScore: int("locationScore").default(0).notNull(),
    preferenceScore: int("preferenceScore").default(0).notNull(),
    explanation: text("explanation").notNull(),
    matchingSkills: json("matchingSkills").$type<string[]>().notNull(),
    missingSkills: json("missingSkills").$type<string[]>().notNull(),
    generatedAt: timestamp("generatedAt").defaultNow().notNull(),
  },
  table => [
    uniqueIndex("recommendations_user_job_unique").on(table.userId, table.jobId),
    index("recommendations_user_idx").on(table.userId),
  ],
);

export const careerInsights = mysqlTable(
  "career_insights",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    topSkills: json("topSkills").$type<string[]>().notNull(),
    skillGaps: json("skillGaps").$type<string[]>().notNull(),
    nextActions: json("nextActions").$type<string[]>().notNull(),
    narrative: text("narrative").notNull(),
    generatedAt: timestamp("generatedAt").defaultNow().notNull(),
  },
  table => [index("career_insights_user_idx").on(table.userId)],
);

export const notifications = mysqlTable(
  "notifications",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    type: varchar("type", { length: 80 }).notNull(),
    title: varchar("title", { length: 180 }).notNull(),
    body: text("body").notNull(),
    href: varchar("href", { length: 300 }),
    fingerprint: varchar("fingerprint", { length: 180 }).notNull(),
    readAt: timestamp("readAt"),
    dismissedAt: timestamp("dismissedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("notifications_user_idx").on(table.userId), uniqueIndex("notifications_user_fingerprint_unique").on(table.userId, table.fingerprint)],
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type CandidateProfile = typeof candidateProfiles.$inferSelect;
export type InsertCandidateProfile = typeof candidateProfiles.$inferInsert;
export type Job = typeof jobs.$inferSelect;
export type Resume = typeof resumes.$inferSelect;
