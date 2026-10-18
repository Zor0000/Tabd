// Creates isolated disposable accounts, tests the hosted APIs, then removes its fixtures.
// Does NOT validate real email delivery or browser/extension UI pairing.
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
const origin = new URL(
  process.env.TABD_ACCEPTANCE_URL || "https://www.tab-dd.tech",
).origin;
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
assert(
  url && key && publicKey,
  "Load Supabase credentials from a local environment file.",
);
const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const accounts = [],
  clients = [];
function pass(label) {
  console.log(`PASS ${label}`);
}
async function account() {
  const email = `tabd-acceptance-${randomUUID()}@example.com`;
  const password = randomBytes(32).toString("hex");
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  assert(
    !error,
    `Could not create disposable account (${error?.code || "unknown"})`,
  );
  const user = { id: data.user.id, cookies: new Map() };
  accounts.push(user);
  const db = createServerClient(url, publicKey, {
    cookies: {
      getAll: () => [...user.cookies].map(([name, value]) => ({ name, value })),
      setAll: (values) =>
        values.forEach(({ name, value }) => user.cookies.set(name, value)),
    },
  });
  assert(
    !(await db.auth.signInWithPassword({ email, password })).error,
    "Fixture sign-in failed",
  );
  user.db = db;
  return user;
}
async function request(
  user,
  path,
  method = "GET",
  body,
  expected = 200,
  bearer,
) {
  const headers = { origin, "Content-Type": "application/json" };
  if (bearer) headers.authorization = `Bearer ${bearer}`;
  else if (user)
    headers.cookie = [...user.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
  const response = await fetch(origin + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(65000),
    redirect: "manual",
  });
  assert.equal(
    response.status,
    expected,
    `${method} ${path}: unexpected status`,
  );
  if (path.startsWith("/api/"))
    assert.match(response.headers.get("cache-control"), /no-store/);
  return response;
}
async function mcp(token) {
  const client = new Client({
    name: "tabd-production-acceptance",
    version: "1.0.0",
  });
  clients.push(client);
  await client.connect(
    new StreamableHTTPClientTransport(new URL(origin + "/api/mcp"), {
      requestInit: { headers: { Authorization: `Bearer ${token}` } },
    }),
  );
  return client;
}
try {
  const alice = await account(),
    bob = await account();
  const extension = await (
    await request(alice, "/api/extension-token", "POST")
  ).json();
  const collection = await (
    await request(
      alice,
      "/api/collections",
      "POST",
      { name: "Acceptance test" },
      201,
    )
  ).json();
  const saved = await (
    await request(
      null,
      "/api/resources",
      "POST",
      {
        url: "https://example.com/",
        title: "Acceptance reference",
        collection_id: collection.id,
        tags: ["acceptance"],
      },
      201,
      extension.token,
    )
  ).json();
  await request(
    null,
    "/api/resources",
    "POST",
    { url: "https://example.com/" },
    409,
    extension.token,
  );
  await request(alice, `/api/resources/${saved.id}`, "PATCH", {
    title: "Acceptance edited",
    personal_note: "Fixture only",
  });
  const search = await (
    await request(alice, "/api/resources?q=acceptance")
  ).json();
  assert(
    search.some(
      (row) => row.id === saved.id && row.title === "Acceptance edited",
    ),
  );
  pass(
    "browser session CRUD/search and extension bearer save/duplicate handling",
  );
  assert.deepEqual(await (await request(bob, "/api/resources")).json(), []);
  await request(
    bob,
    `/api/resources/${saved.id}`,
    "PATCH",
    { title: "Not permitted" },
    404,
  );
  await request(
    bob,
    `/api/resources/${saved.id}/preview`,
    "GET",
    undefined,
    404,
  );
  await request(
    bob,
    "/api/resources",
    "POST",
    { url: "https://example.org/", collection_id: collection.id },
    404,
  );
  pass("two-account ownership isolation");
  const preview = await request(alice, `/api/resources/${saved.id}/preview`);
  assert.match(preview.headers.get("content-type"), /image\/jpeg/);
  const bytes = new Uint8Array(await preview.arrayBuffer());
  assert(bytes[0] === 255 && bytes[1] === 216 && bytes.length > 100);
  pass("hosted Chromium capture and private preview response");
  const token = await (
    await request(alice, "/api/mcp-tokens", "POST", { name: "Acceptance" }, 201)
  ).json();
  const otherToken = await (
    await request(bob, "/api/mcp-tokens", "POST", { name: "Acceptance" }, 201)
  ).json();
  const client = await mcp(token.token),
    other = await mcp(otherToken.token);
  assert.equal((await client.listTools()).tools.length, 5);
  for (const [name, args] of [
    ["search_library", { query: "acceptance" }],
    ["get_reference", { reference_id: saved.id }],
    ["get_collection", {}],
    ["get_taste_profile", {}],
    [
      "get_design_context",
      { task: "Find acceptance inspiration", query: "acceptance" },
    ],
  ])
    assert(
      !(await client.callTool({ name, arguments: args })).isError,
      `${name} failed`,
    );
  const denied = await other.callTool({
    name: "get_reference",
    arguments: { reference_id: saved.id },
  });
  assert(denied.isError, "MCP cross-account reference was not rejected");
  pass("MCP handshake, all five tools, and cross-account isolation");
  await request(alice, "/api/mcp-tokens", "DELETE", { id: token.id });
  await request(null, "/api/mcp", "POST", {}, 401, token.token);
  await request(alice, "/api/extension-token", "DELETE");
  await request(null, "/api/resources", "GET", undefined, 401, extension.token);
  pass("MCP and extension revocation takes effect immediately");
  await request(alice, `/api/resources/${saved.id}`, "DELETE");
  await request(alice, `/api/collections/${collection.id}`, "DELETE");
  pass("resource and collection deletion");
  if (process.env.TABD_VERIFY_LIMITS === "1") {
    const statuses = [];
    for (let batch = 0; batch < 7; batch++) {
      const responses = await Promise.all(
        Array.from({ length: 10 }, () =>
          fetch(origin + "/api/collections", {
            method: "POST",
            headers: {
              origin,
              "Content-Type": "application/json",
              cookie: [...alice.cookies]
                .map(([k, v]) => `${k}=${v}`)
                .join("; "),
            },
            body: "{}",
            signal: AbortSignal.timeout(20000),
          }),
        ),
      );
      for (const response of responses) {
        assert(
          [400, 429].includes(response.status),
          "Unexpected response during rate-limit check",
        );
        if (response.status === 429) {
          assert(Number(response.headers.get("retry-after")) > 0);
          assert(response.headers.get("x-request-id"));
        }
        statuses.push(response.status);
        await response.arrayBuffer();
      }
    }
    assert(
      statuses.includes(429),
      "Expected account write limit to reject burst",
    );
    pass("shared account write limit returns 429, Retry-After and request ID");
  }
} finally {
  for (const client of clients) await client.close().catch(() => {});
  for (const account of accounts) {
    await account.db?.auth.signOut();
    const { data: objects } = await admin.storage
      .from("website-previews")
      .list(account.id);
    for (const folder of objects || []) {
      const { data: files } = await admin.storage
        .from("website-previews")
        .list(`${account.id}/${folder.name}`);
      if (files?.length)
        assert(
          !(
            await admin.storage
              .from("website-previews")
              .remove(
                files.map(
                  (file) => `${account.id}/${folder.name}/${file.name}`,
                ),
              )
          ).error,
          "Fixture storage cleanup failed",
        );
    }
    assert(
      !(await admin.auth.admin.deleteUser(account.id)).error,
      "Fixture account cleanup failed",
    );
  }
  console.log("Disposable acceptance accounts cleaned up");
}
