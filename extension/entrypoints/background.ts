import { browser } from "wxt/browser";
import { defineBackground } from "wxt/utils/define-background";
const appUrl = import.meta.env.WXT_APP_URL || "http://localhost:3000";
export default defineBackground(() => {
  browser.runtime.onMessageExternal.addListener(
    (message, sender, sendResponse) => {
      if (
        !sender.url ||
        new URL(sender.url).origin !== new URL(appUrl).origin ||
        message?.type !== "TABD_LINK" ||
        !/^tabd_[a-f0-9]{64}$/.test(message.token)
      )
        return false;
      (async () => {
        try {
          const response = await fetch(`${appUrl}/api/collections`, {
            headers: { Authorization: `Bearer ${message.token}` },
          });
          if (!response.ok)
            throw new Error("Could not verify the account link.");
          await browser.storage.local.set({ tabdToken: message.token });
          sendResponse({ ok: true });
        } catch (e) {
          sendResponse({ ok: false, error: (e as Error).message });
        }
      })();
      return true;
    },
  );
});
