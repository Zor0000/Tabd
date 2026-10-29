import { expect, test } from "@playwright/test";

test("public privacy and account deletion help are reachable without sign-in", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation", { name: "Privacy and support" }).getByRole("link", { name: "Privacy", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Privacy policy", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "account deletion instructions" }).click();
  await expect(page.getByRole("heading", { name: "Delete your account", exact: true })).toBeVisible();
  await expect(page.locator('a[href="mailto:neerajcwork@gmail.com?subject=Tabd%20account%20deletion"]')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.goto("/login");
  await expect(page.getByRole("navigation", { name: "Privacy and support" }).getByRole("link", { name: "Support", exact: true })).toBeVisible();
});
