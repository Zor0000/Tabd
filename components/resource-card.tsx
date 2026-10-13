"use client";
import * as Dropdown from "@radix-ui/react-dropdown-menu";
import {
  ArrowUpRight,
  Archive,
  ArchiveRestore,
  MoreHorizontal,
  Pencil,
  Star,
  Trash2,
  Folder,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { sitePreview } from "@/lib/site-previews";
import type { Resource, Collection, Status } from "@/lib/types";
import { statuses } from "@/lib/types";
import { PreviewArt } from "./preview-art";
export function ResourceCard({
  resource: r,
  collection,
  onUpdate,
  onEdit,
  onDelete,
  onOpen,
}: {
  resource: Resource;
  collection?: Collection;
  onUpdate: (id: string, values: Partial<Resource>) => Promise<void>;
  onEdit: (r: Resource) => void;
  onDelete: (r: Resource) => void;
  onOpen: (r: Resource) => void;
}) {
  const curated = sitePreview(r.url);
  const [details, setDetails] = useState<{
    url: string;
    updated_at?: string;
    metadata_status?: Resource["metadata_status"];
    title?: string;
    description?: string;
    preview_image_url?: string | null;
    favicon_url?: string | null;
  } | null>(null);
  const enriched =
    details?.url === r.url &&
    (!details.updated_at ||
      Date.parse(details.updated_at) >= Date.parse(r.updated_at))
      ? details
      : null;
  const title =
    r.title === r.hostname
      ? curated?.title || enriched?.title || r.title
      : r.title;
  const description =
    r.description || curated?.description || enriched?.description;
  const demoArt = r.preview_image_url?.startsWith("preview:")
    ? r.preview_image_url.slice(8)
    : undefined;
  const capture =
    !demoArt && (enriched?.metadata_status || r.metadata_status) !== "blocked"
      ? `/api/resources/${r.id}/preview?v=${encodeURIComponent(r.url)}`
      : undefined;
  const [failedImages, setFailedImages] = useState<string[]>([]);
  const [loadedImage, setLoadedImage] = useState<string>();
  const captureRetry = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const captureAttempts = useRef({ url: r.url, count: 0 });
  const image = [
    capture,
    curated?.image,
    r.preview_image_url,
    enriched?.preview_image_url,
  ].find(
    (source) =>
      source &&
      !source.startsWith("preview:") &&
      !failedImages.includes(source),
  );
  const art = image ? undefined : demoArt || curated?.art;
  useEffect(() => () => clearTimeout(captureRetry.current), [r.url, capture]);
  function imageFailed(source: string) {
    setFailedImages((failed) => [...failed, source]);
    if (source !== capture) return;
    if (captureAttempts.current.url !== r.url)
      captureAttempts.current = { url: r.url, count: 0 };
    const delay = Math.min(
      60000 * 2 ** Math.min(captureAttempts.current.count++, 5),
      1800000,
    );
    clearTimeout(captureRetry.current);
    captureRetry.current = setTimeout(
      () =>
        setFailedImages((failed) => failed.filter((value) => value !== source)),
      delay,
    );
  }
  const favicon = r.favicon_url || enriched?.favicon_url;
  const card = useRef<HTMLElement>(null);
  useEffect(() => {
    if (
      r.preview_image_url?.startsWith("preview:") ||
      r.metadata_status === "ready" ||
      r.metadata_status === "blocked"
    )
      return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let visible = false;
    let fetching = false;
    let stopped = false;
    const schedule = (retryAt?: string | null) => {
      if (!visible || stopped || controller.signal.aborted) return;
      const delay = Math.max(
        1000,
        retryAt ? Date.parse(retryAt) - Date.now() : 60000,
      );
      timer = setTimeout(() => void recover(), Math.min(delay, 86400000));
    };
    const recover = async () => {
      if (!visible || fetching || stopped) return;
      fetching = true;
      try {
        const response = await fetch(`/api/resources/${r.id}/metadata`, {
          method: "POST",
          signal: controller.signal,
        });
        if ([401, 403, 404].includes(response.status)) {
          stopped = true;
          return;
        }
        if (!response.ok) throw new Error("Metadata recovery unavailable");
        const data: Resource = await response.json();
        if (data.url !== r.url || controller.signal.aborted) return;
        setDetails(data);
        stopped =
          data.metadata_status === "blocked" ||
          data.metadata_status === "ready";
        schedule(data.metadata_next_retry_at);
      } catch {
        schedule(); // A later visit or reconnect can resume the persisted job.
      } finally {
        fetching = false;
      }
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        clearTimeout(timer);
        if (visible) void recover();
      },
      { rootMargin: "200px" },
    );
    const reconnect = () => {
      clearTimeout(timer);
      if (visible) {
        if (capture)
          setFailedImages((failed) =>
            failed.filter((value) => value !== capture),
          );
        void recover();
      }
    };
    if (card.current) observer.observe(card.current);
    window.addEventListener("online", reconnect);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("online", reconnect);
      observer.disconnect();
      controller.abort();
    };
  }, [r.id, r.url, r.preview_image_url, r.metadata_status, capture]);
  const [failedFavicon, setFailedFavicon] = useState<string>();
  const [pending, setPending] = useState(false);
  async function update(values: Partial<Resource>) {
    setPending(true);
    try {
      await onUpdate(r.id, values);
    } finally {
      setPending(false);
    }
  }
  return (
    <article className="resource-card" ref={card}>
      <a
        className="resource-preview"
        href={r.url}
        target="_blank"
        rel="noopener noreferrer"
        tabIndex={-1}
        aria-label={`Open ${r.title}`}
        onClick={() => onOpen(r)}
      >
        {art ? (
          <PreviewArt kind={art} />
        ) : image ? (
          <div
            className={`website-capture ${image === curated?.image || image === capture ? "is-curated" : ""}`}
          >
            <div className="preview-browser" aria-hidden="true">
              <i />
              <i />
              <i />
              <span>{r.hostname.replace(/^www\./, "")}</span>
            </div>
            <img
              key={image}
              src={image}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
              onLoad={() => {
                setLoadedImage(image);
                if (image === capture) {
                  captureAttempts.current.count = 0;
                  clearTimeout(captureRetry.current);
                }
              }}
              onError={() => imageFailed(image)}
            />
            {loadedImage !== image ? (
              <span className="preview-loading">Loading preview…</span>
            ) : null}
          </div>
        ) : (
          <div className="preview-editorial" aria-hidden="true">
            <span className="preview-domain">
              {r.hostname.replace(/^www\./, "")}
            </span>
            <strong>
              {title === r.hostname
                ? r.hostname.replace(/^www\./, "").split(".")[0]
                : title}
            </strong>
            <p>
              {description ||
                "Saved to your library. Ready for your next idea."}
            </p>
            <span className="preview-visit">
              Explore website <ArrowUpRight size={13} />
            </span>
          </div>
        )}
        <span className="open-indicator">
          <ArrowUpRight size={16} />
        </span>
      </a>
      <div className="resource-body">
        <div className="resource-title-row">
          <span className={`site-icon icon-${r.hostname.split(".")[0]}`}>
            {favicon && failedFavicon !== favicon ? (
              <img
                src={favicon}
                alt=""
                width={18}
                height={18}
                referrerPolicy="no-referrer"
                onError={() => setFailedFavicon(favicon)}
              />
            ) : (
              title.slice(0, 1)
            )}
          </span>
          <a
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onOpen(r)}
            className="resource-link"
          >
            <h3>{title}</h3>
            <span>{r.hostname}</span>
          </a>
          <button
            className={`favorite-button ${r.is_favorite ? "is-favorite" : ""}`}
            disabled={pending}
            onClick={() => update({ is_favorite: !r.is_favorite })}
            aria-label={`${r.is_favorite ? "Unfavorite" : "Favorite"} ${r.title}`}
          >
            <Star size={16} fill={r.is_favorite ? "currentColor" : "none"} />
          </button>
        </div>
        <p className="resource-description">
          {description || `Saved from ${r.hostname.replace(/^www\./, "")}.`}
        </p>
        <div className="resource-tags">
          {r.tags.slice(0, 3).map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      </div>
      <footer className="resource-footer">
        <span
          className={`collection-label color-${collection?.color || "neutral"}`}
        >
          <Folder size={12} />
          {collection?.name || "Inbox"}
        </span>
        <div className="resource-controls">
          <label
            className={`status-select status-${r.status.replaceAll(" ", "-").toLowerCase()}`}
          >
            <i />
            <select
              value={r.status}
              aria-label={`Status for ${r.title}`}
              disabled={pending}
              onChange={(e) => update({ status: e.target.value as Status })}
            >
              {statuses.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </label>
          <Dropdown.Root>
            <Dropdown.Trigger
              className="menu-trigger"
              aria-label={`Options for ${r.title}`}
            >
              <MoreHorizontal size={17} />
            </Dropdown.Trigger>
            <Dropdown.Portal>
              <Dropdown.Content
                className="dropdown-menu"
                align="end"
                sideOffset={6}
              >
                <Dropdown.Item onSelect={() => onEdit(r)}>
                  <Pencil size={14} />
                  Edit or move
                </Dropdown.Item>
                <Dropdown.Item
                  onSelect={() => update({ is_archived: !r.is_archived })}
                >
                  {r.is_archived ? (
                    <ArchiveRestore size={14} />
                  ) : (
                    <Archive size={14} />
                  )}{" "}
                  {r.is_archived ? "Restore to library" : "Archive resource"}
                </Dropdown.Item>
                <Dropdown.Separator />
                <Dropdown.Item
                  className="danger-text"
                  onSelect={() => onDelete(r)}
                >
                  <Trash2 size={14} />
                  Delete resource
                </Dropdown.Item>
                <Dropdown.Separator />
                <div className="menu-meta">
                  Saved{" "}
                  {new Date(r.created_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                  <br />
                  {r.open_count} opens through Tabd
                </div>
              </Dropdown.Content>
            </Dropdown.Portal>
          </Dropdown.Root>
        </div>
      </footer>
    </article>
  );
}
