import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";

test("agent settings creates and revokes access and persists explicit taste", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const issued = {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    name: "Work agent",
    created_at: "2026-10-12T00:00:00Z",
    expires_at: "2099-11-11T00:00:00Z",
  };
  let tokens: (typeof issued)[] = [];
  let preferences = "";
  await page.route("**/api/mcp-tokens", async (route) => {
    const request = route.request();
    if (request.method() === "POST") {
      expect(request.postDataJSON()).toEqual({ name: "Work agent" });
      tokens = [issued];
      return route.fulfill({
        status: 201,
        json: { ...issued, token: "tabd_mcp_" + "a".repeat(64) },
      });
    }
    if (request.method() === "DELETE") {
      expect(request.postDataJSON()).toEqual({ id: issued.id });
      tokens = [];
      return route.fulfill({ json: { ok: true } });
    }
    return route.fulfill({ json: tokens });
  });
  await page.route("**/api/taste-profile", (route) => {
    if (route.request().method() === "PUT")
      preferences = route.request().postDataJSON().preferences;
    return route.fulfill({ json: { preferences, updated_at: null } });
  });
  await page.goto("/agents");
  await expect(
    page.getByText("No agents connected yet.", { exact: false }),
  ).toBeVisible();
  await page.getByLabel("Agent name", { exact: true }).fill("Work agent");
  await page.getByRole("button", { name: "Create token", exact: true }).click();
  await expect(page.getByLabel("New agent token", { exact: true })).toHaveValue(
    "tabd_mcp_" + "a".repeat(64),
  );
  await expect(
    page.getByRole("button", { name: "Create token", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "I’ve saved it" }).click();
  await expect(page.getByLabel("New agent token", { exact: true })).toHaveCount(
    0,
  );
  await page
    .getByLabel("What should your agent know?")
    .fill("Compact dashboards, clear type, restrained motion.");
  await page.getByRole("button", { name: "Save preferences" }).click();
  await expect(page.getByRole("status")).toHaveText(
    "Design preferences saved.",
  );
  await page.reload();
  await expect(page.getByLabel("What should your agent know?")).toHaveValue(
    preferences,
  );
  await expect(page.getByLabel("New agent token", { exact: true })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("button", { name: "Revoke Work agent" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await mkdir(".impeccable/review", { recursive: true });
  await page.screenshot({
    path: `.impeccable/review/agents-${testInfo.project.name}.png`,
    fullPage: true,
    animations: "disabled",
  });
  await page.evaluate(() => (document.documentElement.dataset.theme = "dark"));
  await page.screenshot({
    path: `.impeccable/review/agents-${testInfo.project.name}-dark.png`,
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Revoke Work agent" }).click();
  await expect(
    page.getByText("No agents connected yet.", { exact: false }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("agent settings fails safely and offers retry when setup is unavailable", async ({
  page,
}) => {
  await page.goto("/agents");
  await expect(page.locator(".form-message[role='alert']")).toContainText(
    "Connect Supabase",
  );
  await expect(
    page.getByRole("button", { name: "Create token", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Save preferences" }),
  ).toBeDisabled();
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
});
