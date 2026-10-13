import type { actor } from "./api";
import { ApiError } from "./api";
import { metadata } from "./metadata";
import { PublicFetchError } from "./public-fetch";
import type { Resource } from "./types";

type Database = Awaited<ReturnType<typeof actor>>["db"];
const delays = [60, 300, 1800, 21600, 86400];
export function nextMetadataRetry(
  attempt: number,
  retryAfter = 0,
  now = Date.now(),
) {
  if (Number.isNaN(retryAfter)) retryAfter = 0;
  const delay = Math.max(
    delays[Math.min(Math.max(attempt - 1, 0), delays.length - 1)] * 1000,
    Math.min(Math.max(retryAfter, 0), 86400000),
  );
  return new Date(now + delay).toISOString();
}

export async function recoverResourceMetadata(
  db: Database,
  userId: string,
  id: string,
) {
  const { data: resource, error } = await db
    .from("bookmarks")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!resource) throw new ApiError("Resource not found.", 404);
  if (
    resource.metadata_status === "blocked" ||
    resource.metadata_status === "ready" ||
    (resource.metadata_next_retry_at &&
      Date.parse(resource.metadata_next_retry_at) > Date.now())
  )
    return resource as Resource;
  const attempts = (resource.metadata_attempts || 0) + 1;
  const { data: claimed, error: claimError } = await db
    .from("bookmarks")
    .update({
      metadata_status: "fetching",
      metadata_attempts: attempts,
      metadata_next_retry_at: new Date(Date.now() + 90000).toISOString(),
    })
    .eq("id", id)
    .eq("user_id", userId)
    .eq("url", resource.url)
    .eq("metadata_attempts", resource.metadata_attempts)
    .lte("metadata_next_retry_at", new Date().toISOString())
    .select()
    .maybeSingle();
  if (claimError) throw claimError;
  if (!claimed) return resource as Resource;
  let fetched: Awaited<ReturnType<typeof metadata>>;
  try {
    fetched = await metadata(resource.url);
  } catch (error) {
    const blocked =
      error instanceof PublicFetchError && error.kind === "unsafe";
    const { data, error: saveError } = await db
      .from("bookmarks")
      .update({
        metadata_status: blocked ? "blocked" : "retry",
        metadata_checked_at: new Date().toISOString(),
        metadata_next_retry_at: blocked
          ? null
          : nextMetadataRetry(
              attempts,
              error instanceof PublicFetchError ? error.retryAfter : 0,
            ),
      })
      .eq("id", id)
      .eq("user_id", userId)
      .eq("url", resource.url)
      .eq("metadata_attempts", attempts)
      .select()
      .maybeSingle();
    if (saveError) throw saveError;
    return (data || resource) as Resource;
  }
  const { data, error: saveError } = await db.rpc(
    "complete_bookmark_metadata",
    {
      bookmark_id: id,
      owner_id: userId,
      expected_url: resource.url,
      expected_attempt: attempts,
      fetched_title: fetched.title,
      fetched_description: fetched.description,
      fetched_favicon: fetched.favicon_url,
      fetched_image: fetched.preview_image_url,
    },
  );
  if (saveError) throw saveError;
  return (data || resource) as Resource;
}
