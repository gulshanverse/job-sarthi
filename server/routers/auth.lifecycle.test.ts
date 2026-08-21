import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";

const dbMocks = vi.hoisted(() => ({
  getUserByEmail: vi.fn(),
  updateUserPassword: vi.fn(),
  revokeAllAuthSessions: vi.fn(),
}));
const authMocks = vi.hoisted(() => ({
  allowRateLimit: vi.fn(() => true),
  passwordProblem: vi.fn(() => null),
  verifyPassword: vi.fn(),
  hashPassword: vi.fn(),
  establishSession: vi.fn(),
  clearCurrentSession: vi.fn(),
  consumePasswordReset: vi.fn(),
}));

vi.mock("../db", () => dbMocks);
vi.mock("../auth", () => authMocks);

import { authRouter } from "./auth";

const user = {
  id: 41,
  openId: "legacy-manus-identity",
  name: "Gulshan Kumar",
  email: "gulshan@example.com",
  passwordHash: "existing-argon2-hash",
  authStatus: "active" as const,
  emailVerified: false,
  termsAcceptedAt: null,
  passwordChangedAt: new Date(),
  loginMethod: "password",
  role: "admin" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

function context(overrides: Partial<TrpcContext> = {}) {
  return {
    user: user as TrpcContext["user"],
    sessionId: 7,
    req: { ip: "127.0.0.1", socket: {}, get: vi.fn() } as unknown as TrpcContext["req"],
    res: { cookie: vi.fn(), clearCookie: vi.fn() } as unknown as TrpcContext["res"],
    ...overrides,
  } as TrpcContext;
}

describe("independent auth router lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMocks.allowRateLimit.mockReturnValue(true);
    authMocks.passwordProblem.mockReturnValue(null);
    authMocks.establishSession.mockResolvedValue({ id: 100 });
    authMocks.hashPassword.mockResolvedValue("new-argon2-hash");
  });

  it("logs in by email/password and restores only the safe Job Sarthi identity shape", async () => {
    dbMocks.getUserByEmail.mockResolvedValue(user);
    authMocks.verifyPassword.mockResolvedValue(true);
    const caller = authRouter.createCaller(context({ user: null, sessionId: null }));
    await expect(caller.login({ email: user.email, password: "a-longer-private-passphrase" })).resolves.toMatchObject({ id: user.id, email: user.email, role: "admin", authStatus: "active" });
    expect(authMocks.establishSession).toHaveBeenCalledWith(expect.anything(), expect.anything(), user.id);
    await expect(caller.me()).resolves.toBeNull();
    await expect(authRouter.createCaller(context()).me()).resolves.toEqual(expect.objectContaining({ id: user.id, authStatus: "active", emailVerified: false }));
  });

  it("rejects incorrect credentials and makes preserved legacy accounts use password setup", async () => {
    const caller = authRouter.createCaller(context({ user: null, sessionId: null }));
    dbMocks.getUserByEmail.mockResolvedValueOnce(user);
    authMocks.verifyPassword.mockResolvedValueOnce(false);
    await expect(caller.login({ email: user.email, password: "not-the-password" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    dbMocks.getUserByEmail.mockResolvedValueOnce({ ...user, passwordHash: null, authStatus: "password_setup_required" });
    await expect(caller.login({ email: user.email, password: "not-the-password" })).rejects.toMatchObject({ code: "PRECONDITION_FAILED", message: expect.stringContaining("password setup") });
  });

  it("rotates sessions after a password change", async () => {
    authMocks.verifyPassword.mockResolvedValue(true);
    const ctx = context();
    await expect(authRouter.createCaller(ctx).changePassword({ currentPassword: "current-password", password: "a-new-private-passphrase", confirmPassword: "a-new-private-passphrase" })).resolves.toEqual({ success: true });
    expect(dbMocks.updateUserPassword).toHaveBeenCalledWith(user.id, "new-argon2-hash");
    expect(dbMocks.revokeAllAuthSessions).toHaveBeenCalledWith(user.id);
    expect(authMocks.establishSession).toHaveBeenCalledWith(ctx.req, ctx.res, user.id, ctx.sessionId);
  });

  it("activates a legacy account in place after a valid password reset", async () => {
    authMocks.consumePasswordReset.mockResolvedValue({ id: 15, userId: user.id });
    const ctx = context({ user: null, sessionId: null });
    await expect(authRouter.createCaller(ctx).resetPassword({ token: "a-valid-reset-token-with-enough-length", password: "a-new-private-passphrase", confirmPassword: "a-new-private-passphrase" })).resolves.toEqual({ success: true });
    expect(dbMocks.updateUserPassword).toHaveBeenCalledWith(user.id, "new-argon2-hash", { activateLegacy: true });
    expect(dbMocks.revokeAllAuthSessions).toHaveBeenCalledWith(user.id);
    expect(authMocks.establishSession).toHaveBeenCalledWith(ctx.req, ctx.res, user.id);
  });
});
