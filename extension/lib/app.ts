import { browser } from "wxt/browser";
import {
  appMatches,
  isDevelopmentOrigin,
  trustedAppOrigin,
} from "./app-origin";

export const configuredAppUrl = new URL(
  import.meta.env.WXT_APP_URL || "http://localhost:3000",
).origin;

export async function resolveAppUrl(preferred?: unknown, signal?: AbortSignal) {
  const tabs = await browser.tabs.query({ url: appMatches(configuredAppUrl) });
  const candidates = [
    ...new Set(
      [
        preferred,
        ...tabs.map((tab) => tab.url),
        configuredAppUrl,
        ...(isDevelopmentOrigin(configuredAppUrl)
          ? [
              "http://localhost:3000",
              "http://localhost:3210",
              "http://127.0.0.1:3000",
              "http://127.0.0.1:3210",
            ]
          : []),
      ]
        .map((value) => trustedAppOrigin(value, configuredAppUrl))
        .filter((value): value is string => Boolean(value)),
    ),
  ].slice(0, 12);

  // Probe without credentials. A different app occupying a familiar port is not Tabd.
  const available = await Promise.all(
    candidates.map(async (origin) => {
      try {
        const response = await fetch(`${origin}/api/extension/status`, {
          cache: "no-store",
          credentials: "omit",
          redirect: "error",
          signal: signal
            ? AbortSignal.any([signal, AbortSignal.timeout(4000)])
            : AbortSignal.timeout(4000),
        });
        if (!response.ok) return null;
        const data = await response.json();
        return data.app === "tabd" && data.extensionLinkVersion === 1
          ? origin
          : null;
      } catch {
        return null;
      }
    }),
  );
  if (signal?.aborted) throw signal.reason;
  const origin = available.find(Boolean);
  if (!origin)
    throw new Error(
      "Tabd couldn’t be found. Start the app and open its dashboard in this browser, then try again.",
    );
  return origin;
}
