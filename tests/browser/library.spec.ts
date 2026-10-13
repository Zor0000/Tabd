import { test, expect } from "@playwright/test";
test("preview library searches, filters, and remembers list view", async ({
  page,
}) => {
  await page.goto("/preview");
  await expect(
    page.getByRole("heading", { name: "Your little corner of the web." }),
  ).toBeVisible();
  await expect(page.locator(".resource-card")).toHaveCount(9);
  await page
    .getByRole("textbox", { name: "Search your library" })
    .fill("animation");
  await expect(page.locator(".resource-card")).toHaveCount(1);
  await expect(
    page.getByRole("heading", { name: "React Bits", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear search", exact: true }).click();
  await page
    .getByRole("group", { name: "Filter by status" })
    .getByRole("button", { name: "In Use", exact: true })
    .click();
  await expect(page.locator(".resource-card")).toHaveCount(3);
  await page.getByRole("button", { name: "List view", exact: true }).click();
  await expect(page.locator(".resources-list")).toBeVisible();
  await page.reload();
  await expect(page.locator(".resources-list")).toBeVisible();
});
test("save panel exposes real setup error and keyboard close works", async ({
  page,
}) => {
  const metadataResponse = page.waitForResponse(
    (response) => new URL(response.url()).pathname === "/api/metadata",
  );
  await page.goto("/preview");
  await page.locator(".topbar-actions .button-primary").click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("textbox", { name: "Website URL Required" })
    .fill("https://example.com/");
  await page
    .getByRole("combobox", { name: "Collection", exact: true })
    .selectOption("");
  await page
    .getByRole("button", { name: "Save resource", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "preview library" }),
  ).toBeVisible();
  await metadataResponse;
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
});
test("responsive layout and theme settings", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/preview");
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "Open navigation" }).click();
  }
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "Dark", exact: true }).click();
  await page.keyboard.press("Escape");
  if (testInfo.project.name === "mobile") await page.keyboard.press("Escape");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.waitForLoadState("networkidle");
  await page.screenshot({
    path: `test-results/${testInfo.project.name}-dark.png`,
    fullPage: true,
  });
  await page.evaluate(() => {
    localStorage.setItem("tabd-theme", "light");
  });
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.screenshot({
    path: `test-results/${testInfo.project.name}-light.png`,
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
test("unconfigured API returns an honest setup error", async ({ request }) => {
  const response = await request.post("/api/resources", {
    data: { url: "https://example.com/" },
  });
  expect(response.status()).toBe(503);
  expect((await response.json()).error).toContain("Connect Supabase");
});

test("saving stays responsive while metadata lookup is pending", async ({
  page,
}) => {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/metadata", async (route) => {
    await pending;
    await route
      .fulfill({ json: { warning: "Temporarily unavailable" } })
      .catch(() => {});
  });
  try {
    await page.goto("/preview");
    await page
      .getByRole("button", { name: "Add resource", exact: true })
      .click();
    await page
      .getByRole("textbox", { name: "Website URL Required" })
      .fill("https://example.com/");
    await page
      .getByRole("button", { name: "Save resource", exact: true })
      .click();
    await expect(
      page.getByRole("status").filter({ hasText: "preview library" }),
    ).toBeVisible();
  } finally {
    release();
  }
});

test("URL changes replace auto-filled metadata and preserve manual titles", async ({
  page,
}) => {
  const requests: string[] = [];
  await page.route("**/api/metadata", async (route) => {
    const url = route.request().postDataJSON().url as string;
    requests.push(url);
    const name = new URL(url).hostname;
    await route.fulfill({
      json: {
        title: name,
        description: `About ${name}`,
        favicon_url: `${url}icon.png`,
        preview_image_url: `${url}og.png`,
      },
    });
  });
  await page.goto("/preview");
  await page.getByRole("button", { name: "Add resource", exact: true }).click();
  const url = page.getByRole("textbox", { name: "Website URL Required" });
  await url.fill("https://first.example/");
  await page.getByRole("button", { name: "Add details Optional" }).click();
  const title = page.getByRole("textbox", { name: "Title", exact: true });
  const description = page.getByRole("textbox", {
    name: "Description",
    exact: true,
  });
  await expect(title).toHaveValue("first.example");
  await title.fill("My chosen name");
  await url.fill("https://second.example/");
  await description.click();
  await expect(description).toHaveValue("About second.example");
  await expect(title).toHaveValue("My chosen name");
  expect(requests).toEqual([
    "https://first.example/",
    "https://second.example/",
  ]);
});
