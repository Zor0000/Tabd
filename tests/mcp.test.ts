import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { GET, POST } from "../app/api/mcp/route";
import { actor } from "../lib/api";
import { dashboardActor, mcpActor } from "../lib/mcp/auth";

vi.mock("@supabase/supabase-js", () => ({ createClient: vi.fn() }));
vi.mock("../lib/supabase/server", () => ({ serverClient: vi.fn() }));
const alice = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const bob = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const id = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const tokenA = "tabd_mcp_" + "a".repeat(64),
  tokenB = "tabd_mcp_" + "b".repeat(64);
const hash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
let rows: Record<string, Record<string, unknown>[]>;
let queries: {
  table: string;
  filters: Record<string, unknown>;
  columns: string;
}[];
let db: ReturnType<typeof fakeDatabase>;

function fakeDatabase() {
  return {
    from(table: string) {
      const filters: Record<string, unknown> = {};
      let columns = "",
        from = 0,
        to = 1000;
      const builder = {
        select(value: string) {
          columns = value;
          return builder;
        },
        eq(key: string, value: unknown) {
          filters[key] = value;
          return builder;
        },
        gt(key: string, value: unknown) {
          filters[`gt:${key}`] = value;
          return builder;
        },
        order() {
          return builder;
        },
        range(start: number, end: number) {
          from = start;
          to = end;
          return builder;
        },
        async maybeSingle() {
          const result = await builder;
          return { data: result.data[0] ?? null, error: null };
        },
        then(
          resolve: (value: {
            data: Record<string, unknown>[];
            error: null;
          }) => unknown,
        ) {
          queries.push({ table, filters, columns });
          return Promise.resolve({
            data: (rows[table] ?? [])
              .filter((row) =>
                Object.entries(filters).every(([key, value]) =>
                  key.startsWith("gt:")
                    ? String(row[key.slice(3)]) > String(value)
                    : row[key] === value,
                ),
              )
              .slice(from, to + 1),
            error: null,
          }).then(resolve);
        },
      };
      return builder;
    },
    rpc: vi.fn(async (_name: string, args: Record<string, unknown>) => ({
      data:
        args.search_query === "missing"
          ? []
          : (rows.bookmarks ?? [])
              .filter(
                (row) =>
                  row.user_id === args.owner_id &&
                  (!args.favorites_only || row.is_favorite),
              )
              .map((resource) => ({ resource, relevance: 0.1 })),
      error: null as null | { message: string },
    })),
  };
}
beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test");
  vi.stubEnv("SUPABASE_SECRET_KEY", "server-only-test");
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://tabd.test");
  rows = {
    mcp_tokens: [
      {
        token_hash: hash(tokenA),
        user_id: alice,
        expires_at: "2099-01-01T00:00:00.000Z",
      },
      {
        token_hash: hash(tokenB),
        user_id: bob,
        expires_at: "2099-01-01T00:00:00.000Z",
      },
    ],
    bookmarks: [
      {
        id,
        user_id: alice,
        url: "https://example.com",
        title: "Dashboard",
        description: "A saved reference",
        hostname: "example.com",
        collection_id: null,
        tags: ["compact"],
        personal_note: "I like the spacing",
        status: "Reference",
        is_favorite: true,
        is_archived: false,
        preview_image_url: "https://example.com/og.png",
        created_at: "2026-01-01",
        updated_at: "2026-01-02",
      },
    ],
    taste_profiles: [
      {
        user_id: alice,
        preferences: "Compact dashboards",
        updated_at: "2026-01-01",
      },
    ],
    collections: [{ id, user_id: alice, name: "Dashboards", parent_id: null }],
  };
  queries = [];
  db = fakeDatabase();
  vi.mocked(createClient).mockReturnValue(
    db as unknown as ReturnType<typeof createClient>,
  );
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

