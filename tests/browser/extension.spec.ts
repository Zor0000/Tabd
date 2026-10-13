import { test, expect } from "@playwright/test";
const extensionId = "abcdefghijklmnopabcdefghijklmnop";
const url = `/connect?extension=${extensionId}`;

test("an unreachable extension does not create an account token", async ({
  page,
}) => {
  let issued = 0;
  await page.route("**/api/extension-token", (route) => {
    issued++;
    return route.fulfill({ json: { token: "unused" } });
  });
  await page.goto(url);
  await page.getByRole("button", { name: "Connect this extension" }).click();
  await expect(page.locator(".form-message[role='alert']")).toContainText(
    "Reload Tabd",
  );
  await expect(
    page.getByRole("button", { name: "Connect this extension" }),
  ).toBeEnabled();
  expect(issued).toBe(0);
});

test("a successful handshake precedes token creation and link confirmation", async ({
  page,
}) => {
  const order: string[] = [];
  await page.exposeFunction("recordMessage", (type: string) =>
    order.push(type),
  );
  await page.addInitScript(() => {
    const target = window as unknown as {
      chrome: { runtime: unknown };
      recordMessage: (type: string) => Promise<void>;
    };
    target.chrome = target.chrome || { runtime: {} };
    target.chrome.runtime = {
      sendMessage: (
        _id: string,
        message: { type: string },
        callback: (reply: object) => void,
      ) => {
        void target
          .recordMessage(message.type)
          .then(() => callback({ ok: true, extensionLinkVersion: 1 }));
      },
    };
  });
  await page.route("**/api/extension-token", (route) => {
    order.push("ISSUE_TOKEN");
    return route.fulfill({ json: { token: "tabd_" + "a".repeat(64) } });
  });
  await page.goto(url);
  await page.getByRole("button", { name: "Connect this extension" }).click();
  await expect(
    page.getByRole("heading", { name: "You’re connected." }),
  ).toBeVisible();
  expect(order).toEqual(["TABD_PING", "ISSUE_TOKEN", "TABD_LINK"]);
});

test("an expired web session returns to the same connection after login", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const target = window as unknown as { chrome: { runtime: unknown } };
    target.chrome = target.chrome || { runtime: {} };
    target.chrome.runtime = {
      sendMessage: (
        _id: string,
        _message: unknown,
        callback: (reply: object) => void,
      ) => callback({ ok: true, extensionLinkVersion: 1 }),
    };
  });
  await page.route("**/api/extension-token", (route) =>
    route.fulfill({ status: 401, json: { error: "Sign in" } }),
  );
  await page.goto(url);
  await page.getByRole("button", { name: "Connect this extension" }).click();
  await expect(page).toHaveURL(
    new RegExp(`/login\\?next=${encodeURIComponent(url)}`),
  );
});
