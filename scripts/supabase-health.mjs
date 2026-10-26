import assert from "node:assert/strict";
import { setTimeout as sleep } from "node:timers/promises";

const origin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
assert.ok(key, "Missing Supabase publishable key");
assert.equal(new URL(origin).protocol, "https:");
// Never use a privileged key: this also checks anonymous RLS boundaries.
assert.ok(key.startsWith("sb_publishable_"), "A publishable key is required");

for (const table of ["profiles", "collections", "bookmarks"]) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(
        `${origin}/rest/v1/${table}?select=id&limit=1`,
        {
          headers: { apikey: key, "Cache-Control": "no-cache" },
          redirect: "error",
          signal: AbortSignal.timeout(15000),
        },
      );
      assert.equal(response.status, 200, `${table}: HTTP ${response.status}`);
      const rows = await response.json();
      // Do not log response bodies, even if a policy accidentally exposes data.
      assert.ok(
        Array.isArray(rows) && rows.length === 0,
        `${table}: anonymous access must return an empty array`,
      );
      console.log(
        `PASS Supabase ${table}: database reachable, anonymous rows hidden`,
      );
      break;
    } catch (error) {
      if (attempt === 3) throw error;
      console.warn(`${table}: attempt ${attempt} failed; retrying`);
      await sleep(attempt * 5000);
    }
  }
}
