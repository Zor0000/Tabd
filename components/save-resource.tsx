"use client";
import { useEffect, useRef, useState } from "react";
import { normalizeUrl } from "@/lib/url";
import { useForm } from "react-hook-form";
import { Link2, ChevronDown, Loader2, ArrowRight } from "lucide-react";
import { Sheet } from "./ui/dialog";
import { Button } from "./ui/button";
import {
  statuses,
  type Collection,
  type Resource,
  type ResourceInput,
} from "@/lib/types";
const initial: ResourceInput = {
  url: "",
  title: "",
  description: "",
  collection_id: null,
  tags: [],
  personal_note: "",
  status: "To Explore",
  favicon_url: null,
  preview_image_url: null,
};
export function SaveResource({
  open,
  onClose,
  collections,
  resource,
  onSave,
  defaultCollection,
}: {
  open: boolean;
  onClose: () => void;
  collections: Collection[];
  resource: Resource | null;
  onSave: (input: ResourceInput, id?: string) => Promise<void>;
  defaultCollection: string | null;
}) {
  const { register, handleSubmit, setValue, getValues } =
    useForm<ResourceInput>({
      defaultValues: resource
        ? { ...resource }
        : { ...initial, collection_id: defaultCollection },
    });
  const submitted = useRef(false);
  const [expanded, setExpanded] = useState(Boolean(resource));
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [message, setMessage] = useState("");
  const [metadataMessage, setMetadataMessage] = useState("");
  const [duplicate, setDuplicate] = useState<Resource | null>(null);
  const generated = useRef<Partial<ResourceInput>>(
    resource?.metadata_snapshot || {},
  );
  const metadataSource = useRef(resource?.url || "");
  const metadataRequest = useRef<{
    url: string;
    promise: Promise<void>;
  } | null>(null);
  const metadataController = useRef<AbortController | null>(null);
  useEffect(() => () => metadataController.current?.abort(), []);
  function resetGenerated(url: string) {
    let changed = metadataSource.current !== url;
    try {
      changed = normalizeUrl(metadataSource.current) !== normalizeUrl(url);
    } catch {
      /* Empty/new URLs have no prior metadata. */
    }
    if (metadataSource.current && changed) {
      for (const key of [
        "title",
        "description",
        "favicon_url",
        "preview_image_url",
      ] as const) {
        if (getValues(key) === generated.current[key])
          setValue(key, key.endsWith("_url") ? null : "");
      }
      generated.current = {};
    }
    metadataSource.current = url;
  }
  function metadata() {
    const url = getValues("url").trim();
    if (metadataRequest.current?.url === url)
      return metadataRequest.current.promise;
    if (resource && url === resource.url) return Promise.resolve();
    const promise = fetchMetadata();
    metadataRequest.current = { url: getValues("url").trim(), promise };
    return promise;
  }
  async function fetchMetadata() {
    let url = getValues("url").trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      url = "https://" + url;
      setValue("url", url);
    }
    resetGenerated(url);
    metadataController.current?.abort();
    const controller = new AbortController();
    metadataController.current = controller;
    setFetching(true);
    setMetadataMessage("");
    try {
      const response = await fetch("/api/metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
        signal: controller.signal,
      });
      const data = await response.json();
      if (controller.signal.aborted || getValues("url").trim() !== url) return;
      if (!response.ok) {
        if (!submitted.current) setMetadataMessage(data.error);
        return;
      }
      if (data.warning && !submitted.current) setMetadataMessage(data.warning);
      else {
        for (const key of [
          "title",
          "description",
          "favicon_url",
          "preview_image_url",
        ] as const) {
          if (!getValues(key) && data[key]) {
            setValue(key, data[key]);
            generated.current[key] = data[key];
          }
        }
      }
    } catch {
      if (controller.signal.aborted) return;
      setMetadataMessage(
        "Could not retrieve the preview. You can still save the URL.",
      );
    } finally {
      if (metadataController.current === controller) {
        setFetching(false);
        metadataRequest.current = null;
      }
    }
  }
  async function submit(input: ResourceInput) {
    submitted.current = true;
    setLoading(true);
    setMessage("");
    resetGenerated(getValues("url").trim());
    try {
      // Save immediately; the server persists and retries enrichment afterward.
      await onSave(
        { ...input, ...getValues(), metadata_snapshot: generated.current },
        resource?.id,
      );
      onClose();
    } catch (e) {
      const err = e as Error & { existing?: Resource };
      setMessage(err.message);
      if (err.existing) setDuplicate(err.existing);
    } finally {
      setLoading(false);
    }
  }
  return (
    <Sheet
      open={open}
      onOpenChange={(value) => !value && onClose()}
      title={resource ? "Edit resource" : "Save something good."}
      description={
        resource
          ? "Keep the useful details close at hand."
          : "One less tab. One more thing worth keeping."
      }
    >
      <form
        onSubmit={(event) => void handleSubmit(submit)(event)}
        className="sheet-form"
      >
        <label>
          Website URL <span className="required-label">Required</span>
          <div className="url-input">
            <Link2 size={17} />
            <input
              autoFocus
              type="url"
              placeholder="https://a-website-you-love.com"
              {...register("url", { required: true })}
              onBlur={metadata}
              required
            />
          </div>
        </label>
        <p className="metadata-hint" role="status">
          {fetching ? (
            <>
              <Loader2 size={14} className="spin" />
              Finding the details…
            </>
          ) : (
            metadataMessage ||
            "We’ll look up the details. You can save right away."
          )}
        </p>
        <label>
          Collection
          <select
            {...register("collection_id", { setValueAs: (v) => v || null })}
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
          type="button"
          className="optional-toggle"
          onClick={() => setExpanded(!expanded)}
        >
          Add details <span>Optional</span>
          <ChevronDown size={15} className={expanded ? "rotated" : ""} />
        </button>
        {expanded && (
          <div className="optional-fields">
            <label>
              Title
              <input
                {...register("title")}
                placeholder="A name to remember"
                maxLength={300}
              />
            </label>
            <label>
              Description
              <textarea
                {...register("description")}
                placeholder="What makes this useful?"
                rows={2}
                maxLength={2000}
              />
            </label>
            <label>
              Status
              <select {...register("status")}>
                {statuses.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label>
              Tags
              <input
                defaultValue={resource?.tags.join(", ") || ""}
                placeholder="react, inspiration, tools"
                onChange={(e) =>
                  setValue("tags", [
                    ...new Set(
                      e.target.value
                        .split(",")
                        .map((t) => t.trim())
                        .filter(Boolean),
                    ),
                  ])
                }
              />
              <small>Separate tags with commas.</small>
            </label>
            <label>
              Personal note
              <textarea
                rows={3}
                maxLength={5000}
                placeholder="A little context for your future self…"
                {...register("personal_note")}
              />
            </label>
          </div>
        )}
        {message && (
          <div className="form-message" role="status">
            {message}
          </div>
        )}
        {duplicate && (
          <div className="duplicate-notice">
            <strong>{duplicate.title}</strong>
            <p>Update the existing resource with these details?</p>
            <Button
              type="button"
              variant="secondary"
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                try {
                  await onSave(getValues(), duplicate.id);
                  onClose();
                } catch (e) {
                  setMessage((e as Error).message);
                } finally {
                  setLoading(false);
                }
              }}
            >
              Update existing resource
            </Button>
          </div>
        )}
        <div className="sheet-actions">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={loading} type="submit">
            {loading ? <Loader2 size={16} className="spin" /> : null}
            {resource ? "Save changes" : "Save resource"}
            <ArrowRight size={16} />
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
