import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { actor, body, failure, ownedCollection } from "../lib/api";
import { PATCH } from "../app/api/resources/[id]/route";
import { GET } from "../app/api/resources/route";
import { PATCH as patchCollection } from "../app/api/collections/[id]/route";

vi.mock("../lib/api", async (original) => ({
  ...(await original<typeof import("../lib/api")>()),
  actor: vi.fn(),
}));
vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("../lib/resource-metadata", () => ({
  recoverResourceMetadata: vi.fn(),
}));

const owner = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const id = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const context = { params: Promise.resolve({ id }) };
const db = {
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  order: vi.fn(),
  update: vi.fn(),
  range: vi.fn(),
  maybeSingle: vi.fn(),
  rpc: vi.fn(),
};
const database = db as unknown as Awaited<ReturnType<typeof actor>>["db"];

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  for (const method of [db.from, db.select, db.eq, db.order, db.update])
    method.mockReturnValue(db);
  db.maybeSingle.mockResolvedValue({ data: { id }, error: null });
  db.rpc.mockResolvedValue({ data: { id, open_count: 1 }, error: null });
  db.range.mockResolvedValue({ data: [], error: null });
  vi.mocked(actor).mockResolvedValue({
    db: database,
    userId: owner,
    extension: false,
  });
});
afterEach(() => vi.restoreAllMocks());

function request(value: unknown) {
  return new Request(`https://tabd.test/api/resources/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
  });
}

describe("resource and collection request boundaries", () => {
  it.each([null, [], true, 42, "text", { user_id: owner }])(
    "rejects invalid or empty updates (%j) before database access",
    async (value) => {
      expect((await PATCH(request(value), context)).status).toBe(400);
      expect((await patchCollection(request(value), context)).status).toBe(400);
      expect(db.from).not.toHaveBeenCalled();
      expect(db.rpc).not.toHaveBeenCalled();
    },
  );

  it("supports unchanged saves from older extensions without writing", async () => {
    const response = await PATCH(request({}), context);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id });
    expect(db.eq).toHaveBeenCalledWith("id", id);
    expect(db.eq).toHaveBeenCalledWith("user_id", owner);
    expect(db.update).not.toHaveBeenCalled();
    expect(db.rpc).not.toHaveBeenCalled();
    expect((await patchCollection(request({}), context)).status).toBe(400);
  });

  it("does not confirm an unchanged save when the resource is unavailable to its owner", async () => {
    db.maybeSingle.mockResolvedValue({ data: null, error: null });
    expect((await PATCH(request({}), context)).status).toBe(404);
    expect(db.update).not.toHaveBeenCalled();
  });

  it("rejects an unknown action instead of reporting a successful update", async () => {
    expect((await PATCH(request({ action: "erase" }), context)).status).toBe(
      400,
    );
    expect(db.from).not.toHaveBeenCalled();
  });

  it("records an open only for the authenticated owner", async () => {
    const response = await PATCH(request({ action: "open" }), context);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ open_count: 1 });
    expect(db.rpc).toHaveBeenCalledWith("record_open", {
      bookmark_id: id,
      owner_id: owner,
    });
    expect(db.update).not.toHaveBeenCalled();
  });

  it("preserves false and null in partial updates and strips forged ownership", async () => {
    const response = await PATCH(
      request({ is_favorite: false, collection_id: null, user_id: id }),
      context,
    );
    expect(response.status).toBe(200);
    expect(db.update).toHaveBeenCalledWith({
      is_favorite: false,
      collection_id: null,
    });
    expect(db.eq).toHaveBeenCalledWith("user_id", owner);
    expect(db.eq).toHaveBeenCalledWith("id", id);
  });

  it("keeps empty names invalid but allows clearing a collection parent", async () => {
    expect((await patchCollection(request({ name: "" }), context)).status).toBe(
      400,
    );
    expect(
      (await patchCollection(request({ parent_id: null }), context)).status,
    ).toBe(200);
    expect(db.update).toHaveBeenCalledWith({ parent_id: null });
  });

  it("uses a unique tie breaker when resources share a creation time", async () => {
    const response = await GET(
      new Request("https://tabd.test/api/resources?page=1"),
    );
    expect(response.status).toBe(200);
    expect(db.order.mock.calls).toEqual([
      ["created_at", { ascending: false }],
      ["id", { ascending: false }],
    ]);
    expect(db.range).toHaveBeenCalledWith(500, 999);
    expect(db.eq).toHaveBeenCalledWith("user_id", owner);
  });
});

describe("request body reading", () => {
  it("reports malformed JSON as a client error and releases the reader", async () => {
    const req = new Request("https://tabd.test", { method: "POST", body: "{" });
    await expect(body(req)).rejects.toMatchObject({ status: 400 });
    expect(req.body?.locked).toBe(false);
  });

  it("enforces the byte limit across chunks, cancels input and releases the reader", async () => {
    const cancel = vi.fn();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(10000));
        controller.enqueue(new Uint8Array(10001));
      },
      cancel,
    });
    await expect(body({ body: stream } as Request)).rejects.toMatchObject({
      status: 413,
    });
    expect(cancel).toHaveBeenCalledOnce();
    expect(stream.locked).toBe(false);
  });

  it("accepts JSON at the exact byte limit", async () => {
    const value = "x".repeat(19998);
    expect(await body(request(value))).toBe(value);
  });
});

describe("collection ownership errors", () => {
  it("returns not found only when the lookup succeeds without a matching row", async () => {
    db.maybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(ownedCollection(database, owner, id)).rejects.toMatchObject({
      status: 404,
    });
    expect(db.eq).toHaveBeenCalledWith("user_id", owner);
  });

  it("keeps database failures separate and hides internal details in the response", async () => {
    const error = { message: "private database details" };
    db.maybeSingle.mockResolvedValue({ data: null, error });
    await expect(ownedCollection(database, owner, id)).rejects.toBe(error);
    const response = failure(error);
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain(error.message);
  });
});
