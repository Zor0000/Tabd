import { describe, expect, it } from "vitest";
import { authDestination, authError, passwordProblem } from "@/lib/auth";
describe("auth boundaries", () => {
  it("keeps return destinations on explicit Tabd routes", () => {
    for (const value of [
      "https://evil.test",
      "//evil.test",
      "/\\evil.test",
      "/connect?extension=bad",
      "/reset-password?next=https://evil.test",
      "%2F%2Fevil.test",
      "/api/resources",
    ])
      expect(authDestination(value)).toBe("/");
    expect(authDestination("/agents")).toBe("/agents");
    expect(authDestination("/reset-password")).toBe("/reset-password");
    expect(
      authDestination(
        "/connect?extension=" + "a".repeat(32) + "&next=https://evil.test",
      ),
    ).toBe("/connect?extension=" + "a".repeat(32));
  });
  it("accepts passphrases without trimming passwords and rejects mismatches", () => {
    expect(
      passwordProblem("a good long passphrase", "a good long passphrase"),
    ).toBeNull();
    expect(passwordProblem(" short ", " short ")).toMatch(/12/);
    expect(
      passwordProblem("a good long passphrase ", "a good long passphrase"),
    ).toMatch(/match/);
    expect(passwordProblem("a".repeat(129), "a".repeat(129))).toMatch(/128/);
  });
  it("does not leak backend internals or account existence", () => {
    expect(authError({ message: "secret transport detail" })).not.toContain(
      "secret",
    );
    expect(authError({ code: "user_already_exists" })).not.toContain(
      "already exists",
    );
    expect(authError({ code: "otp_expired" })).toMatch(/new email/);
    expect(authError({ code: "current_password_mismatch" })).toMatch(
      /current password/,
    );
  });
});
