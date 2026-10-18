import assert from "node:assert/strict";
const origin = new URL(
  process.env.TABD_ACCEPTANCE_URL || "https://www.tab-dd.tech",
).origin;
const checks = [
  ["/login", 200],
  ["/preview", 200],
  ["/api/extension/status", 200],
  ["/api/resources", 401],
  ["/api/resources/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/preview", 401],
  ["/api/mcp", 405],
];
for (const [path, expected] of checks) {
  const response = await fetch(origin + path, {
    redirect: "manual",
    signal: AbortSignal.timeout(20000),
  });
  assert.equal(response.status, expected, `${path}: unexpected status`);
  if (path === "/api/extension/status")
    assert.equal((await response.json()).app, "tabd");
  if (path === "/api/resources")
    assert.match(response.headers.get("cache-control"), /no-store/);
  console.log(`PASS ${path} (${response.status})`);
}
const rejected = await fetch(origin + "/api/mcp", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: "{}",
  signal: AbortSignal.timeout(20000),
});
assert.equal(rejected.status, 401);
assert.match(rejected.headers.get("www-authenticate"), /Bearer/);
console.log("PASS MCP rejects anonymous access");

const write = await fetch(origin + "/api/extension-token", {
  method: "POST",
  headers: { origin },
  signal: AbortSignal.timeout(20000),
});
assert.equal(
  write.status,
  401,
  "Canonical origin must pass CSRF validation before authentication",
);
console.log(
  "PASS canonical origin accepts browser writes before authentication",
);
