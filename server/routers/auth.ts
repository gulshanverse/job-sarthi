import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as auth from "../auth";
import * as db from "../db";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";

const email = z.string().trim().toLowerCase().email().max(320);
const password = z.string().min(1).max(200);
const passwordInput = z.object({ password, confirmPassword: password });

function safeUser(user: NonNullable<Awaited<ReturnType<typeof db.getUserById>>>) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, authStatus: user.authStatus, emailVerified: user.emailVerified, createdAt: user.createdAt, lastSignedIn: user.lastSignedIn };
}

function requestKey(ctx: { req: { ip?: string; socket: { remoteAddress?: string } } }, action: string) {
  return `${action}:${ctx.req.ip ?? ctx.req.socket.remoteAddress ?? "unknown"}`;
}

function ensureRateLimit(ctx: { req: { ip?: string; socket: { remoteAddress?: string } } }, action: string) {
  if (!auth.allowRateLimit(requestKey(ctx, action))) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Please wait before trying again." });
}

function validatePassword(value: string, confirmation: string) {
  if (value !== confirmation) throw new TRPCError({ code: "BAD_REQUEST", message: "Passwords do not match." });
  const problem = auth.passwordProblem(value);
  if (problem) throw new TRPCError({ code: "BAD_REQUEST", message: problem });
}

export const authRouter = router({
  me: publicProcedure.query(({ ctx }) => (ctx.user ? safeUser(ctx.user) : null)),

  register: publicProcedure.input(z.object({ name: z.string().trim().min(2).max(180), email, acceptedTerms: z.literal(true) }).merge(passwordInput)).mutation(async ({ ctx, input }) => {
    ensureRateLimit(ctx, "register");
    validatePassword(input.password, input.confirmPassword);
    const existing = await db.getUserByEmail(input.email);
    if (existing) throw new TRPCError({ code: "CONFLICT", message: existing.passwordHash ? "An account already exists for this email." : "This email belongs to an existing account that needs independent password setup." });
    const user = await db.createCredentialUser({ name: input.name, email: input.email, passwordHash: await auth.hashPassword(input.password), termsAcceptedAt: new Date() });
    if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Unable to create account." });
    await auth.establishSession(ctx.req, ctx.res, user.id);
    return safeUser(user);
  }),

  login: publicProcedure.input(z.object({ email, password })).mutation(async ({ ctx, input }) => {
    ensureRateLimit(ctx, "login");
    const user = await db.getUserByEmail(input.email);
    const valid = user?.passwordHash ? await auth.verifyPassword(user.passwordHash, input.password) : false;
    if (!valid || !user) {
      if (user && !user.passwordHash) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "This existing account needs an independent password setup link." });
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Email or password is incorrect." });
    }
    await auth.establishSession(ctx.req, ctx.res, user.id);
    return safeUser(user);
  }),

  logout: publicProcedure.mutation(async ({ ctx }) => {
    await auth.clearCurrentSession(ctx.req, ctx.res, ctx.sessionId);
    return { success: true } as const;
  }),

  changePassword: protectedProcedure.input(z.object({ currentPassword: password }).merge(passwordInput)).mutation(async ({ ctx, input }) => {
    const user = ctx.user;
    if (!user.passwordHash || !(await auth.verifyPassword(user.passwordHash, input.currentPassword))) throw new TRPCError({ code: "UNAUTHORIZED", message: "Current password is incorrect." });
    validatePassword(input.password, input.confirmPassword);
    await db.updateUserPassword(user.id, await auth.hashPassword(input.password));
    await db.revokeAllAuthSessions(user.id);
    await auth.establishSession(ctx.req, ctx.res, user.id, ctx.sessionId);
    return { success: true } as const;
  }),

  forgotPassword: publicProcedure.input(z.object({ email })).mutation(async ({ ctx, input }) => {
    ensureRateLimit(ctx, "reset");
    const user = await db.getUserByEmail(input.email);
    // Delivery is intentionally generic to prevent account enumeration. The raw
    // development token exists only outside production because no email sender is configured.
    const developmentToken = user && process.env.NODE_ENV !== "production" ? await auth.issuePasswordReset(user.id) : null;
    return { success: true as const, ...(developmentToken ? { developmentToken } : {}) };
  }),

  resetPassword: publicProcedure.input(z.object({ token: z.string().min(20).max(200) }).merge(passwordInput)).mutation(async ({ ctx, input }) => {
    validatePassword(input.password, input.confirmPassword);
    const reset = await auth.consumePasswordReset(input.token);
    if (!reset) throw new TRPCError({ code: "BAD_REQUEST", message: "This reset link is invalid or has expired." });
    await db.updateUserPassword(reset.userId, await auth.hashPassword(input.password), { activateLegacy: true });
    await db.revokeAllAuthSessions(reset.userId);
    await auth.establishSession(ctx.req, ctx.res, reset.userId);
    return { success: true } as const;
  }),

  sessions: protectedProcedure.query(async ({ ctx }) => {
    const sessions = await db.listActiveAuthSessions(ctx.user.id);
    return sessions.map(session => ({ id: session.id, current: session.id === ctx.sessionId, userAgent: session.userAgent, createdAt: session.createdAt, lastActiveAt: session.lastActiveAt, expiresAt: session.expiresAt }));
  }),

  revokeOtherSessions: protectedProcedure.mutation(async ({ ctx }) => {
    if (!ctx.sessionId) throw new TRPCError({ code: "UNAUTHORIZED", message: "No active session found." });
    await db.revokeOtherAuthSessions(ctx.user.id, ctx.sessionId);
    return { success: true } as const;
  }),
});
