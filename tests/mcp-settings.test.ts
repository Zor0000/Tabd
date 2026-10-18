vi.mock("../lib/rate-limit", async (original) => ({
  ...(await original<typeof import("../lib/rate-limit")>()),
  limitActor: vi.fn(),
}));
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { serverClient } from "../lib/supabase/server";
import * as tokens from "../app/api/mcp-tokens/route";
import * as taste from "../app/api/taste-profile/route";

vi.mock("../lib/supabase/server", () => ({ serverClient: vi.fn() }));
const owner = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const tokenId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
let captured: Record<string, unknown>;
let selected: string;
let filters: Record<string, unknown>;
let stored: Record<string, unknown> | null;
let db: ReturnType<typeof database>;
function database() {
  const builder = {
    select(columns: string) {
      selected = columns;
      return builder;
    },
    insert(data: Record<string, unknown>) {
      captured = data;
      return builder;
    },
    upsert(data: Record<string, unknown>) {
      captured = data;
      return builder;
    },
    delete: vi.fn(() => builder),
    eq(key: string, value: unknown) {
      filters[key] = value;
      return builder;
    },
    order() {
      return builder;
    },
    single: async () => ({ data: stored, error: null }),
    maybeSingle: async () => ({ data: stored, error: null }),
    then(resolve: (value: unknown) => unknown) {
      return Promise.resolve({
        data: stored ? [stored] : [],
        error: null,
      }).then(resolve);
    },
  };
  return {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: { id: owner } as { id: string } | null },
      })),
    },
    from: vi.fn(() => builder),
  };
}
beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test");
  vi.stubEnv("SUPABASE_SECRET_KEY", "test");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://tabd.test");
  captured = {};
  selected = "";
  filters = {};
  stored = { id: tokenId, name: "Work", expires_at: "2026-11-12" };
  db = database();
  vi.mocked(serverClient).mockResolvedValue(
    db as unknown as Awaited<ReturnType<typeof serverClient>>,
  );
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
function request(method: string, body?: unknown, origin = "https://tabd.test") {
  return new Request("https://tabd.test/api/mcp-tokens", {
    method,
    headers: { Origin: origin, "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
it("issues a one-time random token, persists only its hash and verified owner", async () => {
  const response = await tokens.POST(request("POST", { name: "  Work  " }));
  expect(response.status).toBe(201);
  expect(response.headers.get("cache-control")).toContain("no-store");
  const issued = await response.json();
  expect(issued.token).toMatch(/^tabd_mcp_[a-f0-9]{64}$/);
  expect(captured).toEqual({
    user_id: owner,
    name: "Work",
    token_hash: createHash("sha256").update(issued.token).digest("hex"),
  });
  expect(selected).not.toContain("token_hash");
  expect(issued).not.toHaveProperty("token_hash");
  const second = await (
    await tokens.POST(request("POST", { name: "Work" }))
  ).json();
  expect(second.token).not.toBe(issued.token);
});
it("lists metadata and revokes only a token belonging to the session owner", async () => {
  await tokens.GET(request("GET"));
  expect(selected).toBe("id,name,created_at,expires_at");
  expect(filters).toEqual({ user_id: owner });
  expect((await tokens.DELETE(request("DELETE", { id: tokenId }))).status).toBe(
    200,
  );
  expect(filters).toEqual({ user_id: owner, id: tokenId });
});
it("rejects invalid settings and forged owners before writing", async () => {
  for (const body of [
    { name: "" },
    { name: "Work", user_id: tokenId },
    { name: "x".repeat(61) },
  ])
    expect((await tokens.POST(request("POST", body))).status).toBe(400);
  expect((await tokens.DELETE(request("DELETE", { id: "bad" }))).status).toBe(
    400,
  );
  expect(
    (await taste.PUT(request("PUT", { preferences: "x".repeat(5001) }))).status,
  ).toBe(400);
  expect(captured).toEqual({});
});
it("requires browser authentication and accepts no bearer credential for settings", async () => {
  db.auth.getUser.mockResolvedValue({ data: { user: null } });
  expect((await tokens.GET(request("GET"))).status).toBe(401);
  for (const token of ["tabd_mcp_", "tabd_"]) {
    const req = request("POST", { name: "Work" });
    req.headers.set("Authorization", `Bearer ${token}${"a".repeat(64)}`);
    expect((await tokens.POST(req)).status).toBe(403);
  }
  expect(
    (
      await taste.PUT(
        request("PUT", { preferences: "Compact" }, "https://evil.test"),
      )
    ).status,
  ).toBe(403);
  expect(db.from).not.toHaveBeenCalled();
});
it("reads empty preferences honestly and saves or clears only the owner's preferences", async () => {
  stored = null;
  const empty = await taste.GET(request("GET"));
  expect(await empty.json()).toEqual({ preferences: "", updated_at: null });
  expect(filters).toEqual({ user_id: owner });
  await taste.PUT(request("PUT", { preferences: " Compact layouts " }));
  expect(captured).toMatchObject({
    user_id: owner,
    preferences: "Compact layouts",
  });
  expect(captured.updated_at).toEqual(expect.any(String));
  await taste.PUT(request("PUT", { preferences: "" }));
  expect(captured.preferences).toBe("");
});
