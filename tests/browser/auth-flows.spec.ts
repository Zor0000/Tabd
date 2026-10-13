import { test, expect } from "@playwright/test";
import { build } from "vite";
let script: string;
test.beforeAll(async () => {
  const result = await build({
    configFile: false,
    logLevel: "silent",
    define: { "process.env": "{}", "process.env.NODE_ENV": '"production"' },
    resolve: { alias: { "@": process.cwd() } },
    plugins: [
      {
        name: "auth-fixture",
        enforce: "pre",
        resolveId(id) {
          if (id.endsWith("/auth-fixture") || id === "auth-fixture")
            return "\0auth-fixture";
          if (id === "next/link") return "\0next/link";
          if (id.endsWith("/lib/supabase/client")) return "\0auth-client";
        },
        load(id) {
          if (id === "\0next/link")
            return `import {createElement} from 'react'; export default function Link(p){return createElement('a',p)}`;
          if (id === "\0auth-client")
            return `export const configured = true;
          export function browserClient(){return {auth:new Proxy({}, {get(_, method){return async (...args) => (await fetch('/auth-test-api/'+method,{method:'POST',body:JSON.stringify(args)})).json()}})}}`;
          if (id === "\0auth-fixture")
            return `import {createElement as h} from 'react'; import {createRoot} from 'react-dom/client';
          import {AuthForm} from '@/components/auth-form'; import {UpdatePassword} from '@/components/update-password';
          import {AuthConfirm} from '@/components/auth-confirm'; import {AccountAccess} from '@/components/account-access';
          const mode = new URLSearchParams(location.search).get('mode');
          const component = mode === 'change' ? h(UpdatePassword,{changing:true}) : mode === 'reset' ? h(UpdatePassword) : mode === 'confirm' ? h(AuthConfirm,{tokenHash:'test-only-token',type:'recovery',next:'/'}) : mode === 'logout' ? h(AccountAccess) : h(AuthForm,{initialMode:mode || 'login'});
          createRoot(document.getElementById('root')).render(component);`;
        },
      },
    ],
    build: {
      write: false,
      minify: false,
      lib: { entry: "auth-fixture", formats: ["iife"], name: "AuthFixture" },
    },
  });
  const bundle = Array.isArray(result) ? result[0] : result;
  if (!("output" in bundle)) throw new Error("Missing auth fixture");
  script = bundle.output.find((f) => f.type === "chunk")!.code;
});
test.beforeEach(async ({ page }) => {
  await page.route("**/auth-fixture.js", (r) =>
    r.fulfill({ contentType: "text/javascript", body: script }),
  );
  await page.route("**/auth-fixture?*", (r) =>
    r.fulfill({
      contentType: "text/html",
      body: '<meta charset="utf-8"><div id="root"></div><script src="/auth-fixture.js"></script>',
    }),
  );
});
test("recovery preserves email, requests a reset callback, and throttles resends", async ({
  page,
}) => {
  const calls: unknown[] = [];
  await page.route("**/auth-test-api/resetPasswordForEmail", (r) => {
    calls.push(r.request().postDataJSON());
    return r.fulfill({ json: { error: null } });
  });
  await page.goto("/auth-fixture?mode=login");
  await page.getByLabel("Email", { exact: true }).fill("person@example.com");
  await page
    .getByRole("button", { name: "Forgot password?", exact: true })
    .click();
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue(
    "person@example.com",
  );
  await page
    .getByRole("button", { name: "Send reset link", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("If there’s an account");
  await expect(
    page.getByRole("button", { name: /Send again in/ }),
  ).toBeDisabled();
  expect(calls).toEqual([
    [
      "person@example.com",
      {
        redirectTo: new URL("/auth/callback?next=/reset-password", page.url())
          .href,
      },
    ],
  ]);
});
test("signup rejects mismatched passwords before sending and offers confirmation resend", async ({
  page,
}) => {
  let calls = 0;
  await page.route("**/auth-test-api/signUp", (r) => {
    calls++;
    return r.fulfill({ json: { data: { session: null }, error: null } });
  });
  await page.goto("/auth-fixture?mode=signup");
  await page.getByLabel("Email", { exact: true }).fill("person@example.com");
  await page.getByLabel("Password", { exact: true }).fill("three-purple-trees");
  await page
    .getByLabel("Confirm password", { exact: true })
    .fill("three-purple-tree");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("don’t match");
  expect(calls).toBe(0);
  await page
    .getByLabel("Confirm password", { exact: true })
    .fill("three-purple-trees");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("confirmation email");
  expect(calls).toBe(1);
});
test("email scanners cannot consume a token before confirmation and expired links recover", async ({
  page,
}) => {
  let calls = 0;
  await page.route("**/auth-test-api/verifyOtp", (r) => {
    calls++;
    return r.fulfill({ json: { error: { code: "otp_expired" } } });
  });
  await page.goto("/auth-fixture?mode=confirm");
  await expect(
    page.getByRole("button", { name: "Continue to reset password" }),
  ).toBeVisible();
  expect(calls).toBe(0);
  await page
    .getByRole("button", { name: "Continue to reset password" })
    .click();
  await expect(page.getByRole("alert")).toContainText("expired");
  expect(calls).toBe(1);
  await expect(
    page.getByRole("link", { name: "Request a new email" }),
  ).toHaveAttribute("href", "/forgot-password");
});
test("password changes include current password and retry sign-out without changing twice", async ({
  page,
}) => {
  const updates: unknown[] = [];
  let exits = 0;
  await page.route("**/auth-test-api/updateUser", (r) => {
    updates.push(r.request().postDataJSON());
    return r.fulfill({ json: { error: null } });
  });
  await page.route("**/auth-test-api/signOut", (r) => {
    exits++;
    expect(r.request().postDataJSON()).toEqual([{ scope: "global" }]);
    return r.fulfill({
      json: { error: exits === 1 ? { code: "network_error" } : null },
    });
  });
  await page.goto("/auth-fixture?mode=change");
  await page
    .getByLabel("Current password", { exact: true })
    .fill("old-password");
  await page
    .getByLabel("New password", { exact: true })
    .fill("three-purple-trees");
  await page
    .getByLabel("Confirm new password", { exact: true })
    .fill("three-purple-trees");
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(page.getByRole("alert")).toContainText("password was updated");
  await page.getByRole("button", { name: "Finish signing out" }).click();
  await expect(page).toHaveURL(/\/login\?notice=password-updated$/);
  expect(updates).toEqual([
    [{ password: "three-purple-trees", current_password: "old-password" }],
  ]);
  expect(exits).toBe(2);
});
test("logout errors stay visible and successful local logout clears the page", async ({
  page,
}) => {
  let calls = 0;
  await page.route("**/auth-test-api/signOut", (r) => {
    calls++;
    expect(r.request().postDataJSON()).toEqual([{ scope: "local" }]);
    return r.fulfill({
      json: { error: calls === 1 ? { code: "network_error" } : null },
    });
  });
  await page.goto("/auth-fixture?mode=logout");
  await page.getByRole("button", { name: "Sign out of this browser" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByRole("button", { name: "Sign out of this browser" }).click();
  await expect(page).toHaveURL(/\/login\?notice=signed-out$/);
});
