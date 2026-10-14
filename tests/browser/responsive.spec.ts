import { test, expect, type Page, type Locator } from "@playwright/test";

async function fits(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}
async function touchTarget(control: Locator) {
  const bounds = await control.boundingBox();
  expect(bounds?.height).toBeGreaterThanOrEqual(44);
  expect(bounds?.width).toBeGreaterThanOrEqual(44);
}

test("library supports touch navigation, filters, list actions and editing", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/metadata", (route) =>
    route.fulfill({
      json: { warning: "Metadata unavailable in this layout fixture." },
    }),
  );
  await page.goto("/preview");
  await expect(page.locator(".resource-card")).toHaveCount(9);
  const touch = Boolean(testInfo.project.use.hasTouch);
  const compact = page.viewportSize()!.width <= 960;
  const openNavigation = page.getByRole("button", {
    name: "Open navigation",
    exact: true,
  });
  if (compact) {
    // Closed navigation is removed from keyboard and accessibility navigation.
    await expect(
      page.getByRole("navigation", { name: "Library navigation" }),
    ).toHaveCount(0);
    await openNavigation.tap();
    const navigation = page.getByRole("dialog", {
      name: "Your library navigation",
    });
    await expect(navigation).toBeVisible();
    await page.keyboard.press("Tab");
    expect(
      await navigation.evaluate((node) =>
        node.contains(document.activeElement),
      ),
    ).toBe(true);
    expect(
      await page
        .locator("body")
        .evaluate((node) => getComputedStyle(node).overflow),
    ).toBe("hidden");
    await page
      .getByRole("button", { name: "Close navigation", exact: true })
      .tap();
    await expect(openNavigation).toBeFocused();
    await openNavigation.tap();
  }
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "Dark", exact: true }).click();
  await page.getByRole("button", { name: "Close panel", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await fits(page);
  await page.screenshot({ path: testInfo.outputPath("library-dark.png") });
  if (compact) await openNavigation.tap();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "Light", exact: true }).click();
  await page.getByRole("button", { name: "Close panel", exact: true }).click();
  const status = page.getByRole("group", { name: "Filter by status" });
  if (touch) {
    await touchTarget(
      page.getByRole("button", { name: "Add resource", exact: true }),
    );
    for (const name of ["All resources", "To Explore", "In Use", "Reference"]) {
      await touchTarget(status.getByRole("button", { name, exact: true }));
    }
    await touchTarget(
      page.getByRole("button", { name: "Filters", exact: true }),
    );
  }
  await status.getByRole("button", { name: "In Use", exact: true }).click();
  await expect(page.locator(".resource-card")).toHaveCount(3);
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  await expect(page.getByLabel("Date added")).toBeVisible();
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await page.getByRole("button", { name: "List view", exact: true }).click();
  await fits(page);
  await page.screenshot({ path: testInfo.outputPath("library-list.png") });
  const first = page.locator(".resource-card").first();
  await first.locator(".menu-trigger").click();
  await page.getByRole("menuitem", { name: "Edit or move" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await fits(page);
  await page.getByRole("button", { name: "Close panel", exact: true }).click();
  await page.getByRole("button", { name: "Grid view", exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath("library-grid.png") });
  await page.getByRole("button", { name: "Add resource", exact: true }).click();
  const url = page.getByRole("textbox", { name: "Website URL Required" });
  if (touch)
    expect(
      await url.evaluate((node) => parseFloat(getComputedStyle(node).fontSize)),
    ).toBeGreaterThanOrEqual(16);
  if (touch)
    await touchTarget(
      page.getByRole("combobox", { name: "Collection", exact: true }),
    );
  await url.fill("https://example.com/");
  await page.getByRole("button", { name: "Add details Optional" }).click();
  await fits(page);
  await page.screenshot({ path: testInfo.outputPath("save-panel.png") });
  const save = page.getByRole("button", { name: "Save resource", exact: true });
  await save.scrollIntoViewIfNeeded();
  await save.click();
  await expect(
    page.getByRole("status").filter({ hasText: "preview library" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close panel", exact: true }).click();
  if (compact) await openNavigation.tap();
  await page.getByRole("button", { name: "Get the extension" }).click();
  await page.getByRole("button", { name: "Add a link", exact: true }).click();
  await expect(url).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("landing and account entry fit the viewport and retain navigation", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await expect(page.locator(".auth-sculpture")).toBeVisible();
  await fits(page);
  await page.screenshot({ path: testInfo.outputPath("landing.png") });
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Extension", exact: true })
    .click();
  await expect(
    page.getByText("On your phone or iPad, copy a link", { exact: false }),
  ).toBeVisible();
  await fits(page);
  await page.goto("/login");
  await fits(page);
  await page.screenshot({ path: testInfo.outputPath("login.png") });
  await expect(
    page.getByRole("textbox", { name: "Email", exact: true }),
  ).toBeVisible();
});
