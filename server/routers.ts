import { systemRouter } from "./_core/systemRouter";
import { router } from "./_core/trpc";
import { authRouter } from "./routers/auth";
import { jobsRouter } from "./routers/jobs";
import { digestRouter } from "./routers/digest";
import { adminJobsRouter } from "./routers/adminJobs";
import { applicationsRouter } from "./routers/applications";
import { notificationsRouter } from "./routers/notifications";
import { profileRouter } from "./routers/profile";
import { recommendationsRouter } from "./routers/recommendations";

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  profile: profileRouter,
  digest: digestRouter,
  adminJobs: adminJobsRouter,
  applications: applicationsRouter,
  jobs: jobsRouter,
  notifications: notificationsRouter,
  recommendations: recommendationsRouter,
});

export type AppRouter = typeof appRouter;
