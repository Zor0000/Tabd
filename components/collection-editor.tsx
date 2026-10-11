"use client";
import { useState } from "react";
import { Sheet } from "./ui/dialog";
import { Button } from "./ui/button";
import type { Collection } from "@/lib/types";
export function CollectionEditor({
  open,
  onClose,
  collection,
  collections,
  onSave,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  collection: Collection | null;
  collections: Collection[];
  onSave: (
    values: { name: string; parent_id: string | null; color: string },
    id?: string,
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [name, setName] = useState(collection?.name || "");
  const [parent, setParent] = useState(collection?.parent_id || "");
  const [color, setColor] = useState(collection?.color || "violet");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Sheet
      open={open}
      onOpenChange={(v) => !v && onClose()}
      title={collection ? "Edit collection" : "Make a little space."}
      description="A home for things that belong together."
    >
      <form
        className="sheet-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await onSave(
              { name, parent_id: parent || null, color },
              collection?.id,
            );
            onClose();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Name
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. UI Components"
            required
            maxLength={60}
          />
        </label>
        <label>
          Parent collection
          <select value={parent} onChange={(e) => setParent(e.target.value)}>
            <option value="">None — top-level collection</option>
            {collections
              .filter((c) => c.id !== collection?.id)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        </label>
        <label>
          Color
          <select value={color} onChange={(e) => setColor(e.target.value)}>
            {["violet", "blue", "green", "orange", "pink"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        {error && (
          <p className="form-message" role="alert">
            {error}
          </p>
        )}
        <div className="sheet-actions">
          <Button disabled={busy} type="submit">
            {busy
              ? "Saving…"
              : collection
                ? "Save changes"
                : "Create collection"}
          </Button>
        </div>
        {collection && (
          <div className="delete-collection">
            <h3>Delete collection</h3>
            <p>
              Its resources move to Inbox. Subcollections become top-level
              collections.
            </p>
            <Button
              variant="danger"
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await onDelete(collection.id);
                  onClose();
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Delete collection
            </Button>
          </div>
        )}
      </form>
    </Sheet>
  );
}