function request(
  token?: string,
  payload: unknown = { jsonrpc: "2.0", id: 1, method: "tools/list" },
) {
  return new Request("https://tabd.test/api/mcp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
}
async function connect(token = tokenA) {
  const client = new Client({ name: "tabd-test-agent", version: "1.0.0" });
  await client.connect(
    new StreamableHTTPClientTransport(new URL("https://tabd.test/api/mcp"), {
      requestInit: { headers: { Authorization: `Bearer ${token}` } },
      fetch: async (url, init) => {
        const req = new Request(url, init);
        return req.method === "POST" ? POST(req) : GET();
      },
    }),
  );
  return client;
}
describe("Tabd MCP over the real SDK HTTP transport", () => {
  it("initializes, discovers and calls all five tools with structured results", async () => {
    const client = await connect();
    try {
      const list = await client.listTools();
      expect(list.tools.map((t) => t.name)).toEqual([
        "search_library",
        "get_reference",
        "get_collection",
        "get_taste_profile",
        "get_design_context",
      ]);
      expect(list.tools.every((t) => t.annotations?.readOnlyHint)).toBe(true);
      const search = await client.callTool({
        name: "search_library",
        arguments: { query: "dashboard", tags: ["compact"], limit: 1 },
      });
      expect(search.structuredContent).toMatchObject({
        search_method: "keyword_full_text",
        references: [{ id, personal_note: "I like the spacing" }],
      });
      expect(db.rpc).toHaveBeenCalledWith(
        "search_library_references",
        expect.objectContaining({
          owner_id: alice,
          required_tags: ["compact"],
          page_size: 2,
        }),
      );
      expect(JSON.stringify(search)).not.toContain("user_id");
      expect(
        (
          await client.callTool({
            name: "get_reference",
            arguments: { reference_id: id },
          })
        ).structuredContent,
      ).toMatchObject({ reference: { id, preview: { kind: "site_preview" } } });
      expect(
        (await client.callTool({ name: "get_collection", arguments: {} }))
          .structuredContent,
      ).toMatchObject({ collections: [{ name: "Dashboards" }] });
      expect(
        (
          await client.callTool({
            name: "get_collection",
            arguments: { collection_id: id },
          })
        ).structuredContent,
      ).toMatchObject({ includes_descendants: true, references: [{ id }] });
      expect(
        (await client.callTool({ name: "get_taste_profile", arguments: {} }))
          .structuredContent,
      ).toMatchObject({
        preferences: "Compact dashboards",
        preferences_source: "user_written",
        favorite_examples: [{ id }],
      });
      expect(
        (
          await client.callTool({
            name: "get_design_context",
            arguments: { task: "Build my dashboard", query: "dashboard" },
          })
        ).structuredContent,
      ).toMatchObject({
        task: "Build my dashboard",
        taste: { preferences: "Compact dashboards" },
        references: [{ id }],
      });
      for (const query of queries.filter((q) => q.table !== "mcp_tokens"))
        expect(query.filters.user_id).toBe(alice);
    } finally {
      await client.close();
    }
  });

  it("never leaks references, collections or taste between accounts", async () => {
    const client = await connect(tokenB);
    try {
      expect(
        (await client.callTool({ name: "search_library", arguments: {} }))
          .structuredContent,
      ).toMatchObject({ references: [] });
      expect(
        (
          await client.callTool({
            name: "get_reference",
            arguments: { reference_id: id },
          })
        ).isError,
      ).toBe(true);
      expect(
        (
          await client.callTool({
            name: "get_collection",
            arguments: { collection_id: id },
          })
        ).isError,
      ).toBe(true);
      expect(
        (await client.callTool({ name: "get_taste_profile", arguments: {} }))
          .structuredContent,
      ).toMatchObject({ preferences: "", favorite_examples: [] });
      expect(
        (
          await client.callTool({
            name: "get_design_context",
            arguments: { task: "Build dashboard", query: "dashboard" },
          })
        ).structuredContent,
      ).toMatchObject({ references: [], taste: { preferences: "" } });
    } finally {
      await client.close();
    }
  });

  it("validates inputs, returns honest empty results and redacts database errors", async () => {
    const client = await connect();
    try {
      for (const args of [
        { limit: 999 },
        { user_id: bob },
        { collection_id: "invalid" },
      ]) {
        expect(
          (await client.callTool({ name: "search_library", arguments: args }))
            .isError,
        ).toBe(true);
      }
      expect(db.rpc).not.toHaveBeenCalled();
      const empty = await client.callTool({
        name: "get_design_context",
        arguments: { task: "Build", query: "missing" },
      });
      expect(empty.structuredContent).toMatchObject({
        references: [],
        next_offset: null,
      });
      db.rpc.mockResolvedValueOnce({
        data: [],
        error: { message: "secret database internals" },
      });
      const failure = await client.callTool({
        name: "search_library",
        arguments: {},
      });
      expect(failure.isError).toBe(true);
      expect(JSON.stringify(failure)).not.toContain(
        "secret database internals",
      );
    } finally {
      await client.close();
    }
  });

  it("revalidates tokens after initialization, including revocation and expiry", async () => {
    const client = await connect();
    rows.mcp_tokens = [];
    try {
      await expect(client.listTools()).rejects.toThrow();
    } finally {
      await client.close();
    }
    rows.mcp_tokens = [
      {
        token_hash: hash(tokenA),
        user_id: alice,
        expires_at: "2000-01-01T00:00:00.000Z",
      },
    ];
    expect((await POST(request(tokenA))).status).toBe(401);
  });

  it("rejects cookie-only, extension and malformed credentials and foreign origins", async () => {
    for (const token of [undefined, "tabd_" + "a".repeat(64), "invalid"]) {
      const req = request(token);
      req.headers.set("cookie", "fake=session");
      const response = await POST(req);
      expect(response.status).toBe(401);
      expect(response.headers.get("WWW-Authenticate")).toContain("Bearer");
    }
    const req = request(tokenA);
    req.headers.set("Origin", "https://evil.example");
    expect((await POST(req)).status).toBe(403);
    await expect(actor(request(tokenA))).rejects.toMatchObject({ status: 401 });
    await expect(dashboardActor(request(tokenA))).rejects.toMatchObject({
      status: 403,
    });
    await expect(
      dashboardActor(request("tabd_" + "a".repeat(64))),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("bounds requests and keeps errors and protocol responses uncached", async () => {
    const oversized = request(tokenA, { long: "x".repeat(21000) });
    const response = await POST(oversized);
    expect(response.status).toBe(413);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    const invalid = request(tokenA);
    invalid.headers.set("mcp-protocol-version", "invalid");
    expect((await POST(invalid)).status).toBe(400);
    expect(GET().status).toBe(405);
    vi.stubEnv("SUPABASE_SECRET_KEY", "");
    await expect(mcpActor(request(tokenA))).rejects.toMatchObject({
      status: 503,
    });
  });
});
