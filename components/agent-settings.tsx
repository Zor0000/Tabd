"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Copy, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";

type AgentToken = {
  id: string;
  name: string;
  created_at: string;
  expires_at: string;
};
type Taste = { preferences: string; updated_at: string | null };
class SignInRequired extends Error {}

async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  const data = await response.json();
  if (response.status === 401) {
    throw new SignInRequired("Sign in to connect your library.");
  }
  if (!response.ok)
    throw new Error(data.error || "Could not load agent settings. Try again.");
  return data;
}

export function AgentSettings() {
  const router = useRouter();
  const [now] = useState(() => Date.now());
  const [tokens, setTokens] = useState<AgentToken[]>([]);
  const [preferences, setPreferences] = useState("");
  const [savedPreferences, setSavedPreferences] = useState("");
  const [name, setName] = useState("");
  const [issued, setIssued] = useState<(AgentToken & { token: string }) | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [createError, setCreateError] = useState("");
  const issuedField = useRef<HTMLTextAreaElement>(null);
  const [message, setMessage] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (issued) issuedField.current?.focus();
  }, [issued]);

  useEffect(() => {
    const controller = new AbortController();
    const theme = localStorage.getItem("tabd-theme");
    if (theme === "light" || theme === "dark")
      document.documentElement.dataset.theme = theme;
    Promise.all([
      api<AgentToken[]>("/api/mcp-tokens", { signal: controller.signal }),
      api<Taste>("/api/taste-profile", { signal: controller.signal }),
    ])
      .then(([access, taste]) => {
        if (controller.signal.aborted) return;
        setTokens(access);
        setPreferences(taste.preferences);
        setSavedPreferences(taste.preferences);
        setReady(true);
      })
      .catch((e) => {
        if (!controller.signal.aborted) {
          setError(e.message);
          if (e instanceof SignInRequired)
            router.replace("/login?next=%2Fagents");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setEndpoint(new URL("/api/mcp", location.origin).href);
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [reload, router]);

  async function run(action: string, work: () => Promise<void>) {
    setBusy(action);
    setError("");
    setCreateError("");
    setMessage("");
    try {
      await work();
    } catch (e) {
      if (action === "create") setCreateError((e as Error).message);
      else setError((e as Error).message);
      if (e instanceof SignInRequired) router.replace("/login?next=%2Fagents");
    } finally {
      setBusy(null);
    }
  }
  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage(`${label} copied.`);
    } catch {
      setError(
        "Clipboard access was unavailable. Select and copy the text manually.",
      );
    }
  }

  return (
    <main className="agent-settings">
      <Link href="/" className="agent-back">
        <ArrowLeft size={16} /> Back to library
      </Link>
      <header className="agent-heading">
        <h1>Your library, in your agent.</h1>
        <p>
          Give your coding agent the references you’ve saved and the details you
          care about.
        </p>
      </header>
      {error && (
        <div className="form-message" role="alert">
          {error}
          {!ready && !loading && (
            <Button
              variant="ghost"
              onClick={() => {
                setLoading(true);
                setError("");
                setReload((n) => n + 1);
              }}
            >
              Try again
            </Button>
          )}
        </div>
      )}
      <p className="agent-status" role="status">
        {loading ? "Loading your agent settings…" : message}
      </p>

      <section
        className="agent-section"
        aria-labelledby="agent-connect-heading"
      >
        <div className="agent-section-intro">
          <h2 id="agent-connect-heading">Connect an agent</h2>
          <p>
            Read-only access to your saved links, collections, notes, favorites,
            and design preferences. Tokens expire after 30 days.
          </p>
        </div>
        <div className="agent-section-body">
          <label className="agent-field">
            MCP server URL
            <span className="agent-copy-row">
              <input value={endpoint} readOnly aria-label="MCP server URL" />
              <Button
                variant="secondary"
                aria-label="Copy MCP server URL"
                onClick={() => copy(endpoint, "Server URL")}
                disabled={!endpoint}
              >
                <Copy size={16} />
              </Button>
            </span>
          </label>
          <p className="inline-hint">
            Choose Streamable HTTP in your agent’s MCP settings. Add an
            Authorization header with <code>Bearer YOUR_TOKEN</code>.
          </p>
          <form
            className="agent-create"
            onSubmit={(e) => {
              e.preventDefault();
              void run("create", async () => {
                const next = await api<AgentToken & { token: string }>(
                  "/api/mcp-tokens",
                  { method: "POST", body: JSON.stringify({ name }) },
                );
                setTokens((items) => [
                  {
                    id: next.id,
                    name: next.name,
                    created_at: next.created_at,
                    expires_at: next.expires_at,
                  },
                  ...items,
                ]);
                setIssued(next);
                setName("");
                setMessage(
                  "Agent token created. Copy it before leaving this page.",
                );
              });
            }}
          >
            <label className="agent-field">
              Agent name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                required
                placeholder="e.g. My coding workspace"
                disabled={!ready || busy !== null}
                aria-describedby={
                  createError ? "agent-create-error" : undefined
                }
              />
            </label>
            <Button
              type="submit"
              disabled={
                !ready || busy !== null || !name.trim() || issued !== null
              }
            >
              <KeyRound size={16} />
              {busy === "create" ? "Creating…" : "Create token"}
            </Button>
          </form>
          {createError && (
            <p id="agent-create-error" className="form-message" role="alert">
              {createError}
            </p>
          )}
          {issued && (
            <div className="agent-issued">
              <h3>Copy your token</h3>
              <p>Shown once. Store it in your agent’s secret settings.</p>
              <label className="agent-field">
                New agent token
                <textarea
                  ref={issuedField}
                  aria-label="New agent token"
                  readOnly
                  rows={3}
                  value={issued.token}
                  spellCheck={false}
                />
              </label>
              <div className="agent-actions">
                <Button
                  variant="secondary"
                  onClick={() => copy(issued.token, "Token")}
                >
                  <Copy size={16} /> Copy token
                </Button>
                <Button variant="ghost" onClick={() => setIssued(null)}>
                  I’ve saved it
                </Button>
              </div>
            </div>
          )}
          {ready &&
            (tokens.length ? (
              <ul className="agent-token-list">
                {tokens.map((token) => (
                  <li key={token.id}>
                    <div>
                      <strong>{token.name}</strong>
                      <span>
                        {Date.parse(token.expires_at) <= now
                          ? "Expired"
                          : "Expires"}{" "}
                        {new Date(token.expires_at).toLocaleDateString(
                          undefined,
                          { year: "numeric", month: "short", day: "numeric" },
                        )}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      disabled={busy !== null}
                      aria-label={`Revoke ${token.name}`}
                      onClick={() =>
                        void run(token.id, async () => {
                          await api("/api/mcp-tokens", {
                            method: "DELETE",
                            body: JSON.stringify({ id: token.id }),
                          });
                          setTokens((items) =>
                            items.filter((item) => item.id !== token.id),
                          );
                          if (issued?.id === token.id) setIssued(null);
                          setMessage(`${token.name} access revoked.`);
                        })
                      }
                    >
                      {busy === token.id ? "Revoking…" : "Revoke"}
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="agent-empty">
                No agents connected yet. Create a token to get started.
              </p>
            ))}
        </div>
      </section>

      <section className="agent-section" aria-labelledby="agent-taste-heading">
        <div className="agent-section-intro">
          <h2 id="agent-taste-heading">Your design preferences</h2>
          <p>
            Tell agents what you like, what to avoid, and when those preferences
            apply. Your favorite references and their notes provide examples.
          </p>
        </div>
        <form
          className="agent-section-body"
          onSubmit={(e) => {
            e.preventDefault();
            void run("taste", async () => {
              const result = await api<Taste>("/api/taste-profile", {
                method: "PUT",
                body: JSON.stringify({ preferences }),
              });
              setPreferences(result.preferences);
              setSavedPreferences(result.preferences);
              setMessage("Design preferences saved.");
            });
          }}
        >
          <label className="agent-field">
            What should your agent know?
            <textarea
              aria-label="What should your agent know?"
              rows={7}
              maxLength={5000}
              value={preferences}
              disabled={!ready || busy !== null}
              onChange={(e) => setPreferences(e.target.value)}
              placeholder="For dashboards, I prefer compact layouts, clear typography, and restrained motion. For portfolios, I like larger type and more expressive layouts."
            />
          </label>
          <div className="agent-actions">
            <Button
              disabled={
                !ready || busy !== null || preferences === savedPreferences
              }
            >
              {busy === "taste" ? "Saving…" : "Save preferences"}
            </Button>
            <span className="inline-hint">
              {preferences.length.toLocaleString()} / 5,000
            </span>
          </div>
        </form>
      </section>

      <section className="agent-section" aria-labelledby="agent-tools-heading">
        <div className="agent-section-intro">
          <h2 id="agent-tools-heading">Start with a reference</h2>
          <p>Once connected, try asking your agent:</p>
        </div>
        <div className="agent-section-body agent-examples">
          <p>“Find dashboard references in my Tabd library.”</p>
          <p>
            “Use my portfolio collection and design preferences to plan this
            page.”
          </p>
          <p className="inline-hint">
            Agents can search your library, fetch references and collections,
            read your preferences, and assemble design context. Previews are
            saved site images; component capture is coming separately.
          </p>
        </div>
      </section>
    </main>
  );
}
