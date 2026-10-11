"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
declare global {
  interface Window {
    chrome?: {
      runtime?: {
        sendMessage: (
          id: string,
          message: unknown,
          callback: (
            reply: { ok?: boolean; error?: string } | undefined,
          ) => void,
        ) => void;
        lastError?: { message?: string };
      };
    };
  }
}
export default function Connect() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  async function link() {
    const id = new URLSearchParams(location.search).get("extension") || "";
    const allowed = (process.env.NEXT_PUBLIC_EXTENSION_IDS || "")
      .split(",")
      .map((s) => s.trim());
    if (!/^[a-p]{32}$/.test(id) || !allowed.includes(id)) {
      setError(
        "This extension ID is not allowed. Add your unpacked extension ID to NEXT_PUBLIC_EXTENSION_IDS and restart the app.",
      );
      return;
    }
    if (!window.chrome?.runtime?.sendMessage) {
      setError(
        "Install the extension in Chrome, then reopen this page from its popup.",
      );
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/extension-token", { method: "POST" });
      const result = await response.json();
      if (response.status === 401) {
        router.push(
          "/login?next=" + encodeURIComponent("/connect?extension=" + id),
        );
        return;
      }
      if (!response.ok) throw new Error(result.error);
      window.chrome.runtime.sendMessage(
        id,
        { type: "TABD_LINK", token: result.token },
        (reply) => {
          setBusy(false);
          if (window.chrome?.runtime?.lastError || !reply?.ok)
            setError(
              reply?.error ||
                "Could not reach the extension. Check its configured app URL.",
            );
          else setDone(true);
        },
      );
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  return (
    <main className="auth-page">
      <div className="auth-card">
        <Link className="brand" href="/">
          tabd.
        </Link>
        <h1>{done ? "You’re connected." : "Connect your Chrome extension."}</h1>
        <p>
          {done
            ? "Return to any website and click Tabd to save it."
            : "This extension will be able to read and manage your personal library for 30 days. You can revoke access in Settings."}
        </p>
        {error && (
          <p className="form-message" role="alert">
            {error}
          </p>
        )}
        <div style={{ marginTop: 24 }}>
          {done ? (
            <Button asChild>
              <Link href="/">Open your library</Link>
            </Button>
          ) : (
            <Button disabled={busy} onClick={link}>
              {busy ? "Connecting…" : "Connect this extension"}
            </Button>
          )}
        </div>
      </div>
    </main>
  );
}
