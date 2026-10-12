import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { browser } from "wxt/browser";
import "./style.css";

const appUrl = import.meta.env.WXT_APP_URL || "http://localhost:3000";
type Collection = { id: string; name: string; parent_id?: string | null };
type Fields = {
  title: string;
  collection_id: string;
  status: string;
  tags: string;
  personal_note: string;
};
type ExistingResource = {
  id: string;
  title: string;
  collection_id: string | null;
  status: string;
  tags: string[];
  personal_note: string;
};
const emptyFields: Fields = {
  title: "",
  collection_id: "",
  status: "To Explore",
  tags: "",
  personal_note: "",
};

function Icon({
  name,
}: {
  name: "arrow" | "check" | "plus" | "chevron" | "bookmark" | "globe";
}) {
  const paths = {
    arrow: "M7 17 17 7M7 7h10v10",
    check: "m5 12 4 4L19 6",
    plus: "M12 5v14M5 12h14",
    chevron: "m6 9 6 6 6-6",
    bookmark: "M6 4h12v17l-6-4-6 4Z",
    globe:
      "M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
  };
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}

function collectionLabel(collection: Collection, collections: Collection[]) {
  const names = [collection.name];
  const visited = new Set([collection.id]);
  let parent = collections.find((item) => item.id === collection.parent_id);
  while (parent && !visited.has(parent.id)) {
    names.unshift(parent.name);
    visited.add(parent.id);
    parent = collections.find((item) => item.id === parent?.parent_id);
  }
  return names.join(" / ");
}

