import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { enforceLimit, limitActor, RateLimitError } from "../lib/rate-limit";
import { failure } from "../lib/api";
vi.mock("@supabase/supabase-js", () => ({ createClient: vi.fn() }));
const abortSignal = vi.fn();
const rpc = vi.fn(() => ({ abortSignal }));
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("SUPABASE_SECRET_KEY", "test-only");
  vi.mocked(createClient).mockReturnValue({ rpc } as unknown as ReturnType<
    typeof createClient
  >);
  abortSignal.mockResolvedValue({
    data: { allowed: true, retry_after: 15 },
    error: null,
  });
});
afterEach(() => vi.unstubAllEnvs());
describe("shared rate limiting", () => {
  it("shares the same account budget between browser and extension", async () => {
    for (const headers of [
      new Headers(),
      new Headers({ authorization: "Bearer extension-token" }),
    ])
      await limitActor(
        new Request("https://tabd.test/api/resources", {
          method: "POST",
          headers,
        }),
        "alice",
      );
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc).toHaveBeenNthCalledWith(1, "consume_api_limit", {
      subject_key: "alice",
      bucket_name: "write",
      max_requests: 60,
      window_seconds: 60,
    });
    expect(rpc.mock.calls[0]).toEqual(rpc.mock.calls[1]);
  });
  it("adds the metadata budget to the general write budget", async () => {
    await limitActor(
      new Request("https://tabd.test/api/resources/id/metadata", {
        method: "POST",
      }),
      "alice",
    );
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc).toHaveBeenLastCalledWith(
      "consume_api_limit",
      expect.objectContaining({ bucket_name: "metadata" }),
    );
  });
  it("returns a private 429 with a usable Retry-After", async () => {
    abortSignal.mockResolvedValue({
      data: { allowed: false, retry_after: 42 },
      error: null,
    });
    let caught: unknown;
    try {
      await enforceLimit("alice", "mcp");
    } catch (error) {
      caught = error;
    }
    const response = failure(caught);
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("42");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });
  it.each([
    { data: null, error: { message: "database error" } },
    { data: {}, error: null },
  ])("fails closed on invalid RPC results", async (result) => {
    abortSignal.mockResolvedValue(result);
    await expect(enforceLimit("alice", "read")).rejects.toMatchObject({
      status: 503,
    });
  });
  it("fails closed on timeouts and missing credentials", async () => {
    abortSignal.mockRejectedValue(new Error("timeout"));
    await expect(enforceLimit("alice", "capture")).rejects.toBeInstanceOf(
      RateLimitError,
    );
    vi.stubEnv("SUPABASE_SECRET_KEY", "");
    await expect(enforceLimit("alice", "read")).rejects.toMatchObject({
      status: 503,
    });
  });
});
