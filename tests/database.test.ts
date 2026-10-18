import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
let db: PGlite;
const alice = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  bob = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
async function asUser(id: string) {
  await db.exec(
    `reset role;set role authenticated;select set_config('request.jwt.claim.sub','${id}',false);`,
  );
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create schema auth;create role anon;create role authenticated;create role service_role bypassrls;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth,public to authenticated,service_role;grant execute on function auth.uid() to authenticated,service_role;insert into auth.users values('${alice}'),('${bob}');alter default privileges in schema public grant all on tables to anon,authenticated,service_role;`,
  );
  // Supabase owns this schema in production; model its relevant tables for RLS checks.
  await db.exec(`create schema storage;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text not null);
    alter table storage.objects enable row level security;
    grant usage on schema storage to authenticated,service_role;
    grant select,insert,update,delete on storage.objects to authenticated,service_role;`);
  for (const migration of readdirSync("supabase/migrations")
    .filter((name) => name.endsWith(".sql"))
    .sort()) {
    await db.exec(readFileSync(`supabase/migrations/${migration}`, "utf8"));
  }
});
afterAll(async () => {
  await db.close();
});
describe("real PostgreSQL schema and RLS", () => {
  it("isolates resources and prevents ownership changes", async () => {
    await asUser(alice);
    await db.query(
      `insert into bookmarks(user_id,url,normalized_url,title,hostname) values($1,'https://example.com/','https://example.com/','Example','example.com')`,
      [alice],
    );
    await asUser(bob);
    expect((await db.query("select * from bookmarks")).rows).toHaveLength(0);
    await expect(
      db.query(
        `insert into bookmarks(user_id,url,normalized_url,title,hostname) values($1,'https://evil.com','https://evil.com','No','evil.com')`,
        [alice],
      ),
    ).rejects.toThrow();
    await asUser(alice);
    await expect(
      db.query("update bookmarks set user_id=$1", [bob]),
    ).rejects.toThrow();
  });
  it("prevents duplicates per owner while allowing another user to save the same URL", async () => {
    await asUser(alice);
    await expect(
      db.query(
        `insert into bookmarks(user_id,url,normalized_url,title,hostname) values($1,'https://example.com/','https://example.com/','Example','example.com')`,
        [alice],
      ),
    ).rejects.toThrow();
    await asUser(bob);
    await db.query(
      `insert into bookmarks(user_id,url,normalized_url,title,hostname) values($1,'https://example.com/','https://example.com/','Example','example.com')`,
      [bob],
    );
  });
  it("rejects cross-user collection assignment and parents", async () => {
    await asUser(alice);
    const { rows } = await db.query<{ id: string }>(
      `insert into collections(user_id,name) values($1,'UI Components') returning id`,
      [alice],
    );
    const col = rows[0].id;
    await asUser(bob);
    await expect(
      db.query(
        `insert into collections(user_id,name,parent_id) values($1,'Stolen',$2)`,
        [bob, col],
      ),
    ).rejects.toThrow();
    await expect(
      db.query(`update bookmarks set collection_id=$1`, [col]),
    ).rejects.toThrow();
  });
  it("moves resources to Inbox and preserves subcollections when a collection is deleted", async () => {
    await asUser(alice);
    const { rows } = await db.query<{ id: string }>(
      `select id from collections where name='UI Components'`,
    );
    const col = rows[0].id;
    await db.query("update bookmarks set collection_id=$1", [col]);
    await db.query(
      `insert into collections(user_id,name,parent_id) values($1,'React',$2)`,
      [alice, col],
    );
    await db.query("delete from collections where id=$1", [col]);
    const resource = await db.query<{ collection_id: string | null }>(
      "select collection_id from bookmarks",
    );
    expect(resource.rows[0].collection_id).toBeNull();
    const child = await db.query<{ parent_id: string | null }>(
      `select parent_id from collections where name='React'`,
    );
    expect(child.rows[0].parent_id).toBeNull();
  });
  it("enforces nesting depth and rejects cycles", async () => {
    await asUser(alice);
    const root = (
      await db.query<{ id: string }>(
        `select id from collections where name='React'`,
      )
    ).rows[0].id;
    const child = (
      await db.query<{ id: string }>(
        `insert into collections(user_id,name,parent_id) values($1,'Animations',$2) returning id`,
        [alice, root],
      )
    ).rows[0].id;
    const leaf = (
      await db.query<{ id: string }>(
        `insert into collections(user_id,name,parent_id) values($1,'Motion',$2) returning id`,
        [alice, child],
      )
    ).rows[0].id;
    await expect(
      db.query(
        `insert into collections(user_id,name,parent_id) values($1,'Too deep',$2)`,
        [alice, leaf],
      ),
    ).rejects.toThrow();
    await expect(
      db.query(`update collections set parent_id=$1 where id=$2`, [leaf, root]),
    ).rejects.toThrow();
  });
  it("updates full-text search for title, notes and tags", async () => {
    await asUser(alice);
    await db.query(
      `update bookmarks set tags=array['animation'],personal_note='Useful for prototypes'`,
    );
    for (const term of ["example", "animation", "prototypes"]) {
      const { rows } = await db.query(
        `select id from bookmarks where search_document @@ websearch_to_tsquery('simple',$1)`,
        [term],
      );
      expect(rows).toHaveLength(1);
    }
  });
  it("records opens atomically and prevents another user from recording them", async () => {
    await asUser(alice);
    const id = (await db.query<{ id: string }>("select id from bookmarks"))
      .rows[0].id;
    await db.query("select record_open($1,$2)", [id, alice]);
    await db.query("select record_open($1,$2)", [id, alice]);
    expect(
      (
        await db.query<{ open_count: number }>(
          "select open_count from bookmarks",
        )
      ).rows[0].open_count,
    ).toBe(2);
    await asUser(bob);
    expect(
      (
        await db.query<{ record_open: unknown }>("select record_open($1,$2)", [
          id,
          alice,
        ])
      ).rows[0].record_open,
    ).toBeNull();
  });
  it("protects extension token records from other users", async () => {
    await asUser(alice);
    await db.query(
      `insert into extension_tokens(user_id,token_hash,expires_at) values($1,$2,now()+interval '30 days')`,
      [alice, "a".repeat(64)],
    );
    await asUser(bob);
    expect(
      (await db.query("select * from extension_tokens")).rows,
    ).toHaveLength(0);
  });
  it("completes metadata without overwriting concurrent manual edits", async () => {
    await asUser(alice);
    const id = (
      await db.query<{ id: string }>(
        `insert into bookmarks(user_id,url,normalized_url,title,hostname,personal_note) values($1,'https://metadata.example/','https://metadata.example/','metadata.example','metadata.example','Keep my note') returning id`,
        [alice],
      )
    ).rows[0].id;
    await db.query(
      `update bookmarks set metadata_status='fetching',metadata_attempts=1,title='My manual title' where id=$1`,
      [id],
    );
    const result = (
      await db.query<{
        value: {
          title: string;
          description: string;
          personal_note: string;
          metadata_status: string;
          metadata_next_retry_at: string | null;
        };
      }>(
        `select complete_bookmark_metadata($1,$2,'https://metadata.example/',1,'Fetched title','Fetched description','https://metadata.example/icon.png','https://metadata.example/og.png') as value`,
        [id, alice],
      )
    ).rows[0].value;
    expect(result).toMatchObject({
      title: "My manual title",
      description: "Fetched description",
      personal_note: "Keep my note",
      metadata_status: "ready",
      metadata_next_retry_at: null,
    });
    await asUser(bob);
    expect(
      (
        await db.query<{ value: unknown }>(
          `select complete_bookmark_metadata($1,$2,'https://metadata.example/',1,'Stolen','','','') as value`,
          [id, alice],
        )
      ).rows[0].value,
    ).toBeNull();
  });

  it("invalidates old URL metadata and rejects stale completion", async () => {
    await asUser(alice);
    const id = (
      await db.query<{ id: string }>(
        `insert into bookmarks(user_id,url,normalized_url,title,hostname,description,metadata_status,metadata_attempts,metadata_snapshot,preview_image_url) values($1,'https://before.example/','https://before.example/','Before','before.example','Automatic description','fetching',2,'{"title":"Before","description":"Automatic description"}','https://before.example/og.png') returning id`,
        [alice],
      )
    ).rows[0].id;
    await db.query(
      `update bookmarks set url='https://after.example/',normalized_url='https://after.example/',hostname='after.example' where id=$1`,
      [id],
    );
    expect(
      (
        await db.query(
          `select title,description,preview_image_url,metadata_status,metadata_attempts from bookmarks where id=$1`,
          [id],
        )
      ).rows[0],
    ).toEqual({
      title: "after.example",
      description: "",
      preview_image_url: null,
      metadata_status: "pending",
      metadata_attempts: 0,
    });
    expect(
      (
        await db.query<{ value: unknown }>(
          `select complete_bookmark_metadata($1,$2,'https://before.example/',2,'Stale','Stale','','') as value`,
          [id, alice],
        )
      ).rows[0].value,
    ).toBeNull();
    expect(
      (
        await db.query<{ count: number }>(
          `update bookmarks set metadata_status='fetching',metadata_attempts=1 where id=$1 and metadata_attempts=0 returning id`,
          [id],
        )
      ).rows,
    ).toHaveLength(1);
    expect(
      (
        await db.query(
          `update bookmarks set metadata_attempts=1 where id=$1 and metadata_attempts=0 returning id`,
          [id],
        )
      ).rows,
    ).toHaveLength(0);
  });

  it("keeps screenshot storage private and denies access after bookmark deletion", async () => {
    await asUser(alice);
    const id = (
      await db.query<{ id: string }>(
        `insert into bookmarks(user_id,url,normalized_url,title,hostname) values($1,'https://capture.example/','https://capture.example/','Capture','capture.example') returning id`,
        [alice],
      )
    ).rows[0].id;
    const path = `${alice}/${id}/hash.jpg`;
    await db.query(
      `insert into storage.objects(bucket_id,name) values('website-previews',$1)`,
      [path],
    );
    await asUser(bob);
    expect((await db.query(`select * from storage.objects`)).rows).toHaveLength(
      0,
    );
    await expect(
      db.query(
        `insert into storage.objects(bucket_id,name) values('website-previews',$1)`,
        [path],
      ),
    ).rejects.toThrow();
    await asUser(alice);
    expect((await db.query(`select * from storage.objects`)).rows).toHaveLength(
      1,
    );
    await db.query(`delete from bookmarks where id=$1`, [id]);
    expect((await db.query(`select * from storage.objects`)).rows).toHaveLength(
      0,
    );
  });
  it("isolates agent credentials and preferences and allows immediate revocation", async () => {
    await db.exec("reset role;");
    const grants = await db.query<{
      tokens: boolean;
      taste: boolean;
      search: boolean;
    }>(`select
      has_table_privilege('anon','public.mcp_tokens','select') as tokens,
      has_table_privilege('anon','public.taste_profiles','select') as taste,
      has_function_privilege('anon','public.search_library_references(uuid,text,uuid,text[],boolean,boolean,integer,integer)','execute') as search`);
    expect(grants.rows[0]).toEqual({
      tokens: false,
      taste: false,
      search: false,
    });
    await asUser(alice);
    const token = (
      await db.query<{ id: string }>(
        `insert into mcp_tokens(user_id,name,token_hash) values($1,'Work agent',$2) returning id`,
        [alice, "b".repeat(64)],
      )
    ).rows[0].id;
    await db.query(
      `insert into taste_profiles(user_id,preferences) values($1,'Compact dashboards')`,
      [alice],
    );
    await asUser(bob);
    expect((await db.query("select * from mcp_tokens")).rows).toHaveLength(0);
    expect((await db.query("select * from taste_profiles")).rows).toHaveLength(
      0,
    );
    await expect(
      db.query(`insert into taste_profiles(user_id) values($1)`, [alice]),
    ).rejects.toThrow();
    await db.query(`delete from mcp_tokens where id=$1`, [token]);
    await asUser(alice);
    expect((await db.query("select * from mcp_tokens")).rows).toHaveLength(1);
    await expect(
      db.query(`update taste_profiles set user_id=$1`, [bob]),
    ).rejects.toThrow();
    await expect(
      db.query(`update taste_profiles set preferences=repeat('x',5001)`),
    ).rejects.toThrow();
    await db.exec("reset role;set role service_role;");
    expect((await db.query("select * from mcp_tokens")).rows).toHaveLength(1);
    await expect(db.query("delete from mcp_tokens")).rejects.toThrow();
    await expect(
      db.query("update taste_profiles set preferences='changed by agent'"),
    ).rejects.toThrow();
    await asUser(alice);
    await db.query("delete from mcp_tokens where id=$1", [token]);
    expect((await db.query("select * from mcp_tokens")).rows).toHaveLength(0);
  });

  it("searches the complete scoped library with ranking, tags, descendants and pagination", async () => {
    await asUser(alice);
    const parent = (
      await db.query<{ id: string }>(
        `insert into collections(user_id,name) values($1,'MCP project') returning id`,
        [alice],
      )
    ).rows[0].id;
    const child = (
      await db.query<{ id: string }>(
        `insert into collections(user_id,name,parent_id) values($1,'Components',$2) returning id`,
        [alice, parent],
      )
    ).rows[0].id;
    for (const [slug, favorite, archived, tags] of [
      ["one", false, false, ["compact"]],
      ["two", true, false, ["compact"]],
      ["three", false, true, ["motion"]],
    ] as const) {
      await db.query(
        `insert into bookmarks(user_id,collection_id,url,normalized_url,title,hostname,tags,is_favorite,is_archived) values($1,$2,$3,$3,'Dashboard sidebar','example.com',$4,$5,$6)`,
        [
          alice,
          child,
          `https://example.com/${slug}`,
          [...tags],
          favorite,
          archived,
        ],
      );
    }
    const search = (
      owner: string,
      query = "dashboard",
      collection: string | null = parent,
      tags: string[] = [],
      favorites = false,
      archived = false,
      limit = 21,
      offset = 0,
    ) =>
      db.query<{
        resource: { url: string; user_id?: string; search_document?: string };
        relevance: number;
      }>("select * from search_library_references($1,$2,$3,$4,$5,$6,$7,$8)", [
        owner,
        query,
        collection,
        tags,
        favorites,
        archived,
        limit,
        offset,
      ]);
    const results = (await search(alice)).rows;
    expect(results).toHaveLength(2);
    expect(results[0].resource.url).toBe("https://example.com/two");
    expect(results[0].relevance).toBeGreaterThan(0);
    expect(results[0].resource).not.toHaveProperty("user_id");
    expect(results[0].resource).not.toHaveProperty("search_document");
    expect(
      (await search(alice, "dashboard", parent, [], false, true)).rows,
    ).toHaveLength(3);
    expect(
      (await search(alice, "dashboard", parent, [], true)).rows,
    ).toHaveLength(1);
    expect(
      (await search(alice, "dashboard", parent, ["motion"])).rows,
    ).toHaveLength(0);
    expect(
      (await search(alice, "dashboard", parent, ["compact"])).rows,
    ).toHaveLength(2);
    expect(
      (await search(alice, "dashboard", parent, [], false, false, 1, 1)).rows[0]
        .resource.url,
    ).toBe("https://example.com/one");
    expect((await search(alice, "", parent)).rows).toHaveLength(2);
    expect(
      (await search(alice, "missing OR sidebar", parent)).rows,
    ).toHaveLength(2);
    await asUser(bob);
    expect((await search(alice)).rows).toHaveLength(0);
    expect((await search(bob)).rows).toHaveLength(0);
    await db.exec("reset role;set role service_role;");
    expect((await search(alice)).rows).toHaveLength(2);
    expect((await search(bob)).rows).toHaveLength(0);
  });
});