function Popup() {
  const [token, setToken] = useState("");
  const [fields, setFields] = useState<Fields>(emptyFields);
  const [url, setUrl] = useState("");
  const [favicon, setFavicon] = useState<string | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [details, setDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [duplicate, setDuplicate] = useState<ExistingResource | null>(null);
  const [attempt, setAttempt] = useState(0);
  const edited = useRef(new Set<keyof Fields>());
  const submitting = useRef(false);
  const successHeading = useRef<HTMLHeadingElement>(null);
  const content = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setLoadFailed(false);
      setError("");
      try {
        const [stored, [tab]] = await Promise.all([
          browser.storage.local.get(["tabdToken", "tabdCollection"]),
          browser.tabs.query({ active: true, currentWindow: true }),
        ]);
        if (cancelled) return;
        setUrl(tab?.url || "");
        setFavicon(
          tab?.favIconUrl?.startsWith("https:") ? tab.favIconUrl : null,
        );
        setFields((current) => ({
          ...current,
          title: edited.current.has("title")
            ? current.title
            : (tab?.title || "").slice(0, 300),
          collection_id: edited.current.has("collection_id")
            ? current.collection_id
            : typeof stored.tabdCollection === "string"
              ? stored.tabdCollection
              : "",
        }));
        const storedToken =
          typeof stored.tabdToken === "string" ? stored.tabdToken : "";
        setToken(storedToken);
        if (!storedToken) return;
        const response = await fetch(`${appUrl}/api/collections`, {
          headers: { Authorization: `Bearer ${storedToken}` },
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(15000),
          ]),
        });
        if (cancelled) return;
        if (response.status === 401) {
          await browser.storage.local.remove("tabdToken");
          setToken("");
          setError(
            "Your connection has expired. Connect again to keep saving.",
          );
          return;
        }
        if (!response.ok) throw new Error("collections");
        const data: Collection[] = await response.json();
        if (!Array.isArray(data)) throw new Error("collections");
        if (cancelled) return;
        setCollections(data);
        setFields((current) => ({
          ...current,
          collection_id: data.some((item) => item.id === current.collection_id)
            ? current.collection_id
            : "",
        }));
      } catch {
        if (!cancelled) {
          setLoadFailed(true);
          setError(
            "Couldn’t load your library. Check your connection and try again.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [attempt]);

  useEffect(() => {
    if (saved) {
      content.current?.scrollTo({ top: 0 });
      successHeading.current?.focus();
    }
  }, [saved]);

  function change<K extends keyof Fields>(key: K, value: Fields[K]) {
    edited.current.add(key);
    setFields((current) => ({ ...current, [key]: value }));
  }

  let hostname = "";
  try {
    const pageUrl = new URL(url);
    if (
      ["http:", "https:"].includes(pageUrl.protocol) &&
      !pageUrl.username &&
      !pageUrl.password
    )
      hostname = pageUrl.hostname;
  } catch {
    /* Restricted tabs may not expose a URL. */
  }
  const destination = collections.find(
    (item) => item.id === fields.collection_id,
  );
  const destinationLabel = destination
    ? collectionLabel(destination, collections)
    : "Inbox";

  async function connect() {
    setConnecting(true);
    setError("");
    try {
      await browser.tabs.create({
        url: `${appUrl}/connect?extension=${browser.runtime.id}`,
      });
      window.close();
    } catch {
      setError("Couldn’t open Tabd. Try connecting again.");
    } finally {
      setConnecting(false);
    }
  }

  async function save() {
    if (submitting.current || !hostname || !token || loadFailed) return;
    const tags = [
      ...new Set(
        fields.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      ),
    ];
    if (tags.length > 20 || tags.some((tag) => tag.length > 40)) {
      setDetails(true);
      setError("Use up to 20 tags, with 40 characters or fewer in each.");
      return;
    }
    submitting.current = true;
    setSaving(true);
    setError("");
    try {
      const values = {
        ...fields,
        title: fields.title.trim(),
        collection_id: fields.collection_id || null,
        tags,
      };
      // On an existing save, only send fields the user actually changed.
      const payload = duplicate
        ? Object.fromEntries(
            Object.entries(values).filter(([key]) =>
              edited.current.has(key as keyof Fields),
            ),
          )
        : { ...values, url, favicon_url: favicon };
      const response = await fetch(
        `${appUrl}/api/resources${duplicate ? "/" + encodeURIComponent(duplicate.id) : ""}`,
        {
          method: duplicate ? "PATCH" : "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(15000),
        },
      );
      if (response.status === 401) {
        await browser.storage.local.remove("tabdToken");
        setToken("");
        setError("Your connection has expired. Connect again to keep saving.");
        return;
      }
      const data = await response.json();
      if (response.status === 409 && data.existing) {
        const existing: ExistingResource = data.existing;
        setDuplicate(existing);
        const previous: Fields = {
          title: existing.title,
          collection_id: existing.collection_id || "",
          status: existing.status,
          tags: existing.tags.join(", "),
          personal_note: existing.personal_note || "",
        };
        setFields(
          (current) =>
            Object.fromEntries(
              Object.entries(previous).map(([key, value]) => [
                key,
                edited.current.has(key as keyof Fields)
                  ? current[key as keyof Fields]
                  : value,
              ]),
            ) as Fields,
        );
        return;
      }
      if (!response.ok)
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "Couldn’t save this page. Please try again.",
        );
      setSaved(true);
      // Remembering a preference must not turn a successful server save into an error.
      await browser.storage.local
        .set({ tabdCollection: fields.collection_id })
        .catch(() => {});
    } catch (cause) {
      const networkError =
        cause instanceof TypeError ||
        cause instanceof SyntaxError ||
        (cause instanceof DOMException &&
          ["TimeoutError", "AbortError"].includes(cause.name));
      setError(
        networkError
          ? "Couldn’t confirm the save. Check your connection and try again."
          : cause instanceof Error
            ? cause.message
            : "Couldn’t save this page. Please try again.",
      );
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  async function disconnect() {
    try {
      await browser.storage.local.remove("tabdToken");
      setToken("");
      setSaved(false);
      setDuplicate(null);
      setLoadFailed(false);
      setDetails(false);
      setError("");
      setFields(emptyFields);
      edited.current.clear();
    } catch {
      setError("Couldn’t disconnect. Please try again.");
    }
  }

  return (
    <main>
      <header>
        <span className="logo" aria-label="Tabd">
          tabd<span>.</span>
        </span>
        <a
          className="library-link"
          href={appUrl}
          target="_blank"
          rel="noreferrer"
        >
          Library <Icon name="arrow" />
        </a>
      </header>
      <div className="content" ref={content}>
        {loading ? (
          <div
            className="loading"
            role="status"
            aria-label="Loading your library"
          >
            <span className="skeleton skeleton-heading" />
            <span className="skeleton skeleton-preview" />
            <span className="skeleton skeleton-field" />
            <p>Getting your library ready…</p>
          </div>
        ) : loadFailed ? (
          <section className="intro">
            <h1>Your library is out of reach.</h1>
            <p>Your saved pages are still in Tabd. Try loading it again.</p>
          </section>
        ) : !token ? (
          <section className="intro">
            <div className="intro-mark">
              <Icon name="bookmark" />
            </div>
            <h1>Good finds belong here.</h1>
            <p>
              Connect your account to save websites straight to your library.
            </p>
          </section>
        ) : saved ? (
          <section className="success" role="status">
            <div className="success-mark">
              <Icon name="check" />
            </div>
            <h1 ref={successHeading} tabIndex={-1}>
              {duplicate ? "Changes saved." : "A good find, kept."}
            </h1>
            <p className="saved-title">{fields.title || hostname}</p>
            <p className="saved-destination">
              Saved to <strong>{destinationLabel}</strong>
            </p>
          </section>
        ) : !hostname ? (
          <section className="intro">
            <div className="intro-mark">
              <Icon name="globe" />
            </div>
            <h1>This page can’t be saved.</h1>
            <p>Open a website, then click Tabd to keep it in your library.</p>
          </section>
        ) : (
          <form
            id="save-form"
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
          >
            <h1>Save to your library</h1>
            <div className="site">
              <div className="favicon">
                {favicon ? (
                  <img
                    src={favicon}
                    width="22"
                    height="22"
                    alt=""
                    referrerPolicy="no-referrer"
                    onError={() => setFavicon(null)}
                  />
                ) : (
                  <Icon name="globe" />
                )}
              </div>
              <div className="site-copy">
                <strong title={fields.title || hostname}>
                  {fields.title || hostname}
                </strong>
                <span>{hostname.replace(/^www\./, "")}</span>
              </div>
            </div>
            {duplicate && (
              <p className="notice" role="status">
                Already in your library. Review your details and save any
                changes.
              </p>
            )}
            <fieldset disabled={saving}>
              <label htmlFor="collection">Save to</label>
              <div className="select-wrap">
                <select
                  id="collection"
                  value={fields.collection_id}
                  onChange={(event) =>
                    change("collection_id", event.target.value)
                  }
                >
                  <option value="">Inbox</option>
                  {[...collections]
                    .sort((a, b) =>
                      collectionLabel(a, collections).localeCompare(
                        collectionLabel(b, collections),
                      ),
                    )
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {collectionLabel(item, collections)}
                      </option>
                    ))}
                </select>
                <Icon name="chevron" />
              </div>
              {!fields.collection_id && (
                <p className="field-hint">
                  A place to keep things. Organize later.
                </p>
              )}
              <button
                className="details-toggle"
                type="button"
                aria-expanded={details}
                aria-controls="save-details"
                onClick={() => setDetails(!details)}
              >
                <Icon name={details ? "chevron" : "plus"} />
                {details ? "Hide details" : "Add details"}
                <span>Optional</span>
              </button>
              <div id="save-details" className="details" hidden={!details}>
                <label htmlFor="title">Title</label>
                <input
                  id="title"
                  value={fields.title}
                  onChange={(event) => change("title", event.target.value)}
                  maxLength={300}
                />
                <label htmlFor="status">Status</label>
                <div className="select-wrap">
                  <select
                    id="status"
                    value={fields.status}
                    onChange={(event) => change("status", event.target.value)}
                  >
                    {["To Explore", "In Use", "Reference"].map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                  <Icon name="chevron" />
                </div>
                <label htmlFor="tags">Tags</label>
                <input
                  id="tags"
                  value={fields.tags}
                  onChange={(event) => change("tags", event.target.value)}
                  placeholder="design, tools, inspiration"
                  aria-describedby="tags-hint"
                />
                <p id="tags-hint" className="field-hint">
                  Separate with commas.
                </p>
                <label htmlFor="note">Personal note</label>
                <textarea
                  id="note"
                  value={fields.personal_note}
                  onChange={(event) =>
                    change("personal_note", event.target.value)
                  }
                  placeholder="Why is this worth keeping?"
                  maxLength={5000}
                  rows={3}
                />
              </div>
            </fieldset>
          </form>
        )}
      </div>
      <div className="actions">
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {!loading &&
          (loadFailed ? (
            <button
              className="primary"
              onClick={() => setAttempt((value) => value + 1)}
            >
              Try again
            </button>
          ) : !token ? (
            <button
              className="primary"
              disabled={connecting}
              onClick={() => void connect()}
            >
              {connecting ? "Opening Tabd…" : "Connect to Tabd"}
              <Icon name="arrow" />
            </button>
          ) : saved ? (
            <button className="secondary" onClick={() => window.close()}>
              Done <Icon name="check" />
            </button>
          ) : hostname ? (
            <button
              className="primary"
              type="submit"
              form="save-form"
              disabled={saving}
              aria-busy={saving}
            >
              {saving ? "Saving…" : duplicate ? "Save changes" : "Save page"}
              {saving ? (
                <span className="spinner" aria-hidden="true" />
              ) : (
                <Icon name="bookmark" />
              )}
            </button>
          ) : null)}
        {token && !loading && (
          <footer>
            <span>Connected to Tabd</span>
            <button disabled={saving} onClick={() => void disconnect()}>
              Disconnect
            </button>
          </footer>
        )}
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<Popup />);
