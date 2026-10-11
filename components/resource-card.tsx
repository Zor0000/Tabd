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
    title?: string;
    description?: string;
    preview_image_url?: string;
    favicon_url?: string;
  } | null>(null);
  const enriched = details?.url === r.url ? details : null;
  const title =
    r.title === r.hostname
      ? curated?.title || enriched?.title || r.title
      : r.title;
  const description =
    r.description || curated?.description || enriched?.description;
  const image =
    curated?.image || r.preview_image_url || enriched?.preview_image_url;
  const art = image?.startsWith("preview:") ? image.slice(8) : curated?.art;
  const favicon = r.favicon_url || enriched?.favicon_url;
  const [failedImage, setFailedImage] = useState<string>();
  const card = useRef<HTMLElement>(null);
  useEffect(() => {
    if (
      curated ||
      r.preview_image_url?.startsWith("preview:") ||
      (r.preview_image_url && r.description)
    )
      return;
    const controller = new AbortController();
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        void fetch("/api/metadata", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: r.url }),
          signal: controller.signal,
        })
          .then(async (response) => {
            if (response.ok)
              setDetails({ ...(await response.json()), url: r.url });
          })
          .catch(() => {
            /* Keep the local preview when a website is unavailable. */
          });
      },
      { rootMargin: "200px" },
    );
    if (card.current) observer.observe(card.current);
    return () => {
      observer.disconnect();
      controller.abort();
    };
  }, [curated, r.url, r.preview_image_url, r.description]);
  const [faviconBroken, setFaviconBroken] = useState(false);
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
        ) : image && failedImage !== image ? (
          <div
            className={`website-capture ${curated?.image ? "is-curated" : ""}`}
          >
            <div className="preview-browser" aria-hidden="true">
              <i />
              <i />
              <i />
              <span>{r.hostname.replace(/^www\./, "")}</span>
            </div>
            <img
              src={image}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setFailedImage(image)}
            />
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
            {favicon && !faviconBroken ? (
              <img
                src={favicon}
                alt=""
                width={18}
                height={18}
                referrerPolicy="no-referrer"
                onError={() => setFaviconBroken(true)}
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
