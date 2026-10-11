import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { browser } from "wxt/browser";
import "./style.css";
const appUrl = import.meta.env.WXT_APP_URL || "http://localhost:3000";
type Collection = { id: string; name: string };
function Popup() {
  const [token, setToken] = useState("");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [favicon, setFavicon] = useState<string | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collection, setCollection] = useState("");
  const [status, setStatus] = useState("To Explore");
  const [tags, setTags] = useState("");
  const [note, setNote] = useState("");
  const [details, setDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [duplicate, setDuplicate] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      try {
        const stored = await browser.storage.local.get([
          "tabdToken",
          "tabdCollection",
        ]);
        if (typeof stored.tabdCollection === "string")
          setCollection(stored.tabdCollection);
        const [tab] = await browser.tabs.query({
          active: true,
          currentWindow: true,
        });
        setTitle(tab?.title || "");
        setUrl(tab?.url || "");
        setFavicon(
          tab?.favIconUrl?.startsWith("https:") ? tab.favIconUrl : null,
        );
        if (typeof stored.tabdToken === "string") {
          setToken(stored.tabdToken);
          const response = await fetch(`${appUrl}/api/collections`, {
            headers: { Authorization: `Bearer ${stored.tabdToken}` },
          });
          const data = await response.json();
          if (!response.ok) {
            if (response.status === 401) {
              await browser.storage.local.remove("tabdToken");
              setToken("");
            }
            throw new Error(data.error);
          }
          setCollections(data);
          if (!data.some((c: Collection) => c.id === stored.tabdCollection))
            setCollection("");
        }
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);
  async function save(update = false) {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(
        `${appUrl}/api/resources${update && duplicate ? "/" + duplicate : ""}`,
        {
          method: update ? "PATCH" : "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url,
            title,
            collection_id: collection || null,
            status,
            tags: [
              ...new Set(
                tags
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean),
              ),
            ],
            personal_note: note,
            favicon_url: favicon,
          }),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        if (data.existing) setDuplicate(data.existing.id);
        throw new Error(data.error);
      }
      await browser.storage.local.set({ tabdCollection: collection });
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }
  const valid = /^https?:\/\//.test(url);
  return (
    <main>
      <header>
        <a href={appUrl} target="_blank" rel="noreferrer" className="logo">
          tabd<span>.</span>
        </a>
        <span>Your personal web library</span>
      </header>
      {loading ? (
        <p className="message">Getting your library ready…</p>
      ) : !token ? (
        <section className="intro">
          <h1>Good finds belong here.</h1>
          <p>Connect your account to save websites straight to your library.</p>
          <button
            className="primary"
            onClick={() =>
              browser.tabs.create({
                url: `${appUrl}/connect?extension=${browser.runtime.id}`,
              })
            }
          >
            Connect to Tabd
          </button>
        </section>
      ) : saved ? (
        <section className="intro">
          <div className="success-mark">✓</div>
          <h1>A good find, kept.</h1>
          <p>{title} is in your library.</p>
          <a className="primary" href={appUrl} target="_blank" rel="noreferrer">
            Open your library
          </a>
        </section>
      ) : (
        <>
          <h1>Save to your library</h1>
          <div className="site">
            <div className="favicon">
              {favicon ? (
                <img
                  src={favicon}
                  width={20}
                  height={20}
                  alt=""
                  referrerPolicy="no-referrer"
                  onError={() => setFavicon(null)}
                />
              ) : (
                title.slice(0, 1)
              )}
            </div>
            <div>
              <strong>{title}</strong>
              <small>
                {valid ? new URL(url).hostname : "This page cannot be saved"}
              </small>
            </div>
          </div>
          <label>
            Collection
            <select
              value={collection}
              onChange={(e) => setCollection(e.target.value)}
            >
              <option value="">Inbox — organize later</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <button
            className="details-toggle"
            onClick={() => setDetails(!details)}
          >
            {details ? "Hide details" : "Add details"}
            <span>Optional</span>
          </button>
          {details && (
            <div className="details">
              <label>
                Title
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={300}
                />
              </label>
              <label>
                Status
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  {["To Explore", "In Use", "Reference"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
              <label>
                Tags
                <input
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="react, tools, inspiration"
                />
              </label>
              <label>
                Personal note
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Why is this worth keeping?"
                  maxLength={5000}
                />
              </label>
            </div>
          )}
          <button
            className="primary"
            disabled={!valid || saving}
            onClick={() => save()}
          >
            {saving ? "Saving…" : "Save resource"}
          </button>
          {duplicate && (
            <button
              className="secondary"
              disabled={saving}
              onClick={() => save(true)}
            >
              Update existing resource
            </button>
          )}
        </>
      )}
      {error && (
        <p className="message error" role="alert">
          {error}
        </p>
      )}
      <footer>
        <a href={appUrl} target="_blank" rel="noreferrer">
          Open dashboard ↗
        </a>
        {token && (
          <button
            onClick={async () => {
              await browser.storage.local.remove("tabdToken");
              setToken("");
              setSaved(false);
            }}
          >
            Disconnect
          </button>
        )}
      </footer>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<Popup />);
