import { chromium, expect } from "@playwright/test";
import { createServer } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import assert from "node:assert/strict";

const token = "tabd_" + "a".repeat(64);
const rejectedToken = "tabd_" + "b".repeat(64);
const calls = [];
let fail = false;
async function server() {
  const instance = createServer(async (req, res) => {
    if (fail && req.url === "/api/collections") {
      req.socket.destroy();
      return;
    }
    if (req.url?.startsWith("/connect")) {
      res.setHeader("Content-Type", "text/html");
      res.end(
        "<!doctype html><title>Tabd link test</title><h1>Tabd link test</h1>",
      );
      return;
    }
    res.setHeader("Content-Type", "application/json");
    if (req.url === "/api/extension/status") {
      res.end(JSON.stringify({ app: "tabd", extensionLinkVersion: 1 }));
      return;
    }
    calls.push({
      port: instance.address().port,
      path: req.url,
      method: req.method,
    });
    if (req.headers.authorization !== `Bearer ${token}`) {
      res.statusCode = 401;
      res.end(JSON.stringify({ error: "Account link rejected." }));
      return;
    }
    if (req.url === "/api/collections") {
      res.end("[]");
      return;
    }
    if (req.url === "/api/resources" && req.method === "POST") {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      calls.at(-1).body = JSON.parse(Buffer.concat(chunks).toString());
      res.statusCode = 201;
      res.end(JSON.stringify({ id: "saved" }));
      return;
    }
    res.statusCode = 404;
    res.end("{}");
  });
  await new Promise((resolve) => instance.listen(0, "127.0.0.1", resolve));
  return {
    instance,
    origin: `http://localhost:${instance.address().port}`,
    close: () =>
      new Promise((resolve) => {
        instance.close(resolve);
        instance.closeAllConnections();
      }),
  };
}
const first = await server();
const second = await server();
let firstClosed = false;
const profile = await mkdtemp(path.join(tmpdir(), "tabd-link-test-"));
let context;
try {
  const extension = path.resolve("extension/.output/chrome-mv3");
  context = await chromium.launchPersistentContext(profile, {
    channel: "chromium",
    headless: true,
    args: [
      `--disable-extensions-except=${extension}`,
      `--load-extension=${extension}`,
    ],
  });
  let worker =
    context.serviceWorkers()[0] ||
    (await context.waitForEvent("serviceworker"));
  const id = new URL(worker.url()).host;
  const page = await context.newPage();
  await page.goto(first.origin + "/connect");
  async function message(payload) {
    return page.evaluate(
      ({ id, payload }) =>
        new Promise((resolve, reject) => {
          const timer = setTimeout(
            () => reject(new Error("Extension reply timed out")),
            15000,
          );
          if (!window.chrome?.runtime?.sendMessage) {
            clearTimeout(timer);
            reject(new Error("External messaging is missing"));
            return;
          }
          chrome.runtime.sendMessage(id, payload, (reply) => {
            clearTimeout(timer);
            const error = chrome.runtime.lastError;
            if (error) reject(new Error(error.message));
            else resolve(reply);
          });
        }),
      { id, payload },
    );
  }
  assert.deepEqual(await message({ type: "TABD_PING" }), {
    ok: true,
    extensionLinkVersion: 1,
  });
  const before = calls.length;
  assert.equal(
    (await message({ type: "TABD_LINK", token: "invalid" })).ok,
    false,
  );
  assert.equal(calls.length, before);
  assert.equal((await message({ type: "TABD_LINK", token })).ok, true);
  let stored = await worker.evaluate(() =>
    chrome.storage.local.get(["tabdToken", "tabdAppUrl"]),
  );
  assert.equal(stored.tabdToken, token);
  assert.equal(stored.tabdAppUrl, first.origin);
  assert.equal(
    (await message({ type: "TABD_LINK", token: rejectedToken })).error,
    "Account link rejected.",
  );
  stored = await worker.evaluate(() => chrome.storage.local.get("tabdToken"));
  assert.equal(stored.tabdToken, token);
  fail = true;
  assert.match(
    (await message({ type: "TABD_LINK", token })).error,
    /couldn’t reach your Tabd server/,
  );
  fail = false;
  // Move the server to a new nonstandard port. No rebuild or manual env change.
  await page.goto(second.origin + "/connect");
  await first.close();
  firstClosed = true;
  const popup = await context.newPage();
  await popup.addInitScript(() => {
    const original = chrome.tabs.query.bind(chrome.tabs);
    chrome.tabs.query = async (options) =>
      options.active
        ? [{ url: "https://example.com/a-useful-page", title: "A useful page" }]
        : original(options);
  });
  await popup.goto(`chrome-extension://${id}/popup.html`);
  await expect(
    popup.getByRole("button", { name: "Save page", exact: true }),
  ).toBeVisible();
  stored = await worker.evaluate(() => chrome.storage.local.get("tabdAppUrl"));
  assert.equal(stored.tabdAppUrl, second.origin);
  await popup.getByRole("button", { name: "Save page", exact: true }).click();
  await expect(
    popup.getByRole("heading", { name: "A good find, kept." }),
  ).toBeVisible();
  assert.equal(calls.at(-1).port, second.instance.address().port);
  assert.equal(calls.at(-1).body.url, "https://example.com/a-useful-page");
  assert.equal((await message({ type: "TABD_LINK", token })).ok, true);
  // A page outside the manifest's origins cannot access this extension's messaging API.
  const foreign = await context.newPage();
  await foreign.route("https://untrusted.example/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<h1>Untrusted page</h1>",
    }),
  );
  await foreign.goto("https://untrusted.example/connect");
  assert.equal(
    await foreign.evaluate(() => Boolean(window.chrome?.runtime?.sendMessage)),
    false,
  );
  console.log(
    "Extension link tests passed: real external messaging, ping, verified token storage, rejection without overwriting credentials, server failure, discovery after a port change, save to the discovered server, and untrusted-site isolation.",
  );
} finally {
  await context?.close();
  if (!firstClosed) await first.close();
  await second.close();
  await rm(profile, { recursive: true, force: true });
}
