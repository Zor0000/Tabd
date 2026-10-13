import { beforeEach, describe, expect, it, vi } from "vitest";
import { chromium, type Route } from "playwright";
import { publicFetch } from "../lib/public-fetch";
import { websiteCapture } from "../lib/website-capture";

vi.mock("playwright", () => ({ chromium: { launch: vi.fn() } }));
vi.mock("../lib/public-fetch", () => ({ publicFetch: vi.fn() }));
const screenshot = vi.fn();
const page = { goto: vi.fn(), waitForLoadState: vi.fn(), screenshot };
const context = { route: vi.fn(), routeWebSocket: vi.fn(), newPage: vi.fn() };
const browser = { newContext: vi.fn(), close: vi.fn() };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(chromium.launch).mockResolvedValue(browser as never);
  browser.newContext.mockResolvedValue(context);
  context.newPage.mockResolvedValue(page);
  screenshot.mockResolvedValue(Buffer.from("jpeg"));
  page.goto.mockReset();
  page.waitForLoadState.mockResolvedValue(undefined);
  vi.mocked(publicFetch).mockImplementation(async (raw) => ({
    url: new URL(raw),
    status: 200,
    headers: { "content-type": "text/html" },
    body: Buffer.from("<h1>Website</h1>"),
  }));
});

describe("landing-page capture lifecycle", () => {
  it("deduplicates concurrent requests, caches successes, and closes the isolated browser", async () => {
    const [first, second] = await Promise.all([
      websiteCapture("https://example.com/dedupe"),
      websiteCapture("https://example.com/dedupe"),
    ]);
    expect(first).toEqual(second);
    await websiteCapture("https://example.com/dedupe");
    expect(chromium.launch).toHaveBeenCalledTimes(1);
    expect(browser.close).toHaveBeenCalledTimes(1);
    expect(browser.newContext).toHaveBeenCalledWith(
      expect.objectContaining({
        serviceWorkers: "block",
        acceptDownloads: false,
      }),
    );
    expect(chromium.launch).toHaveBeenCalledWith(
      expect.objectContaining({
        args: expect.arrayContaining([
          "--proxy-server=http://127.0.0.1:9",
          "--proxy-bypass-list=<-loopback>",
        ]),
      }),
    );
  });

  it("cleans up a failed capture and permits a later retry", async () => {
    screenshot.mockRejectedValueOnce(new Error("Capture failed"));
    await expect(websiteCapture("https://example.com/retry")).rejects.toThrow(
      "Capture failed",
    );
    expect(browser.close).toHaveBeenCalledTimes(1);
    await expect(websiteCapture("https://example.com/retry")).resolves.toEqual(
      Buffer.from("jpeg"),
    );
    expect(chromium.launch).toHaveBeenCalledTimes(2);
  });

  it("rejects blocked documents before starting Chromium", async () => {
    vi.mocked(publicFetch).mockRejectedValue(new Error("Private address"));
    await expect(websiteCapture("http://127.0.0.1/")).rejects.toThrow(
      "Private address",
    );
    expect(chromium.launch).not.toHaveBeenCalled();
  });

  it("loads assets through the public-address guard and blocks POST requests", async () => {
    const asset = {
      request: () => ({
        url: () => "https://cdn.example.com/image.png",
        method: () => "GET",
        resourceType: () => "image",
        isNavigationRequest: () => false,
      }),
      fulfill: vi.fn().mockResolvedValue(undefined),
      abort: vi.fn().mockResolvedValue(undefined),
    };
    page.goto.mockImplementationOnce(async () => {
      const handler = context.route.mock.calls[0][1] as (
        route: Route,
      ) => Promise<void>;
      await handler(asset as unknown as Route);
      expect(publicFetch).toHaveBeenCalledWith(
        "https://cdn.example.com/image.png",
        expect.objectContaining({ followRedirects: false }),
      );
      expect(asset.fulfill).toHaveBeenCalled();
      vi.mocked(publicFetch).mockRejectedValue(new Error("Private address"));
      await handler(asset as unknown as Route);
      expect(asset.abort).toHaveBeenCalledTimes(1);
      const calls = vi.mocked(publicFetch).mock.calls.length;
      await handler({
        ...asset,
        request: () => ({ method: () => "POST", resourceType: () => "fetch" }),
      } as unknown as Route);
      expect(vi.mocked(publicFetch).mock.calls).toHaveLength(calls);
      expect(asset.abort).toHaveBeenCalledTimes(2);
    });
    await websiteCapture("https://example.com/assets");
  });
});
