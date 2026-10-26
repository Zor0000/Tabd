import { monitored } from "@/lib/monitoring";
import { after } from "next/server";
import { recoverResourceMetadata } from "@/lib/resource-metadata";
import {
  actor,
  body,
  failure,
  json,
  ApiError,
  ownedCollection,
} from "@/lib/api";
import { resourceUpdateSchema, normalizeUrl } from "@/lib/validation";
type Context = { params: Promise<{ id: string }> };
async function handlePATCH(request: Request, ctx: Context) {
  try {
    const { db, userId } = await actor(request);
    const { id } = await ctx.params;
    const input = await body(request);
    // Older extension builds confirm unchanged duplicates with an empty PATCH.
    // Return the owned resource without running an UPDATE or changing timestamps.
    if (
      input !== null &&
      typeof input === "object" &&
      !Array.isArray(input) &&
      Object.keys(input).length === 0
    ) {
      const { data, error } = await db
        .from("bookmarks")
        .select("*")
        .eq("id", id)
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new ApiError("Resource not found.", 404);
      return json(data);
    }
    const parsed = resourceUpdateSchema.safeParse(input);
    if (!parsed.success) throw new ApiError(parsed.error.issues[0].message);
    if ("action" in parsed.data) {
      const { data, error } = await db.rpc("record_open", {
        bookmark_id: id,
        owner_id: userId,
      });
      if (error) throw error;
      if (!data) throw new ApiError("Resource not found.", 404);
      return json(data);
    }
    await ownedCollection(db, userId, parsed.data.collection_id);
    const values = {
      ...parsed.data,
      ...(parsed.data.url
        ? {
            hostname: new URL(parsed.data.url).hostname,
            normalized_url: normalizeUrl(parsed.data.url),
          }
        : {}),
    };
    const { data, error } = await db
      .from("bookmarks")
      .update(values)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .maybeSingle();
    if (error?.code === "23505")
      throw new ApiError("This URL is already saved.", 409);
    if (error) throw error;
    if (!data) throw new ApiError("Resource not found.", 404);
    if (parsed.data.url)
      after(() => recoverResourceMetadata(db, userId, id).catch(() => {}));
    return json(data);
  } catch (e) {
    return failure(e);
  }
}
async function handleDELETE(request: Request, ctx: Context) {
  try {
    const { db, userId } = await actor(request);
    const { id } = await ctx.params;
    const { error } = await db
      .from("bookmarks")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (error) throw error;
    return json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}

export const PATCH = monitored("PATCH /api/resources/[id]", handlePATCH);
export const DELETE = monitored("DELETE /api/resources/[id]", handleDELETE);
