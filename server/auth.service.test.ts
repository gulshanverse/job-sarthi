import { describe, expect, it } from "vitest";
import { allowRateLimit, hashPassword, hashToken, passwordProblem, randomToken, verifyPassword } from "./auth";

describe("independent authentication service", () => {
  it("uses verifiable Argon2id password hashes without retaining the plaintext", async () => {
    const password = "a-longer-private-passphrase";
    const hashed = await hashPassword(password);
    expect(hashed).not.toContain(password);
    expect(hashed.startsWith("$argon2id$")).toBe(true);
    await expect(verifyPassword(hashed, password)).resolves.toBe(true);
    await expect(verifyPassword(hashed, "incorrect-password")).resolves.toBe(false);
  });

  it("enforces the independent password policy and creates opaque token hashes", () => {
    expect(passwordProblem("password123")).toBeTruthy();
    expect(passwordProblem("short")).toBeTruthy();
    expect(passwordProblem("a-longer-private-passphrase")).toBeNull();
    const token = randomToken();
    expect(token).not.toHaveLength(0);
    expect(hashToken(token)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashToken(token)).not.toBe(token);
  });

  it("bounds repeated requests within a rate-limit window", () => {
    const key = `test-${randomToken()}`;
    expect(allowRateLimit(key, 2, 60_000)).toBe(true);
    expect(allowRateLimit(key, 2, 60_000)).toBe(true);
    expect(allowRateLimit(key, 2, 60_000)).toBe(false);
  });
});
