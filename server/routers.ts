import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { jobsRouter } from "./routers/jobs";
import { digestRouter } from "./routers/digest";
import { adminJobsRouter } from "./routers/adminJobs";
import { notificationsRouter } from "./routers/notifications";
import { profileRouter } from "./routers/profile";
import { recommendationsRouter } from "./routers/recommendations";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  profile: profileRouter,
  digest: digestRouter,
  adminJobs: adminJobsRouter,
  jobs: jobsRouter,
  notifications: notificationsRouter,
  recommendations: recommendationsRouter,
});

export type AppRouter = typeof appRouter;
