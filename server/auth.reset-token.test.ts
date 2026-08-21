import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  createPasswordResetToken: vi.fn(),
  getUsablePasswordResetToken: vi.fn(),
  consumePasswordResetToken: vi.fn(),
}));

vi.mock("./db", () => dbMocks);

import { RESET_TOKEN_TTL_MS, consumePasswordReset, hashToken, issuePasswordReset } from "./auth";

describe("password reset tokens", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stores only a hash and issues a short-lived opaque token", async () => {
    const before = Date.now();
    const rawToken = await issuePasswordReset(42);
    const call = dbMocks.createPasswordResetToken.mock.calls[0]?.[0];
    expect(call).toMatchObject({ userId: 42, tokenHash: hashToken(rawToken) });
    expect(call.tokenHash).not.toBe(rawToken);
    expect(call.expiresAt.getTime()).toBeGreaterThanOrEqual(before + RESET_TOKEN_TTL_MS);
    expect(call.expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + RESET_TOKEN_TTL_MS);
  });

  it("consumes each usable token exactly once and rejects unavailable tokens", async () => {
    const reset = { id: 9, userId: 42 };
    dbMocks.getUsablePasswordResetToken.mockResolvedValueOnce(reset).mockResolvedValueOnce(undefined);
    await expect(consumePasswordReset("usable-token")).resolves.toEqual(reset);
    expect(dbMocks.getUsablePasswordResetToken).toHaveBeenCalledWith(hashToken("usable-token"));
    expect(dbMocks.consumePasswordResetToken).toHaveBeenCalledWith(9);
    await expect(consumePasswordReset("expired-or-used-token")).resolves.toBeNull();
    expect(dbMocks.consumePasswordResetToken).toHaveBeenCalledTimes(1);
  });
});
