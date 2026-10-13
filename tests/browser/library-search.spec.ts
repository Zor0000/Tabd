import { test, expect } from "@playwright/test";
import { build } from "vite";
import { previewCollections, previewResources } from "../../lib/preview";

let dashboardScript: string;

test.beforeAll(async () => {
  // Mount the real account dashboard without needing a signed-in test account.
  // Only Next's navigation is stubbed; React and the library UI run in Chromium.
  const result = await build({
    configFile: false,
    logLevel: "silent",
    define: { "process.env": "{}", "process.env.NODE_ENV": '"production"' },
    resolve: { alias: { "@": process.cwd() } },
    plugins: [
      {
        name: "account-dashboard-fixture",
        enforce: "pre",
        resolveId(id) {
          if (id === `${process.cwd()}/dashboard-fixture`)
            return "\0dashboard-fixture";
          if (
            ["dashboard-fixture", "next/link", "next/navigation"].includes(id)
          )
            return `\0${id}`;
        },
        load(id) {
          if (id === "\0dashboard-fixture")
            return `
              import { createElement } from 'react';
              import { createRoot } from 'react-dom/client';
              import { Dashboard } from '@/components/dashboard';
              createRoot(document.getElementById('root')).render(createElement(Dashboard));
            `;
          if (id === "\0next/link")
            return `import { createElement } from 'react';
              export default function Link(props) { return createElement('a', props); }`;
          if (id === "\0next/navigation")
            return "export function useRouter() { return { refresh() {}, push() {} }; }";
        },
      },
    ],
    build: {
      write: false,
      minify: false,
      lib: { entry: "dashboard-fixture", formats: ["iife"], name: "Fixture" },
    },
  });
  const bundle = Array.isArray(result) ? result[0] : result;
  if (!("output" in bundle))
    throw new Error("Expected a single dashboard fixture bundle.");
  const script = bundle.output.find((file) => file.type === "chunk");
  if (!script) throw new Error("Dashboard fixture bundle is missing.");
  dashboardScript = script.code;
});

test("account search keeps partial matches after typing stops across the whole library", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const requests: string[] = [];
  const firstPage = Array.from({ length: 500 }, (_, i) => ({
    ...previewResources[0],
    id: `first-page-${i}`,
  }));
  const reference = {
    ...previewResources[2],
    personal_note: "Useful for motion prototypes",
  };
  await page.route("**/api/resources?*", (route) => {
    const params = new URL(route.request().url()).searchParams;
    requests.push(params.toString());
    // The old delayed full-text search rejects these partial keywords.
    return route.fulfill({
      json: params.get("q")
        ? []
        : params.get("page") === "0"
          ? firstPage
          : [reference],
    });
  });
  await page.route("**/api/collections", (route) =>
    route.fulfill({ json: previewCollections }),
  );
  await page.route("**/account-search-fixture.js", (route) =>
    route.fulfill({ contentType: "text/javascript", body: dashboardScript }),
  );
  await page.route("**/account-search-fixture", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<div id="root"></div><script src="/account-search-fixture.js"></script>',
    }),
  );
  await page.goto("/account-search-fixture");
  expect(errors).toEqual([]);
  await expect(page.locator(".resource-card")).toHaveCount(501);
  const search = page.getByRole("textbox", { name: "Search your library" });
  for (const query of ["  BITS  ", "reactb", "anim", "prototyp"]) {
    await search.fill(query);
    await expect(page.locator(".resource-card")).toHaveCount(1);
    // Wait beyond the original debounce to catch disappearing results.
    await page.waitForTimeout(400);
    await expect(
      page.getByRole("heading", { name: "React Bits", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".empty-state")).toHaveCount(0);
  }
  await page
    .getByRole("group", { name: "Filter by status" })
    .getByRole("button", { name: "In Use", exact: true })
    .click();
  await expect(page.locator(".resource-card")).toHaveCount(0);
  await page
    .getByRole("group", { name: "Filter by status" })
    .getByRole("button", { name: "All resources", exact: true })
    .click();
  await expect(page.locator(".resource-card")).toHaveCount(1);
  await search.fill("definitely-not-saved");
  await expect(
    page.getByRole("heading", { name: "No finds this time." }),
  ).toBeVisible();
  await search.fill("");
  await expect(page.locator(".resource-card")).toHaveCount(501);
  expect(requests).toEqual(["page=0", "page=1"]);
  expect(errors).toEqual([]);
});
