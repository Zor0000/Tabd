export const statuses = ["To Explore", "In Use", "Reference"] as const;
export type Status = (typeof statuses)[number];
export type Collection = {
  id: string;
  name: string;
  parent_id: string | null;
  color: string;
  created_at: string;
};
export type Resource = {
  id: string;
  url: string;
  normalized_url: string;
  title: string;
  description: string;
  hostname: string;
  favicon_url: string | null;
  preview_image_url: string | null;
  collection_id: string | null;
  tags: string[];
  personal_note: string;
  status: Status;
  is_favorite: boolean;
  is_archived: boolean;
  open_count: number;
  last_opened_at: string | null;
  created_at: string;
  updated_at: string;
  metadata_status?: "pending" | "fetching" | "ready" | "retry" | "blocked";
  metadata_attempts?: number;
  metadata_next_retry_at?: string | null;
  metadata_checked_at?: string | null;
  metadata_snapshot?: Partial<
    Pick<
      Resource,
      "title" | "description" | "favicon_url" | "preview_image_url"
    >
  >;
};
export type ResourceInput = Pick<
  Resource,
  | "url"
  | "title"
  | "description"
  | "collection_id"
  | "tags"
  | "personal_note"
  | "status"
  | "favicon_url"
  | "preview_image_url"
> & { metadata_snapshot?: Resource["metadata_snapshot"] };
