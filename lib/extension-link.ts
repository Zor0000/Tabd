type ExtensionReply = {
  ok?: boolean;
  error?: string;
  extensionLinkVersion?: number;
};
declare global {
  interface Window {
    chrome?: {
      runtime?: {
        sendMessage: (
          id: string,
          message: unknown,
          callback: (reply: ExtensionReply | undefined) => void,
        ) => void;
        lastError?: { message?: string };
      };
    };
  }
}

const recovery =
  "This page can’t reach Tabd in this browser. Reload Tabd in chrome://extensions, refresh this page, then try again. Keep the app and extension in the same browser profile.";

export function sendExtensionMessage(
  id: string,
  message: unknown,
  timeoutMs = 15000,
): Promise<ExtensionReply> {
  return new Promise((resolve, reject) => {
    const runtime = window.chrome?.runtime;
    if (!runtime?.sendMessage) {
      reject(new Error(recovery));
      return;
    }
    const timer = window.setTimeout(
      () =>
        reject(
          new Error(
            "Tabd took too long to respond. Reload the extension, refresh this page, and try again.",
          ),
        ),
      timeoutMs,
    );
    try {
      runtime.sendMessage(id, message, (reply) => {
        window.clearTimeout(timer);
        // Chrome requires lastError to be read inside its callback.
        const lastError = runtime.lastError;
        if (lastError || !reply) reject(new Error(recovery));
        else if (!reply.ok) reject(new Error(reply.error || recovery));
        else resolve(reply);
      });
    } catch {
      window.clearTimeout(timer);
      reject(new Error(recovery));
    }
  });
}

export async function probeExtension(id: string) {
  const reply = await sendExtensionMessage(id, { type: "TABD_PING" }, 5000);
  if (reply.extensionLinkVersion !== 1)
    throw new Error(
      "This Tabd extension needs an update. Rebuild or update it, reload it in chrome://extensions, then refresh this page.",
    );
}
