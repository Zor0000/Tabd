import { chromium, expect } from "@playwright/test";
import { mkdtemp, rm, readFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import assert from "node:assert/strict";

const extension = path.resolve("extension/.output-test/chrome-mv3");
const manifest = JSON.parse(
  await readFile(path.join(extension, "manifest.json"), "utf8"),
);
assert.equal(manifest.manifest_version, 3);
assert.deepEqual(manifest.permissions.sort(), ["activeTab", "storage"]);
const appUrl = "http://localhost:38491";
assert.ok(manifest.host_permissions.includes("http://localhost/*"));
const profile = await mkdtemp(path.join(tmpdir(), "tabd-extension-test-"));
const screenshots = process.env.TABD_EXTENSION_SCREENSHOTS;
if (screenshots) await mkdir(screenshots, { recursive: true });
const collections = [
  { id: "design", name: "Design", parent_id: null },
  { id: "tools", name: "Tools", parent_id: "design" },
];
const existing = {
  id: "saved-page",
  title: "My saved title",
  collection_id: "tools",
  status: "Reference",
  tags: ["research", "inspiration"],
  personal_note: "Keep this note.",
};
let context;
let requests = [];
let mode = "success";
let failCollections = false;
let slowSave = false;
let releaseSave;
const errors = [];
try {
  context = await chromium.launchPersistentContext(profile, {
    channel: "chromium",
    headless: true,
    args: [
      `--disable-extensions-except=${extension}`,
      `--load-extension=${extension}`,
    ],
    viewport: { width: 360, height: 600 },
    colorScheme: "light",
  });
  const worker =
    context.serviceWorkers()[0] ||
    (await context.waitForEvent("serviceworker"));
  const id = new URL(worker.url()).host;
  await context.route(`${appUrl}/api/**`, async (route) => {
    const request = route.request();
    if (request.url().endsWith("/extension/status")) {
      await route.fulfill({ json: { app: "tabd", extensionLinkVersion: 1 } });
      return;
    }
    if (request.url().endsWith("/collections")) {
      await route.fulfill({
        status: failCollections ? 503 : mode === "expired-load" ? 401 : 200,
        json: collections,
      });
      return;
    }
    requests.push({ method: request.method(), body: request.postDataJSON() });
    if (slowSave)
      await new Promise((resolve) => {
        releaseSave = resolve;
      });
    if (mode === "offline") return route.abort("internetdisconnected");
    if (mode === "expired-save")
      return route.fulfill({ status: 401, json: { error: "Unauthorized" } });
    if (mode === "duplicate" && request.method() === "POST") {
      return route.fulfill({
        status: 409,
        json: { error: "Already saved", existing },
      });
    }
    await route.fulfill({ status: 200, json: { id: "saved-page" } });
  });
  async function open({
    connected = true,
    url = "https://example.com/design",
    title = "A small collection of useful things",
    remembered = "",
    theme = "light",
  } = {}) {
    await worker.evaluate(
      async ({ connected, remembered }) => {
        await chrome.storage.local.clear();
        await chrome.storage.local.set({
          tabdAppUrl: "http://localhost:38491",
        });
        if (connected)
          await chrome.storage.local.set({
            tabdToken: "test-token",
            tabdCollection: remembered,
          });
      },
      { connected, remembered },
    );
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    // Supply tab metadata and capture account navigation without requiring a web server.
    // Storage, worker and popup still run in Chrome.
    await page.addInitScript(
      ({ url, title }) => {
        chrome.tabs.query = async () => [{ url, title }];
        const createTab = chrome.tabs.create.bind(chrome.tabs);
        chrome.tabs.create = async (options) => {
          await chrome.storage.session.set({ testConnectUrl: options.url });
          return createTab({ ...options, url: "about:blank" });
        };
      },
      { url, title },
    );
    await page.goto(`chrome-extension://${id}/popup.html`);
    await expect(
      page.getByRole("status", { name: "Loading your library" }),
    ).toHaveCount(0);
    return page;
  }
  async function capture(page, name) {
    if (!screenshots) return;
    const bounds = await page.locator("main").boundingBox();
    await page.screenshot({
      path: path.join(screenshots, `${name}.png`),
      clip: bounds,
    });
  }
  async function noOverflow(page) {
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= 360),
      true,
    );
    assert.ok((await page.locator("main").boundingBox()).height <= 600);
  }

  let page = await open({ connected: false });
  await expect(
    page.getByRole("heading", { name: "Good finds belong here." }),
  ).toBeVisible();
  await capture(page, "connect");
  const connectedPage = context.waitForEvent("page");
  await page.getByRole("button", { name: "Connect to Tabd" }).click();
  const accountPage = await connectedPage;
  assert.equal(
    await worker.evaluate(
      async () =>
        (await chrome.storage.session.get("testConnectUrl")).testConnectUrl,
    ),
    `${appUrl}/connect?extension=${id}`,
  );
  await accountPage.close();

  page = await open();
  await expect(page.getByLabel("Save to", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Title", { exact: true })).toBeHidden();
  await noOverflow(page);
  await capture(page, "save-light");
  await page.getByLabel("Save to", { exact: true }).selectOption("tools");
  await page.getByRole("button", { name: "Add details" }).click();
  await expect(
    page.getByRole("button", { name: "Hide details" }),
  ).toHaveAttribute("aria-expanded", "true");
  await page.getByLabel("Tags", { exact: true }).fill("design, tools, design");
  await page.getByLabel("Personal note").fill("Useful for the next project.");
  await noOverflow(page);
  await capture(page, "details");
  slowSave = true;
  await page.getByRole("button", { name: "Save page", exact: true }).click();
  await expect(page.getByRole("button", { name: "Saving…" })).toBeDisabled();
  await expect(page.getByLabel("Save to", { exact: true })).toBeDisabled();
  await expect.poll(() => Boolean(releaseSave)).toBe(true);
  releaseSave();
  slowSave = false;
  await expect(
    page.getByRole("heading", { name: "A good find, kept." }),
  ).toBeFocused();
  assert.deepEqual(requests.at(-1).body.tags, ["design", "tools"]);
  assert.equal(
    requests.at(-1).body.personal_note,
    "Useful for the next project.",
  );
  assert.equal(requests.at(-1).body.collection_id, "tools");
  await expect(page.getByText("Saved to Design / Tools")).toBeVisible();
  await capture(page, "saved");
  await expect
    .poll(() =>
      worker.evaluate(
        async () =>
          (await chrome.storage.local.get("tabdCollection")).tabdCollection,
      ),
    )
    .toBe("tools");
  await page.close();

  page = await open({ remembered: "tools", theme: "dark" });
  await expect(page.getByLabel("Save to", { exact: true })).toHaveValue(
    "tools",
  );
  await capture(page, "save-dark");
  await page.close();

  mode = "duplicate";
  page = await open();
  await page.getByRole("button", { name: "Save page", exact: true }).click();
  await expect(
    page.getByText("Already in your library.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add details" }).click();
  await expect(page.getByLabel("Personal note")).toHaveValue(
    existing.personal_note,
  );
  await expect(page.getByLabel("Tags", { exact: true })).toHaveValue(
    "research, inspiration",
  );
  await expect(page.getByLabel("Status", { exact: true })).toHaveValue(
    "Reference",
  );
  await page.getByLabel("Title", { exact: true }).fill("An updated title");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Changes saved." }),
  ).toBeVisible();
  assert.equal(requests.at(-1).method, "PATCH");
  assert.deepEqual(requests.at(-1).body, { title: "An updated title" });
  await page.close();

  // An intentional edit made before duplicate detection must survive the response.
  page = await open();
  await page.getByRole("button", { name: "Add details" }).click();
  await page.getByLabel("Personal note").fill("A new note");
  await page.getByRole("button", { name: "Save page", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Save changes", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Personal note")).toHaveValue("A new note");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Changes saved." }),
  ).toBeVisible();
  assert.deepEqual(requests.at(-1).body, { personal_note: "A new note" });
  await page.close();

  mode = "success";
  failCollections = true;
  page = await open();
  await expect(page.getByRole("alert")).toContainText(
    "Couldn’t load your library",
  );
  await capture(page, "connection-error");
  failCollections = false;
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(
    page.getByRole("button", { name: "Save page", exact: true }),
  ).toBeVisible();
  mode = "offline";
  await page.getByRole("button", { name: "Save page", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Couldn’t confirm the save",
  );
  mode = "success";
  await page.getByRole("button", { name: "Save page", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "A good find, kept." }),
  ).toBeVisible();
  await page.close();

  for (const expiry of ["expired-load", "expired-save"]) {
    mode = expiry;
    page = await open();
    if (expiry === "expired-save")
      await page
        .getByRole("button", { name: "Save page", exact: true })
        .click();
    await expect(
      page.getByRole("button", { name: "Connect to Tabd" }),
    ).toBeVisible();
    await expect(page.getByRole("alert")).toContainText(
      "connection has expired",
    );
    assert.equal(
      await worker.evaluate(
        async () => (await chrome.storage.local.get("tabdToken")).tabdToken,
      ),
      undefined,
    );
    await page.close();
  }

  mode = "success";
  page = await open({ url: "chrome://extensions" });
  await expect(
    page.getByRole("heading", { name: "This page can’t be saved." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Save page", exact: true }),
  ).toHaveCount(0);
  await capture(page, "restricted-page");
  await page.close();

  page = await open({
    title: "LongTitle".repeat(60),
    remembered: "deleted-collection",
  });
  await expect(page.getByLabel("Save to", { exact: true })).toHaveValue("");
  await noOverflow(page);
  await page.getByRole("button", { name: "Add details" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Title", { exact: true })).toBeVisible();
  await page.getByLabel("Tags", { exact: true }).fill("a".repeat(41));
  const count = requests.length;
  await page.getByRole("button", { name: "Save page", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("40 characters");
  assert.equal(requests.length, count);
  await page.getByRole("button", { name: "Disconnect", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Connect to Tabd" }),
  ).toBeVisible();
  await page.close();

  assert.deepEqual(errors, []);
  // Use Chrome's actual extension runtime at narrow and short touch viewports.
  for (const viewport of [
    { width: 320, height: 480 },
    { width: 360, height: 300 },
  ]) {
    page = await open();
    await page.setViewportSize(viewport);
    const touch = await context.newCDPSession(page);
    await touch.send("Emulation.setTouchEmulationEnabled", {
      enabled: true,
      maxTouchPoints: 1,
    });
    async function tap(control) {
      await control.scrollIntoViewIfNeeded();
      const bounds = await control.boundingBox();
      await touch.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [
          { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 },
        ],
      });
      await touch.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
    }
    await tap(page.getByRole("button", { name: "Add details" }));
    await expect(
      page.getByRole("button", { name: "Hide details" }),
    ).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByLabel("Personal note")).toBeAttached();
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    assert.ok(
      (await page.locator("main").boundingBox()).height <= viewport.height,
    );
    assert.equal(
      await page.evaluate(() => matchMedia("(pointer: coarse)").matches),
      true,
    );
    assert.ok(
      await page
        .getByLabel("Title", { exact: true })
        .evaluate((node) => parseFloat(getComputedStyle(node).fontSize) >= 16),
    );
    await page
      .getByLabel("Personal note")
      .fill("A useful find from a small window.");
    await expect(
      page.getByRole("button", { name: "Save page", exact: true }),
    ).toBeInViewport();
    await capture(page, `touch-${viewport.width}-${viewport.height}`);
    await tap(page.getByRole("button", { name: "Save page", exact: true }));
    await expect(
      page.getByRole("heading", { name: "A good find, kept." }),
    ).toBeVisible();
    await page.close();
  }
  assert.deepEqual(errors, []);
  console.log(
    "Extension tests passed: MV3 permissions, account-link entry, save, pending state, collection memory, duplicate preservation, retry, expiry, restricted tabs, long content, keyboard disclosure, validation, light/dark layouts. API responses are controlled fixtures; hosted account acceptance is separate.",
  );
} finally {
  await context?.close();
  await rm(profile, { recursive: true, force: true });
}
