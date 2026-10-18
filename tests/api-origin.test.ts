vi.mock("../lib/rate-limit", async (original) => ({
  ...(await original<typeof import("../lib/rate-limit")>()),
  enforceLimit: vi.fn(),
  limitActor: vi.fn(),
}));
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { actor } from "../lib/api";
import { serverClient } from "../lib/supabase/server";

vi.mock("../lib/supabase/server", () => ({ serverClient: vi.fn() }));

const user = { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" };

function request(
  origin: string,
  method = "POST",
  url = "http://0.0.0.0:3210/api/collections",
) {
  return new Request(url, { method, headers: { origin } });
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-publishable-key");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3210");
  vi.mocked(serverClient).mockResolvedValue({
    auth: { getUser: async () => ({ data: { user } }) },
  } as unknown as Awaited<ReturnType<typeof serverClient>>);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("browser mutation origin checks", () => {
  it.each(["POST", "PUT", "PATCH", "DELETE"])(
    "allows same-origin %s when Next.js uses the wildcard bind address",
    async (method) => {
      expect(
        await actor(request("http://localhost:3210", method)),
      ).toMatchObject({
        userId: user.id,
        extension: false,
      });
    },
  );

  it("allows the configured HTTPS origin behind an internal HTTP proxy", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://tabd.example.com/");
    expect(
      await actor(
        request(
          "https://tabd.example.com",
          "POST",
          "http://internal:3000/api/collections",
        ),
      ),
    ).toMatchObject({ userId: user.id });
  });

  it.each(["https://evil.example", "http://localhost:3000", "null"])(
    "rejects the foreign origin %s before authenticating",
    async (origin) => {
      await expect(actor(request(origin))).rejects.toMatchObject({
        status: 403,
      });
      expect(serverClient).not.toHaveBeenCalled();
    },
  );

  it("does not trust a forged request URL or forwarded host over the configured origin", async () => {
    const forged = request(
      "https://evil.example",
      "POST",
      "https://evil.example/api/collections",
    );
    forged.headers.set("x-forwarded-host", "evil.example");
    await expect(actor(forged)).rejects.toMatchObject({ status: 403 });
  });

  it("falls back to the request origin when no app URL is configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    expect(
      await actor(
        request(
          "http://localhost:3210",
          "POST",
          "http://localhost:3210/api/collections",
        ),
      ),
    ).toMatchObject({ userId: user.id });
  });

  it("still requires a signed-in user after accepting the origin", async () => {
    vi.mocked(serverClient).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null } }) },
    } as unknown as Awaited<ReturnType<typeof serverClient>>);
    await expect(actor(request("http://localhost:3210"))).rejects.toMatchObject(
      { status: 401 },
    );
  });
});
