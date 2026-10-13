import { afterEach, describe, expect, it, vi } from "vitest";
import { appMatches, trustedAppOrigin } from "../extension/lib/app-origin";
import { probeExtension, sendExtensionMessage } from "../lib/extension-link";

const id = "abcdefghijklmnopabcdefghijklmnop";
function runtime(
  sendMessage?: (
    id: string,
    message: unknown,
    callback: (reply: unknown) => void,
  ) => void,
  lastError?: object,
) {
  vi.stubGlobal("window", {
    setTimeout,
    clearTimeout,
    chrome: sendMessage ? { runtime: { sendMessage, lastError } } : undefined,
  });
}
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("extension origin trust", () => {
  it("allows development servers to move between localhost ports and the loopback IP", () => {
    expect(appMatches("http://localhost:3210")).toEqual([
      "http://localhost/*",
      "http://127.0.0.1/*",
    ]);
    expect(
      trustedAppOrigin(
        "http://localhost:4321/connect",
        "http://localhost:3210",
      ),
    ).toBe("http://localhost:4321");
    expect(
      trustedAppOrigin(
        "http://127.0.0.1:4321/connect",
        "http://localhost:3210",
      ),
    ).toBe("http://127.0.0.1:4321");
  });
  it.each([
    "https://evil.example",
    "http://localhost.evil.example",
    "http://192.168.1.4:3000",
    "http://user:password@localhost:3000",
    "chrome-extension://other/page",
    "not-a-url",
  ])("rejects the unrelated or unsafe development address %s", (origin) => {
    expect(trustedAppOrigin(origin, "http://localhost:3210")).toBeNull();
  });
  it("keeps hosted builds confined to the exact configured origin", () => {
    expect(appMatches("https://tabd.example.com")).toEqual([
      "https://tabd.example.com/*",
    ]);
    for (const origin of [
      "http://localhost:3000",
      "https://other.example.com",
      "http://tabd.example.com",
      "https://tabd.example.com:8080",
    ])
      expect(trustedAppOrigin(origin, "https://tabd.example.com")).toBeNull();
    expect(
      trustedAppOrigin(
        "https://tabd.example.com/connect",
        "https://tabd.example.com",
      ),
    ).toBe("https://tabd.example.com");
  });
});

describe("website extension handshake", () => {
  it("gives refresh/profile recovery when the browser has no messaging API", async () => {
    runtime();
    await expect(probeExtension(id)).rejects.toThrow("same browser profile");
  });
  it("consumes Chrome's callback error and gives an actionable recovery", async () => {
    let reads = 0;
    const fakeRuntime = {
      sendMessage: (
        _id: string,
        _message: unknown,
        callback: (reply: undefined) => void,
      ) => callback(undefined),
      get lastError() {
        reads++;
        return { message: "Receiving end does not exist" };
      },
    };
    vi.stubGlobal("window", {
      setTimeout,
      clearTimeout,
      chrome: { runtime: fakeRuntime },
    });
    await expect(probeExtension(id)).rejects.toThrow("Reload Tabd");
    expect(reads).toBe(1);
  });
  it("detects an old extension before an account credential is issued", async () => {
    runtime((_id, _message, callback) => callback({ ok: true }));
    await expect(probeExtension(id)).rejects.toThrow("needs an update");
  });
  it("accepts the protocol handshake and surfaces token verification failures", async () => {
    runtime((_id, message, callback) =>
      callback(
        (message as { type: string }).type === "TABD_PING"
          ? { ok: true, extensionLinkVersion: 1 }
          : { ok: false, error: "Account link rejected." },
      ),
    );
    await expect(probeExtension(id)).resolves.toBeUndefined();
    await expect(
      sendExtensionMessage(id, { type: "TABD_LINK" }),
    ).rejects.toThrow("Account link rejected.");
  });
  it("bounds a missing response instead of leaving the connect button stuck", async () => {
    vi.useFakeTimers();
    runtime(() => {});
    const result = expect(probeExtension(id)).rejects.toThrow("too long");
    await vi.advanceTimersByTimeAsync(5000);
    await result;
  });
});