describe("distributed API counters", () => {
  it("restricts the counter RPC and storage to the server role", async () => {
    await asUser(alice);
    await expect(
      db.query("select consume_api_limit('alice','read',3,60)"),
    ).rejects.toThrow();
    await expect(
      db.query("select * from private.api_rate_limits"),
    ).rejects.toThrow();
    await db.exec("reset role; set role anon;");
    await expect(
      db.query("select consume_api_limit('alice','read',3,60)"),
    ).rejects.toThrow();
  });
  it("admits exactly the limit under concurrent calls and isolates accounts", async () => {
    await db.exec("reset role; set role service_role;");
    const results = await Promise.all(
      Array.from({ length: 12 }, () =>
        db.query<{ result: { allowed: boolean } }>(
          "select consume_api_limit('concurrency','read',3,86400) as result",
        ),
      ),
    );
    expect(results.filter((r) => r.rows[0].result.allowed)).toHaveLength(3);
    expect(
      (
        await db.query<{ result: { allowed: boolean } }>(
          "select consume_api_limit('other','read',3,86400) as result",
        )
      ).rows[0].result.allowed,
    ).toBe(true);
    await db.exec(
      "update private.api_rate_limits set window_start = now() - interval '2 days' where subject='concurrency';",
    );
    expect(
      (
        await db.query<{ result: { allowed: boolean } }>(
          "select consume_api_limit('concurrency','read',3,86400) as result",
        )
      ).rows[0].result.allowed,
    ).toBe(true);
  });
});
