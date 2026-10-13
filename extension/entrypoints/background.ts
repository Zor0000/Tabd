import { browser } from "wxt/browser";
import { defineBackground } from "wxt/utils/define-background";
import { configuredAppUrl } from "../lib/app";
import { trustedAppOrigin } from "../lib/app-origin";

export default defineBackground(() => {
  browser.runtime.onMessageExternal.addListener(
    (message, sender, sendResponse) => {
      const origin = trustedAppOrigin(sender.url, configuredAppUrl);
      if (
        !origin ||
        (sender.origin && sender.origin !== origin) ||
        (sender.frameId && sender.frameId !== 0)
      )
        return false;
      if (message?.type === "TABD_PING") {
        sendResponse({ ok: true, extensionLinkVersion: 1 });
        return false;
      }
      if (message?.type !== "TABD_LINK") return false;
      if (!/^tabd_[a-f0-9]{64}$/.test(message.token)) {
        sendResponse({
          ok: false,
          error: "Invalid account link. Return to Tabd and connect again.",
        });
        return false;
      }
      void (async () => {
        try {
          // Use the verified sender, not a stale port compiled into the extension.
          const response = await fetch(`${origin}/api/collections`, {
            headers: { Authorization: `Bearer ${message.token}` },
            credentials: "omit",
            redirect: "error",
            signal: AbortSignal.timeout(10000),
          });
          if (!response.ok) {
            const result = await response.json().catch(() => null);
            throw new Error(
              result?.error ||
                "Tabd could not verify this account link. Return to the app and try again.",
            );
          }
          if (!Array.isArray(await response.json()))
            throw new Error(
              "This server did not return a Tabd library. Open the correct Tabd dashboard and connect again.",
            );
          await browser.storage.local.set({
            tabdToken: message.token,
            tabdAppUrl: origin,
          });
          sendResponse({ ok: true });
        } catch (cause) {
          const networkError =
            cause instanceof TypeError ||
            cause instanceof DOMException ||
            cause instanceof SyntaxError;
          sendResponse({
            ok: false,
            error: networkError
              ? "The extension couldn’t reach your Tabd server. Make sure the app is running, then try again."
              : cause instanceof Error
                ? cause.message
                : "Could not verify the account link.",
          });
        }
      })();
      // Keep the reply channel alive while the account is verified and stored.
      return true;
    },
  );
});
