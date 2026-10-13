import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "../app/api/resources/[id]/preview/route";
import { actor, ApiError } from "../lib/api";
import { persistedCapture } from "../lib/preview-storage";

vi.mock("../lib/api", async (original) => ({
  ...(await original<typeof import("../lib/api")>()),
  actor: vi.fn(),
}));
vi.mock("../lib/preview-storage", () => ({ persistedCapture: vi.fn() }));
const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const eq = vi.fn();
const maybeSingle = vi.fn();
const db = { from: vi.fn(), select: vi.fn(), eq, maybeSingle };
const request = new Request(
  `http://localhost:3000/api/resources/${id}/preview`,
);
const ctx = { params: Promise.resolve({ id }) };

beforeEach(() => {
  vi.clearAllMocks();
  db.from.mockReturnValue(db);
  db.select.mockReturnValue(db);
  eq.mockReturnValue(db);
  maybeSingle.mockResolvedValue({
    data: { url: "https://example.com/" },
    error: null,
  });
  vi.mocked(actor).mockResolvedValue({
    db,
    userId: "owner",
    extension: false,
  } as unknown as Awaited<ReturnType<typeof actor>>);
  vi.mocked(persistedCapture).mockResolvedValue(
    Buffer.from([0xff, 0xd8, 0xff]),
  );
});

describe("private website captures", () => {
  it("requires authentication before reading a bookmark or capturing a page", async () => {
    vi.mocked(actor).mockRejectedValue(new ApiError("Please sign in.", 401));
    expect((await GET(request, ctx)).status).toBe(401);
    expect(db.from).not.toHaveBeenCalled();
    expect(persistedCapture).not.toHaveBeenCalled();
  });

  it("scopes the bookmark lookup to the authenticated owner and returns JPEG", async () => {
    const response = await GET(request, ctx);
    expect(eq).toHaveBeenCalledWith("user_id", "owner");
    expect(eq).toHaveBeenCalledWith("id", id);
    expect(persistedCapture).toHaveBeenCalledWith(
      db,
      "owner",
      id,
      "https://example.com/",
    );
    expect(response.headers.get("content-type")).toBe("image/jpeg");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(
      new Uint8Array([0xff, 0xd8, 0xff]),
    );
  });

  it("does not capture another owner's or missing bookmark", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    expect((await GET(request, ctx)).status).toBe(404);
    expect(persistedCapture).not.toHaveBeenCalled();
  });

  it("leaves capture errors uncached so the card can fall back to metadata", async () => {
    vi.mocked(persistedCapture).mockRejectedValue(
      new Error("Website unavailable"),
    );
    const response = await GET(request, ctx);
    expect(response.status).toBe(502);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
});
