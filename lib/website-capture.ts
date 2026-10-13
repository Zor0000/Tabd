import { chromium } from "playwright";
import { normalizeUrl } from "./validation";
import { publicFetch } from "./public-fetch";

const captures = new Map<string, { image: Buffer; expires: number }>();
const pending = new Map<string, Promise<Buffer>>();
let active = 0;
const slots: Array<() => void> = [];

async function render(url: string) {
  if (active >= 2) {
    await new Promise<void>((resolve, reject) => {
      const ready = () => {
        clearTimeout(timer);
        resolve();
      };
      const timer = setTimeout(() => {
        slots.splice(slots.indexOf(ready), 1);
        reject(new Error("Preview queue timed out"));
      }, 5000);
      slots.push(ready);
    });
  } else active++;
  try {
    return await renderPage(url);
  } finally {
    const next = slots.shift();
    if (next) next();
    else active--;
  }
}

async function renderPage(url: string) {
  // Fetch the document first: refuse private URLs before launching a browser.
  const document = await publicFetch(url, {
    maxBytes: 4 * 1024 * 1024,
    signal: AbortSignal.timeout(12000),
  });
  if (
    document.status !== 200 ||
    !document.headers["content-type"]?.includes("text/html")
  )
    throw new Error("Website unavailable");
  const serverless =
    process.platform === "linux" && !process.env.TABD_CHROMIUM_PATH
      ? (await import("@sparticuz/chromium")).default
      : null;
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.TABD_CHROMIUM_PATH ||
      (serverless ? await serverless.executablePath() : undefined),
    args: [
      ...(serverless?.args || []),
      // No browser connection may bypass our DNS-pinned asset loader.
      "--proxy-server=http://127.0.0.1:9",
      "--proxy-bypass-list=<-loopback>",
      "--force-webrtc-ip-handling-policy=disable_non_proxied_udp",
    ],
    timeout: 8000,
  });
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
    void browser.close().catch(() => {});
  }, 18000);
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
      colorScheme: "light",
      serviceWorkers: "block",
      acceptDownloads: false,
    });
    await context.routeWebSocket("**/*", (socket) => socket.close());
    let requests = 0;
    let bytes = 0;
    let documentUsed = false;
    let assetRequests = 0;
    const assetSlots: Array<() => void> = [];
    const acquireAsset = async () => {
      if (assetRequests < 6) assetRequests++;
      else await new Promise<void>((resolve) => assetSlots.push(resolve));
    };
    const releaseAsset = () => {
      const next = assetSlots.shift();
      if (next) next();
      else assetRequests--;
    };
    const allowed = new Set([
      "document",
      "stylesheet",
      "script",
      "image",
      "font",
      "xhr",
      "fetch",
    ]);
    await context.route("**/*", async (route) => {
      const request = route.request();
      let acquired = false;
      try {
        if (
          ++requests > 150 ||
          controller.signal.aborted ||
          bytes > 40 * 1024 * 1024 ||
          request.method() !== "GET" ||
          !allowed.has(request.resourceType())
        )
          return await route.abort();
        await acquireAsset();
        acquired = true;
        if (controller.signal.aborted) return await route.abort();
        const isInitialDocument =
          !documentUsed &&
          request.url() === document.url.toString() &&
          request.isNavigationRequest();
        if (isInitialDocument) documentUsed = true;
        const response = isInitialDocument
          ? document
          : await publicFetch(request.url(), {
              followRedirects: false,
              signal: controller.signal,
              userAgent: "TabdPreview/1.0",
            });
        bytes += response.body.length;
        if (bytes > 40 * 1024 * 1024) return await route.abort();
        await route.fulfill({
          status: response.status,
          headers: {
            "content-type":
              response.headers["content-type"] || "application/octet-stream",
            ...(response.headers.location
              ? { location: response.headers.location }
              : {}),
            "access-control-allow-origin": "*",
          },
          body: response.body,
        });
      } catch {
        await route.abort().catch(() => {});
      } finally {
        if (acquired) releaseAsset();
      }
    });
    const page = await context.newPage();
    await page.goto(document.url.toString(), {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });
    // Wait for initial fonts/images without letting analytics hold the capture open.
    await page
      .waitForLoadState("networkidle", { timeout: 4000 })
      .catch(() => {});
    return await page.screenshot({
      type: "jpeg",
      quality: 75,
      animations: "disabled",
      timeout: 5000,
    });
  } finally {
    clearTimeout(timer);
    controller.abort();
    await browser.close();
  }
}

export async function websiteCapture(raw: string): Promise<Buffer> {
  const url = normalizeUrl(raw);
  const cached = captures.get(url);
  if (cached && cached.expires > Date.now()) {
    captures.delete(url);
    captures.set(url, cached);
    return cached.image;
  }
  const running = pending.get(url);
  if (running) return running;
  if (pending.size >= 20) throw new Error("Preview queue is busy");
  const promise = render(url)
    .then((image) => {
      if (captures.size >= 32) captures.delete(captures.keys().next().value!);
      captures.set(url, { image, expires: Date.now() + 60 * 60 * 1000 });
      return image;
    })
    .finally(() => pending.delete(url));
  pending.set(url, promise);
  return promise;
}
