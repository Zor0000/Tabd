import { chromium, expect } from "@playwright/test";
import { mkdtemp, rm, readFile, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import assert from "node:assert/strict";

const extension = path.resolve("extension/.output/chrome-mv3");
const manifest = JSON.parse(
  await readFile(path.join(extension, "manifest.json"), "utf8"),
);
const origin = "https://www.tab-dd.tech";
assert.deepEqual(manifest.externally_connectable.matches, [`${origin}/*`]);
assert.deepEqual(manifest.host_permissions, [`${origin}/*`]);
assert.equal(manifest.version, "0.1.1");
const profile = await mkdtemp(
  path.join(tmpdir(), "tabd-production-extension-"),
);
let context;
try {
  context = await chromium.launchPersistentContext(profile, {
    channel: "chromium",
    headless: true,
    viewport: null,
    args: [
      `--disable-extensions-except=${extension}`,
      `--load-extension=${extension}`,
    ],
  });
  const worker =
    context.serviceWorkers()[0] ||
    (await context.waitForEvent("serviceworker"));
  const id = new URL(worker.url()).host;
  const page = await context.newPage();
  // The website is a fixture; the browser, manifest, worker, and external message are real.
  await page.route(`${origin}/**`, (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<h1>Production link fixture</h1>",
    }),
  );
  await page.goto(`${origin}/connect?extension=${id}`);
  const reply = await page.evaluate(
    (id) =>
      new Promise((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error("Production extension did not reply")),
          5000,
        );
        if (!window.chrome?.runtime?.sendMessage) {
          clearTimeout(timer);
          reject(
            new Error(
              "Production origin is missing external messaging permission",
            ),
          );
          return;
        }
        chrome.runtime.sendMessage(id, { type: "TABD_PING" }, (reply) => {
          clearTimeout(timer);
          const error = chrome.runtime.lastError;
          if (error) reject(new Error(error.message));
          else resolve(reply);
        });
      }),
    id,
  );
  assert.deepEqual(reply, { ok: true, extensionLinkVersion: 1 });

  // A fixed-viewport tab hid the 137x112 regression. Open Chrome's toolbar action.
  await worker.evaluate(() => chrome.action.openPopup());
  const cdp = await context.browser().newBrowserCDPSession();
  let target;
  await expect
    .poll(async () => {
      target = (await cdp.send("Target.getTargets")).targetInfos.find(
        (t) => t.url === `chrome-extension://${id}/popup.html`,
      );
      return Boolean(target);
    })
    .toBe(true);
  const { sessionId } = await cdp.send("Target.attachToTarget", {
    targetId: target.targetId,
    flatten: false,
  });
  let nextId = 0;
  async function popupCommand(method, params = {}) {
    const requestId = ++nextId;
    let listener, timer;
    const response = new Promise((resolve, reject) => {
      timer = setTimeout(
        () => reject(new Error(`Popup command timed out: ${method}`)),
        5000,
      );
      listener = (event) => {
        if (event.sessionId !== sessionId) return;
        const message = JSON.parse(event.message);
        if (message.id === requestId) {
          if (message.error) reject(new Error(message.error.message));
          else resolve(message.result);
        }
      };
      cdp.on("Target.receivedMessageFromTarget", listener);
    });
    try {
      await cdp.send("Target.sendMessageToTarget", {
        sessionId,
        message: JSON.stringify({ id: requestId, method, params }),
      });
      return await response;
    } finally {
      clearTimeout(timer);
      cdp.off("Target.receivedMessageFromTarget", listener);
    }
  }
  let dimensions;
  await expect
    .poll(async () => {
      const result = await popupCommand("Runtime.evaluate", {
        expression: `({width: innerWidth, height: innerHeight, ready: document.body.innerText.includes("Good finds belong here."), contentHeight: document.querySelector(".content")?.clientHeight, overflow: document.documentElement.scrollWidth > innerWidth})`,
        returnByValue: true,
      });
      dimensions = result.result.value;
      return (
        dimensions?.ready &&
        dimensions.width === 360 &&
        dimensions.height >= 240 &&
        dimensions.contentHeight >= 100 &&
        !dimensions.overflow
      );
    })
    .toBe(true);
  assert(dimensions.height <= 600);
  const output = path.resolve("artifacts/extension-fix");
  await mkdir(output, { recursive: true });
  const screenshot = await popupCommand("Page.captureScreenshot", {
    format: "png",
  });
  await writeFile(
    path.join(output, "toolbar-popup.png"),
    Buffer.from(screenshot.data, "base64"),
  );
  console.log(
    `Production extension passed: www origin handshake and real toolbar popup ${dimensions.width}x${dimensions.height}.`,
  );
} finally {
  await context?.close();
  await rm(profile, { recursive: true, force: true });
}
