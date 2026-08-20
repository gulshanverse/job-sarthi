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
    profileConfirmed: boolean("profileConfirmed").default(false).notNull(),
    onboardingStep: int("onboardingStep").default(0).notNull(),
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
    status: mysqlEnum("status", ["uploaded", "processing", "ready", "failed"])
      .default("uploaded")
      .notNull(),
    extraction: json("extraction").$type<Record<string, unknown>>(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("resumes_user_idx").on(table.userId)],
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
    requirements: json("requirements").$type<string[]>().notNull(),
    niceToHave: json("niceToHave").$type<string[]>().notNull(),
    applicationUrl: varchar("applicationUrl", { length: 500 }),
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
    status: mysqlEnum("status", ["saved", "applied", "interviewing", "offer", "rejected"])
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

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type CandidateProfile = typeof candidateProfiles.$inferSelect;
export type InsertCandidateProfile = typeof candidateProfiles.$inferInsert;
export type Job = typeof jobs.$inferSelect;
export type Resume = typeof resumes.$inferSelect;
