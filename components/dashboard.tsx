"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  ArrowDownWideNarrow,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  Download,
  Folder,
  Grid2X2,
  Inbox,
  Layers,
  List,
  LogOut,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Star,
  X,
  Puzzle,
  Sun,
  Moon,
} from "lucide-react";
import { motion } from "motion/react";
import { ResourceCard } from "./resource-card";
import { SaveResource } from "./save-resource";
import { CollectionEditor } from "./collection-editor";
import { Sheet } from "./ui/dialog";
import { Button } from "./ui/button";
import { browserClient } from "@/lib/supabase/client";
import type { Collection, Resource, ResourceInput, Status } from "@/lib/types";
import { statuses } from "@/lib/types";
import { previewCollections, previewResources } from "@/lib/preview";
type Scope =
  "all" | "inbox" | "favorites" | "recent" | "opened" | "archived" | string;
async function api<T>(
  path: string,
  method = "GET",
  values?: unknown,
): Promise<T> {
  const response = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(values ? { body: JSON.stringify(values) } : {}),
  });
  const data = await response.json();
  if (!response.ok)
    throw Object.assign(
      new Error(data.error || "Could not complete this request."),
      { existing: data.existing },
    );
  return data;
}
async function loadResources(
  query = "",
  signal?: AbortSignal,
): Promise<Resource[]> {
  const all: Resource[] = [];
  for (let page = 0; ; page++) {
    const response = await fetch(
      `/api/resources?page=${page}&q=${encodeURIComponent(query)}`,
      { signal },
    );
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.error || "Your library could not load.");
    all.push(...data);
    if (data.length < 500) return all;
  }
}
export function Dashboard({
  preview = false,
  email,
  displayName,
}: {
  preview?: boolean;
  email?: string;
  displayName?: string;
}) {
  const router = useRouter();
  const [now] = useState(() => Date.now());
  const [resources, setResources] = useState<Resource[]>(
    preview ? previewResources : [],
  );
  const [collections, setCollections] = useState<Collection[]>(
    preview ? previewCollections : [],
  );
  const [loading, setLoading] = useState(!preview);
  const [error, setError] = useState("");
  const [scope, setScope] = useState<Scope>("all");
  const [status, setStatus] = useState<Status | "All">("All");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{
    query: string;
    resources: Resource[];
  } | null>(null);
  const [profileName, setProfileName] = useState(displayName || "");
  const [profileBusy, setProfileBusy] = useState(false);
  const [sort, setSort] = useState("newest");
  const [date, setDate] = useState("all");
  const [filters, setFilters] = useState(false);
  const [view, setView] = useState("grid");
  const [theme, setTheme] = useState("light");
  const [defaultCollection, setDefaultCollection] = useState("");
  const [saveOpen, setSaveOpen] = useState(false);
  const [editing, setEditing] = useState<Resource | null>(null);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(
    null,
  );
  const [settings, setSettings] = useState(false);
  const [extensionInfo, setExtensionInfo] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [toast, setToast] = useState("");
  const [deleting, setDeleting] = useState<Resource | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notify = useCallback((message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 4200);
  }, []);
  const refresh = useCallback(async () => {
    if (preview) return;
    setError("");
    try {
      const [r, c] = await Promise.all([
        loadResources(),
        api<Collection[]>("/api/collections"),
      ]);
      setResources(r);
      setCollections(c);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [preview]);
  useEffect(() => {
    // Initial fetch synchronizes the component with the external account database.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    const focus = () => void refresh();
    window.addEventListener("focus", focus);
    return () => window.removeEventListener("focus", focus);
  }, [refresh]);
  useEffect(() => {
    // Browser preferences are read after hydration to preserve the server-rendered markup.
    /* eslint-disable react-hooks/set-state-in-effect */
    const storedView = localStorage.getItem("tabd-view");
    if (storedView === "list") setView("list");
    const storedTheme = localStorage.getItem("tabd-theme") || "light";
    setTheme(storedTheme);
    document.documentElement.dataset.theme = storedTheme;
    setDefaultCollection(localStorage.getItem("tabd-default-collection") || "");
    const key = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape") setMobile(false);
    };
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("keydown", key);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (preview || !query.trim()) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      loadResources(query.trim(), controller.signal)
        .then((resources) => setSearchResults({ query, resources }))
        .catch((error) => {
          if (error.name !== "AbortError") notify(error.message);
        });
    }, 180);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, preview, notify]);
  const changeView = (value: string) => {
    setView(value);
    localStorage.setItem("tabd-view", value);
  };
  function changeTheme(value: string) {
    setTheme(value);
    document.documentElement.dataset.theme = value;
    localStorage.setItem("tabd-theme", value);
  }
  function guard() {
    if (preview)
      throw new Error(
        "This is the preview library. Connect Supabase and sign in to save your own resources.",
      );
  }
  async function save(input: ResourceInput, id?: string) {
    guard();
    const saved = await api<Resource>(
      id ? `/api/resources/${id}` : "/api/resources",
      id ? "PATCH" : "POST",
      input,
    );
    setResources((previous) =>
      id
        ? previous.map((r) => (r.id === id ? saved : r))
        : [saved, ...previous],
    );
    setQuery("");
    notify(id ? "Resource updated" : "Saved to your library");
  }
  async function update(id: string, values: Partial<Resource>) {
    try {
      guard();
      const saved = await api<Resource>(
        `/api/resources/${id}`,
        "PATCH",
        values,
      );
      setResources((previous) =>
        previous.map((r) => (r.id === id ? saved : r)),
      );
      setSearchResults(null);
      notify("Resource updated");
    } catch (e) {
      notify((e as Error).message);
    }
  }
  async function openResource(r: Resource) {
    if (preview) return;
    try {
      const saved = await api<Resource>(`/api/resources/${r.id}`, "PATCH", {
        action: "open",
      });
      setResources((previous) =>
        previous.map((item) => (item.id === r.id ? saved : item)),
      );
    } catch {
      notify("Website opened, but the visit could not be recorded.");
    }
  }
  async function saveCollection(
    values: { name: string; parent_id: string | null; color: string },
    id?: string,
  ) {
    guard();
    const saved = await api<Collection>(
      id ? `/api/collections/${id}` : "/api/collections",
      id ? "PATCH" : "POST",
      values,
    );
    setCollections((previous) =>
      id
        ? previous.map((c) => (c.id === id ? saved : c))
        : [...previous, saved],
    );
    notify(id ? "Collection updated" : "Collection created");
  }
  async function deleteCollection(id: string) {
    guard();
    await api(`/api/collections/${id}`, "DELETE");
    if (scope === id) setScope("inbox");
    await refresh();
    notify("Collection deleted. Resources moved to Inbox.");
  }
  const active = resources.filter((r) => !r.is_archived);
  const selectedCollection = collections.find((c) => c.id === scope);
  const counts = {
    all: active.length,
    inbox: active.filter((r) => !r.collection_id).length,
    favorites: active.filter((r) => r.is_favorite).length,
    archived: resources.filter((r) => r.is_archived).length,
  };
  const filtered = useMemo(() => {
    const text = query.toLowerCase().trim();
    const fromServer =
      !preview && searchResults?.query === query && Boolean(query.trim());
    return (fromServer ? searchResults!.resources : resources)
      .filter((r) => {
        if (scope === "archived" ? !r.is_archived : r.is_archived) return false;
        if (scope === "inbox" && r.collection_id) return false;
        if (scope === "favorites" && !r.is_favorite) return false;
        if (scope === "recent" && now - Date.parse(r.created_at) > 7 * 86400000)
          return false;
        if (scope === "opened" && !r.last_opened_at) return false;
        if (
          ![
            "all",
            "inbox",
            "favorites",
            "recent",
            "opened",
            "archived",
          ].includes(scope) &&
          r.collection_id !== scope
        )
          return false;
        if (status !== "All" && r.status !== status) return false;
        if (
          date !== "all" &&
          now - Date.parse(r.created_at) > Number(date) * 86400000
        )
          return false;
        return (
          !text ||
          fromServer ||
          [r.title, r.description, r.hostname, r.personal_note, ...r.tags]
            .join(" ")
            .toLowerCase()
            .includes(text)
        );
      })
      .sort((a, b) =>
        sort === "az"
          ? a.title.localeCompare(b.title)
          : sort === "oldest"
            ? Date.parse(a.created_at) - Date.parse(b.created_at)
            : sort === "opened"
              ? Date.parse(b.last_opened_at || "1970-01-01") -
                Date.parse(a.last_opened_at || "1970-01-01")
              : Date.parse(b.created_at) - Date.parse(a.created_at),
      );
  }, [
    resources,
    scope,
    status,
    query,
    date,
    sort,
    now,
    preview,
    searchResults,
  ]);
  const revisit = active.find(
    (r) =>
      r.status === "To Explore" &&
      !r.open_count &&
      now - Date.parse(r.created_at) > 7 * 86400000 &&
      !dismissed.includes(r.id),
  );
  const heading =
    selectedCollection?.name ||
    (
      {
        all: "Your little corner of the web.",
        inbox: "Room for new discoveries.",
        favorites: "The ones you keep coming back to.",
        recent: "Fresh finds.",
        opened: "Right where you left off.",
        archived: "Kept, just out of the way.",
      } as Record<string, string>
    )[scope];
  const sectionName =
    selectedCollection?.name ||
    (
      {
        all: "All resources",
        inbox: "Inbox",
        favorites: "Favorites",
        recent: "Recently added",
        opened: "Recently opened",
        archived: "Archived",
      } as Record<string, string>
    )[scope];
  function navigate(value: string) {
    setScope(value);
    setStatus("All");
    setMobile(false);
  }
  function collectionRows(parent: string | null, depth = 0): React.ReactNode {
    return collections
      .filter((c) => c.parent_id === parent)
      .map((c) => (
        <div key={c.id}>
          <button
            className={`nav-item collection-nav ${scope === c.id ? "active" : ""}`}
            style={
              {
                "--collection-indent": `${12 + depth * 15}px`,
              } as React.CSSProperties
            }
            onClick={() => navigate(c.id)}
          >
            <Folder size={16} className={`color-${c.color}`} />
            <span>{c.name}</span>
            <small>
              {active.filter((r) => r.collection_id === c.id).length}
            </small>
          </button>
          {depth < 3 ? collectionRows(c.id, depth + 1) : null}
        </div>
      ));
  }
  function exportLibrary() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            version: 1,
            exported_at: new Date().toISOString(),
            collections,
            resources,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tabd-${preview ? "preview-" : ""}library.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify("Library exported as JSON");
  }
  return (
    <div className="app-shell">
      {mobile && (
        <button
          className="mobile-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={`sidebar ${mobile ? "sidebar-open" : ""}`}>
        <Link className="brand" href="/" aria-label="Tabd home">
          <span className="brand-symbol">
            <i />
            <i />
            <i />
          </span>
          tabd<span className="brand-period">.</span>
        </Link>
        <button className="workspace-switch" onClick={() => setSettings(true)}>
          <span className="workspace-avatar">
            {preview ? "P" : (displayName || email || "M")[0].toUpperCase()}
          </span>
          <span>
            Personal workspace
            <small>{preview ? "Preview library" : "Just for you"}</small>
          </span>
          <ChevronDown size={14} />
        </button>
        <nav aria-label="Library navigation">
          <span className="nav-heading">WORKSPACE</span>
          <button
            className={`nav-item ${scope === "all" ? "active" : ""}`}
            onClick={() => navigate("all")}
          >
            <Layers size={17} />
            <span>All resources</span>
            <small>{counts.all}</small>
          </button>
          <button
            className={`nav-item ${scope === "inbox" ? "active" : ""}`}
            onClick={() => navigate("inbox")}
          >
            <Inbox size={17} />
            <span>Inbox</span>
            <small>{counts.inbox}</small>
          </button>
          <button
            className={`nav-item ${scope === "favorites" ? "active" : ""}`}
            onClick={() => navigate("favorites")}
          >
            <Star size={17} />
            <span>Favorites</span>
            <small>{counts.favorites}</small>
          </button>
          <button
            className={`nav-item ${scope === "recent" ? "active" : ""}`}
            onClick={() => navigate("recent")}
          >
            <Clock3 size={17} />
            <span>Recently added</span>
          </button>
          <button
            className={`nav-item ${scope === "opened" ? "active" : ""}`}
            onClick={() => navigate("opened")}
          >
            <BookOpen size={17} />
            <span>Recently opened</span>
          </button>
          <div className="nav-heading collection-heading">
            <span>COLLECTIONS</span>
            <button
              aria-label="Create collection"
              onClick={() => {
                setEditingCollection(null);
                setCollectionOpen(true);
              }}
            >
              <Plus size={15} />
            </button>
          </div>
          {collectionRows(null)}
          <button
            className="nav-item new-collection"
            onClick={() => {
              setEditingCollection(null);
              setCollectionOpen(true);
            }}
          >
            <Plus size={16} />
            <span>New collection</span>
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="extension-callout">
            <span className="extension-puzzle">
              <Puzzle size={19} />
            </span>
            <h3>A good find? Tabd.</h3>
            <p>Save from anywhere with the Chrome extension.</p>
            <button onClick={() => setExtensionInfo(true)}>
              Get the extension <ArrowUpRight size={14} />
            </button>
          </div>
          <button
            className={`nav-item ${scope === "archived" ? "active" : ""}`}
            onClick={() => navigate("archived")}
          >
            <Archive size={16} />
            <span>Archived</span>
            {counts.archived > 0 && <small>{counts.archived}</small>}
          </button>
          <button className="nav-item" onClick={() => setSettings(true)}>
            <Settings2 size={16} />
            <span>Settings</span>
          </button>
          <div className="sidebar-foot">
            <span className="tiny-brand">tabd</span>
            <span>Less searching. More doing.</span>
          </div>
        </div>
      </aside>
      <div className="main-column" inert={mobile}>
        <header className="topbar">
          <button
            className="button button-ghost button-icon mobile-menu"
            aria-label="Open navigation"
            onClick={() => setMobile(true)}
          >
            <Menu size={19} />
          </button>
          <div className="breadcrumb">
            <span>My library</span>
            <ChevronRight size={13} />
            <strong>{sectionName}</strong>
          </div>
          <div className="topbar-actions">
            <div className="search-field">
              <Search size={16} />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search your library…"
                aria-label="Search your library"
              />
              <kbd>⌘ K</kbd>
              {query && (
                <button aria-label="Clear search" onClick={() => setQuery("")}>
                  <X size={13} />
                </button>
              )}
            </div>
            <Button
              size="sm"
              aria-label="Add resource"
              onClick={() => {
                setEditing(null);
                setSaveOpen(true);
              }}
            >
              <Plus size={16} />
              <span>Add resource</span>
            </Button>
            <button
              className="profile-avatar"
              aria-label="Account settings"
              onClick={() => setSettings(true)}
            >
              {preview ? "P" : (displayName || email || "M")[0].toUpperCase()}
            </button>
          </div>
        </header>
        <main className="workspace-main">
          <div className="page-heading">
            <div>
              <h1>{heading}</h1>
              <p>
                {selectedCollection
                  ? "A collection of things worth keeping close."
                  : "Good things deserve a place. Save, organize, and make them yours."}
              </p>
            </div>
            {selectedCollection ? (
              <Button
                variant="secondary"
                size="icon"
                aria-label="Edit collection"
                onClick={() => {
                  setEditingCollection(selectedCollection);
                  setCollectionOpen(true);
                }}
              >
                <MoreHorizontal size={18} />
              </Button>
            ) : (
              <div className="today">
                <span className="today-dot" />
                Your next idea starts here
              </div>
            )}
          </div>
          {preview && (
            <div className="preview-banner">
              <span>
                <span className="preview-dot" />
                You’re exploring a preview library. Your own space starts empty.
              </span>
              <a href="/login">
                Set up your library <ArrowRight size={14} />
              </a>
            </div>
          )}
          <section className="library-stats" aria-label="Library overview">
            <div>
              <span>
                <Layers size={15} />
                Saved resources
              </span>
              <strong>
                {active.length}
                <small>A little less tab chaos</small>
              </strong>
            </div>
            <div>
              <span>
                <Folder size={15} />
                Collections
              </span>
              <strong>
                {collections.length}
                <small>Everything in its place</small>
              </strong>
            </div>
            <button
              onClick={() => {
                navigate("all");
                setStatus("To Explore");
              }}
            >
              <span>
                <span className="status-dot amber" />
                To explore
              </span>
              <strong>
                {active.filter((r) => r.status === "To Explore").length}
                <small>Something to come back to</small>
              </strong>
            </button>
            <button onClick={() => navigate("opened")}>
              <span>
                <Clock3 size={15} />
                Revisited this week
              </span>
              <strong>
                {
                  active.filter(
                    (r) =>
                      r.last_opened_at &&
                      now - Date.parse(r.last_opened_at) < 7 * 86400000,
                  ).length
                }
                <small>Put your finds to work</small>
              </strong>
            </button>
          </section>
          {revisit && scope === "all" && !query && (
            <div className="revisit-strip">
              <div className="revisit-icon">
                <Sparkles size={19} />
              </div>
              <div>
                <strong>A good find, waiting for a second look.</strong>
                <p>
                  You saved <b>{revisit.title}</b> a while ago. Ready to
                  explore?
                </p>
              </div>
              <a
                href={revisit.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => openResource(revisit)}
              >
                Take a look <ArrowUpRight size={14} />
              </a>
              <button
                aria-label="Dismiss revisit suggestion"
                onClick={() => setDismissed([...dismissed, revisit.id])}
              >
                <X size={15} />
              </button>
            </div>
          )}
          <section className="resources-section" aria-label={sectionName}>
            <div className="section-heading">
              <h2>
                {query ? "Search results" : sectionName}
                <span>{filtered.length}</span>
              </h2>
              <div className="section-actions">
                <label className="sort-select">
                  <ArrowDownWideNarrow size={15} />
                  <select
                    aria-label="Sort resources"
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                  >
                    <option value="newest">Newest first</option>
                    <option value="oldest">Oldest first</option>
                    <option value="az">Alphabetically</option>
                    <option value="opened">Recently opened</option>
                  </select>
                  <ChevronDown size={12} />
                </label>
                <div className="view-toggle">
                  <button
                    title="Grid view"
                    aria-label="Grid view"
                    aria-pressed={view === "grid"}
                    className={view === "grid" ? "selected" : ""}
                    onClick={() => changeView("grid")}
                  >
                    <Grid2X2 size={16} />
                  </button>
                  <button
                    title="List view"
                    aria-label="List view"
                    aria-pressed={view === "list"}
                    className={view === "list" ? "selected" : ""}
                    onClick={() => changeView("list")}
                  >
                    <List size={17} />
                  </button>
                </div>
              </div>
            </div>
            <div className="filter-bar">
              <div
                className="status-tabs"
                role="group"
                aria-label="Filter by status"
              >
                {(["All", ...statuses] as const).map((s) => (
                  <button
                    key={s}
                    className={status === s ? "selected" : ""}
                    aria-pressed={status === s}
                    onClick={() => setStatus(s)}
                  >
                    {s !== "All" && (
                      <span
                        className={`status-dot ${s === "To Explore" ? "amber" : s === "In Use" ? "green" : "reference-dot"}`}
                      />
                    )}
                    <span>{s === "All" ? "All resources" : s}</span>
                  </button>
                ))}
              </div>
              <button
                className={`filter-button ${filters ? "selected" : ""}`}
                onClick={() => setFilters(!filters)}
                aria-expanded={filters}
              >
                <SlidersHorizontal size={14} />
                Filters
                {date !== "all" && <span className="filter-active-dot" />}
              </button>
            </div>
            {filters && (
              <div className="additional-filters">
                <label>
                  Date added
                  <select
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  >
                    <option value="all">Any time</option>
                    <option value="7">Past week</option>
                    <option value="30">Past month</option>
                    <option value="90">Past 3 months</option>
                  </select>
                </label>
                <button
                  onClick={() => {
                    setDate("all");
                    setStatus("All");
                    setQuery("");
                  }}
                >
                  Clear filters
                </button>
              </div>
            )}
            {error ? (
              <div className="empty-state">
                <Inbox size={32} />
                <h3>Your library couldn’t load.</h3>
                <p>{error}</p>
                <Button variant="secondary" onClick={() => void refresh()}>
                  Try again
                </Button>
              </div>
            ) : loading ? (
              <div className="resources-grid">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="skeleton-card" />
                ))}
              </div>
            ) : filtered.length ? (
              <motion.div
                initial={{ opacity: 0.8, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`resources-grid ${view === "list" ? "resources-list" : ""}`}
              >
                {filtered.map((r) => (
                  <ResourceCard
                    key={r.id}
                    resource={r}
                    collection={collections.find(
                      (c) => c.id === r.collection_id,
                    )}
                    onUpdate={update}
                    onEdit={(r) => {
                      setEditing(r);
                      setSaveOpen(true);
                    }}
                    onDelete={setDeleting}
                    onOpen={openResource}
                  />
                ))}
              </motion.div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">
                  {query ? <Search size={28} /> : <BookOpen size={28} />}
                </div>
                <h3>
                  {query
                    ? "No finds this time."
                    : "A little space for your next good find."}
                </h3>
                <p>
                  {query
                    ? "Try a title, website, tag, or a word from your notes."
                    : "Save a useful link, and start making this space yours."}
                </p>
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (query) {
                      setQuery("");
                      setStatus("All");
                      setDate("all");
                    } else {
                      setEditing(null);
                      setSaveOpen(true);
                    }
                  }}
                >
                  {query ? "Clear search" : "Save your first resource"}
                  <Plus size={15} />
                </Button>
              </div>
            )}
            <div className="library-footer">
              <span>
                {filtered.length}{" "}
                {filtered.length === 1 ? "resource" : "resources"} · A library
                that grows with you.
              </span>
              <span>
                <span className="keycap">⌘</span>
                <span className="keycap">K</span> to find anything
              </span>
            </div>
          </section>
        </main>
      </div>
      {saveOpen && (
        <SaveResource
          open={saveOpen}
          onClose={() => setSaveOpen(false)}
          collections={collections}
          resource={editing}
          onSave={save}
          defaultCollection={
            selectedCollection?.id ||
            (collections.some((c) => c.id === defaultCollection)
              ? defaultCollection
              : null)
          }
        />
      )}
      {collectionOpen && (
        <CollectionEditor
          open={collectionOpen}
          onClose={() => setCollectionOpen(false)}
          collection={editingCollection}
          collections={collections}
          onSave={saveCollection}
          onDelete={deleteCollection}
        />
      )}
      <Sheet
        open={settings}
        onOpenChange={setSettings}
        title="Your space, your way."
        description="A few preferences to make Tabd feel like home."
      >
        <div className="sheet-form">
          <div className="account-block">
            <span className="profile-avatar">
              {preview ? "P" : (email || "M")[0].toUpperCase()}
            </span>
            <div>
              <strong>{displayName || "Personal workspace"}</strong>
              <p>{preview ? "Preview mode · no account connected" : email}</p>
            </div>
          </div>
          {!preview && (
            <form
              className="profile-form"
              onSubmit={async (event) => {
                event.preventDefault();
                setProfileBusy(true);
                try {
                  const client = browserClient();
                  const { error } = await client.auth.updateUser({
                    data: { display_name: profileName.trim() },
                  });
                  if (error) throw error;
                  notify("Profile updated");
                  router.refresh();
                } catch (error) {
                  notify((error as Error).message);
                } finally {
                  setProfileBusy(false);
                }
              }}
            >
              <label>
                Display name
                <input
                  value={profileName}
                  maxLength={80}
                  onChange={(event) => setProfileName(event.target.value)}
                  placeholder="Your name"
                />
              </label>
              <Button type="submit" variant="secondary" disabled={profileBusy}>
                {profileBusy ? "Saving…" : "Save profile"}
              </Button>
            </form>
          )}
          <label>
            Appearance
            <div className="theme-options">
              <Button
                variant={theme === "light" ? "default" : "secondary"}
                onClick={() => changeTheme("light")}
              >
                <Sun size={16} />
                Light
              </Button>
              <Button
                variant={theme === "dark" ? "default" : "secondary"}
                onClick={() => changeTheme("dark")}
              >
                <Moon size={16} />
                Dark
              </Button>
            </div>
          </label>
          <label>
            Default resource view
            <select value={view} onChange={(e) => changeView(e.target.value)}>
              <option value="grid">Visual grid</option>
              <option value="list">Compact list</option>
            </select>
          </label>
          <label>
            Default save collection
            <select
              value={defaultCollection}
              onChange={(e) => {
                setDefaultCollection(e.target.value);
                localStorage.setItem("tabd-default-collection", e.target.value);
              }}
            >
              <option value="">Inbox</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <p className="inline-hint">
            Preferences are remembered in this browser.
          </p>
          <div className="settings-divider" />
          <h3>Your library is yours.</h3>
          <p className="settings-copy">
            Take your resources, collections, tags, and notes with you.
          </p>
          <Button variant="secondary" onClick={exportLibrary}>
            <Download size={16} />
            Export library as JSON
          </Button>
          <Button variant="secondary" onClick={() => setExtensionInfo(true)}>
            <Puzzle size={16} />
            Set up Chrome extension
          </Button>
          {!preview && (
            <>
              <Button
                variant="secondary"
                onClick={async () => {
                  try {
                    await api("/api/extension-token", "DELETE");
                    notify("All extension links revoked");
                  } catch (e) {
                    notify((e as Error).message);
                  }
                }}
              >
                Revoke extension access
              </Button>
              <Button
                variant="ghost"
                onClick={async () => {
                  const { error } = await browserClient().auth.signOut();
                  if (error) notify(error.message);
                  else {
                    router.push("/login");
                    router.refresh();
                  }
                }}
              >
                <LogOut size={16} />
                Sign out
              </Button>
            </>
          )}
          {preview && (
            <Button asChild>
              <a href="/login">
                Set up your account <ArrowRight size={16} />
              </a>
            </Button>
          )}
        </div>
      </Sheet>
      <Sheet
        open={extensionInfo}
        onOpenChange={setExtensionInfo}
        title="A good find? Tabd."
        description="Keep the web’s useful things without breaking your flow."
      >
        <div className="sheet-form">
          <div className="extension-explainer">
            <Puzzle size={36} />
            <h3>Click. Choose. Saved.</h3>
            <p>The local Chrome extension is included in this project.</p>
          </div>
          <ol className="setup-steps">
            <li>
              From the extension folder, run <code>npm install</code> then{" "}
              <code>npm run build</code>.
            </li>
            <li>
              Open <code>chrome://extensions</code>, enable Developer mode, then
              choose Load unpacked.
            </li>
            <li>
              Select <code>extension/.output/chrome-mv3</code>.
            </li>
            <li>
              Add the extension ID to <code>NEXT_PUBLIC_EXTENSION_IDS</code>,
              restart the dashboard, then click “Connect to Tabd” in the
              extension.
            </li>
          </ol>
          <p className="form-message">
            A configured Supabase project and a signed-in web account are
            required. Full setup instructions are in the project README.
          </p>
        </div>
      </Sheet>
      <Sheet
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        title="Delete this resource?"
        description="This permanently removes the resource and its notes."
      >
        <div className="sheet-form">
          <strong>{deleting?.title}</strong>
          <p>{deleting?.hostname}</p>
          <div className="sheet-actions">
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              Keep resource
            </Button>
            <Button
              variant="danger"
              disabled={deleteBusy}
              onClick={async () => {
                if (!deleting) return;
                setDeleteBusy(true);
                try {
                  guard();
                  await api(`/api/resources/${deleting.id}`, "DELETE");
                  setResources((prev) =>
                    prev.filter((r) => r.id !== deleting.id),
                  );
                  setDeleting(null);
                  notify("Resource deleted");
                } catch (e) {
                  notify((e as Error).message);
                } finally {
                  setDeleteBusy(false);
                }
              }}
            >
              {deleteBusy ? "Deleting…" : "Delete resource"}
            </Button>
          </div>
        </div>
      </Sheet>
      {toast && (
        <div className="toast" role="status">
          <Check size={16} />
          <span>{toast}</span>
          <button
            onClick={() => setToast("")}
            aria-label="Dismiss notification"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
