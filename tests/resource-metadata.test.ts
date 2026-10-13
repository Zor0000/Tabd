import { beforeEach, describe, expect, it, vi } from "vitest";
import { metadata } from "../lib/metadata";
import { PublicFetchError } from "../lib/public-fetch";
import {
  nextMetadataRetry,
  recoverResourceMetadata,
} from "../lib/resource-metadata";
import type { actor } from "../lib/api";
vi.mock("../lib/metadata", () => ({ metadata: vi.fn() }));
const record = {
  id: "bookmark",
  url: "https://example.com/",
  title: "My title",
  description: "Keep this",
  metadata_status: "pending",
  metadata_attempts: 0,
  metadata_next_retry_at: new Date(0).toISOString(),
};
const db = {
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  lte: vi.fn(),
  update: vi.fn(),
  maybeSingle: vi.fn(),
  rpc: vi.fn(),
};
const database = db as unknown as Awaited<ReturnType<typeof actor>>["db"];
beforeEach(() => {
  vi.clearAllMocks();
  for (const method of [db.from, db.select, db.eq, db.lte, db.update])
    method.mockReturnValue(db);
  db.maybeSingle.mockResolvedValue({ data: record, error: null });
  db.rpc.mockResolvedValue({
    data: { ...record, metadata_status: "ready" },
    error: null,
  });
  vi.mocked(metadata).mockResolvedValue({
    title: "Fetched",
    description: "Fetched description",
    favicon_url: null,
    preview_image_url: null,
  });
});
describe("durable metadata recovery", () => {
  it("persists fetched metadata with owner, URL, and attempt guards", async () => {
    await recoverResourceMetadata(database, "owner", "bookmark");
    expect(db.eq).toHaveBeenCalledWith("user_id", "owner");
    expect(db.eq).toHaveBeenCalledWith("metadata_attempts", 0);
    expect(db.rpc).toHaveBeenCalledWith(
      "complete_bookmark_metadata",
      expect.objectContaining({
        owner_id: "owner",
        expected_url: record.url,
        expected_attempt: 1,
        fetched_title: "Fetched",
      }),
    );
  });
  it("keeps successful metadata indefinitely without rescheduling a fetch", async () => {
    db.maybeSingle.mockResolvedValue({
      data: {
        ...record,
        metadata_status: "ready",
        metadata_next_retry_at: null,
      },
      error: null,
    });
    await recoverResourceMetadata(database, "owner", "bookmark");
    expect(metadata).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });
  it("defers retries during a persisted cooldown", async () => {
    db.maybeSingle.mockResolvedValue({
      data: {
        ...record,
        metadata_status: "retry",
        metadata_next_retry_at: new Date(Date.now() + 60000).toISOString(),
      },
      error: null,
    });
    await recoverResourceMetadata(database, "owner", "bookmark");
    expect(metadata).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });
  it("does not fetch when another process wins the lease", async () => {
    db.maybeSingle
      .mockResolvedValueOnce({ data: record, error: null })
      .mockResolvedValueOnce({ data: null, error: null });
    await recoverResourceMetadata(database, "owner", "bookmark");
    expect(metadata).not.toHaveBeenCalled();
  });
  it("persists a bounded retry schedule without clearing last good metadata", async () => {
    vi.mocked(metadata).mockRejectedValue(
      new PublicFetchError("Unavailable", "http", 429, 300000),
    );
    await recoverResourceMetadata(database, "owner", "bookmark");
    const values = db.update.mock.calls[1][0];
    expect(values.metadata_status).toBe("retry");
    expect(
      Date.parse(values.metadata_next_retry_at) - Date.now(),
    ).toBeGreaterThan(299000);
    expect(values).not.toHaveProperty("title");
    expect(values).not.toHaveProperty("preview_image_url");
  });
  it("does not continually retry unsafe hosts", async () => {
    vi.mocked(metadata).mockRejectedValue(
      new PublicFetchError("Private address", "unsafe"),
    );
    await recoverResourceMetadata(database, "owner", "bookmark");
    expect(db.update.mock.calls[1][0]).toMatchObject({
      metadata_status: "blocked",
      metadata_next_retry_at: null,
    });
  });
  it("keeps repeated failures retryable once a day rather than giving up forever", () => {
    expect(nextMetadataRetry(100, 0, 0)).toBe(new Date(86400000).toISOString());
    expect(nextMetadataRetry(1, Infinity, 0)).toBe(
      new Date(86400000).toISOString(),
    );
  });
});
