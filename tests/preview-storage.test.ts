import { beforeEach, describe, expect, it, vi } from "vitest";
import { persistedCapture, previewObjectPath } from "../lib/preview-storage";
import { websiteCapture } from "../lib/website-capture";
import type { actor } from "../lib/api";
vi.mock("../lib/website-capture", () => ({ websiteCapture: vi.fn() }));
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0x00]);
const bucket = { download: vi.fn(), upload: vi.fn() };
const db = { storage: { from: vi.fn(() => bucket) } };
const database = db as unknown as Awaited<ReturnType<typeof actor>>["db"];
beforeEach(() => {
  vi.clearAllMocks();
  bucket.download.mockResolvedValue({ data: null, error: null });
  bucket.upload.mockResolvedValue({ error: null });
  vi.mocked(websiteCapture).mockResolvedValue(jpeg);
});
describe("durable private preview storage", () => {
  it("uses stored JPEGs without launching a browser after a server restart", async () => {
    bucket.download.mockResolvedValue({ data: new Blob([jpeg]), error: null });
    expect(
      await persistedCapture(database, "owner", "id", "https://example.com/"),
    ).toEqual(jpeg);
    expect(websiteCapture).not.toHaveBeenCalled();
  });
  it("generates and saves a missing capture under the owner's bookmark", async () => {
    await persistedCapture(database, "owner", "id", "https://example.com/");
    expect(bucket.upload).toHaveBeenCalledWith(
      previewObjectPath("owner", "id", "https://example.com/"),
      jpeg,
      expect.objectContaining({ contentType: "image/jpeg" }),
    );
  });
  it("serves generated previews even when storage fails", async () => {
    bucket.download.mockRejectedValue(new Error("Storage unavailable"));
    bucket.upload.mockRejectedValue(new Error("Storage unavailable"));
    expect(
      await persistedCapture(database, "owner", "id", "https://example.com/"),
    ).toEqual(jpeg);
  });
  it("isolates owners and invalidates screenshots on meaningful URL changes", () => {
    const original = previewObjectPath(
      "alice",
      "id",
      "https://example.com/a?q=1",
    );
    expect(
      previewObjectPath("bob", "id", "https://example.com/a?q=1"),
    ).not.toBe(original);
    expect(
      previewObjectPath("alice", "id", "https://example.com/a?q=2"),
    ).not.toBe(original);
    expect(
      previewObjectPath(
        "alice",
        "id",
        "https://example.com/a?q=1&utm_source=x#section",
      ),
    ).toBe(original);
  });
});
