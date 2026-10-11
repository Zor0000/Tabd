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
    `create schema auth;create role authenticated;create role service_role bypassrls;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth,public to authenticated,service_role;grant execute on function auth.uid() to authenticated,service_role;insert into auth.users values('${alice}'),('${bob}');`,
  );
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
});
