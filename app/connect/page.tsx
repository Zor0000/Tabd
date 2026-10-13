"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { probeExtension, sendExtensionMessage } from "@/lib/extension-link";
export default function Connect() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const connecting = useRef(false);
  async function link() {
    if (connecting.current) return;
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
    connecting.current = true;
    setBusy(true);
    setError("");
    try {
      // Wake and verify the receiver before issuing an account credential.
      await probeExtension(id);
      const response = await fetch("/api/extension-token", {
        method: "POST",
        signal: AbortSignal.timeout(15000),
      });
      const result = await response.json();
      if (response.status === 401) {
        router.push(
          "/login?next=" + encodeURIComponent("/connect?extension=" + id),
        );
        return;
      }
      if (!response.ok) throw new Error(result.error);
      await sendExtensionMessage(id, {
        type: "TABD_LINK",
        token: result.token,
      });
      setDone(true);
    } catch (e) {
      setError(
        e instanceof DOMException ||
          e instanceof TypeError ||
          e instanceof SyntaxError
          ? "Couldn’t reach the Tabd app. Check that it is running, then try again."
          : e instanceof Error
            ? e.message
            : "Could not connect. Please try again.",
      );
    } finally {
      connecting.current = false;
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
