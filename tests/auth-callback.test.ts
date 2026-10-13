import { beforeEach, describe, expect, it, vi } from "vitest";
const { exchangeCodeForSession } = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  serverClient: async () => ({ auth: { exchangeCodeForSession } }),
}));
import { GET } from "@/app/auth/callback/route";
beforeEach(() => {
  exchangeCodeForSession.mockReset();
  exchangeCodeForSession.mockResolvedValue({ error: null });
});
describe("auth callback", () => {
  it("exchanges a recovery code and sends the user to password entry without caching credentials", async () => {
    const res = await GET(
      new Request(
        "https://tabd.test/auth/callback?code=one-use-code&next=/reset-password",
      ),
    );
    expect(exchangeCodeForSession).toHaveBeenCalledWith("one-use-code");
    expect(res.headers.get("location")).toBe(
      "https://tabd.test/reset-password",
    );
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(res.headers.get("referrer-policy")).toBe("no-referrer");
  });
  it("rejects open redirects after authentication", async () => {
    const res = await GET(
      new Request(
        "https://tabd.test/auth/callback?code=code&next=https://evil.test",
      ),
    );
    expect(res.headers.get("location")).toBe("https://tabd.test/");
  });
  it("provides a recoverable expired-link state instead of silently dropping users at login", async () => {
    exchangeCodeForSession.mockResolvedValue({
      error: { code: "otp_expired" },
    });
    const res = await GET(
      new Request(
        "https://tabd.test/auth/callback?code=expired&next=/reset-password",
      ),
    );
    expect(res.headers.get("location")).toBe(
      "https://tabd.test/forgot-password?notice=link-expired",
    );
  });
  it("handles provider denial and network failure without disclosing details", async () => {
    let res = await GET(
      new Request(
        "https://tabd.test/auth/callback?error=access_denied&error_description=private",
      ),
    );
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
    expect(res.headers.get("location")).toBe(
      "https://tabd.test/login?notice=callback-failed",
    );
    exchangeCodeForSession.mockRejectedValue(new Error("private failure"));
    res = await GET(new Request("https://tabd.test/auth/callback?code=abc"));
    expect(res.headers.get("location")).toBe(
      "https://tabd.test/login?notice=callback-failed",
    );
  });
});
