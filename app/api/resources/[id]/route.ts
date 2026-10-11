import {
  actor,
  body,
  failure,
  json,
  ApiError,
  ownedCollection,
} from "@/lib/api";
import { resourcePatch, normalizeUrl } from "@/lib/validation";
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, ctx: Context) {
  try {
    const { db, userId } = await actor(request);
    const { id } = await ctx.params;
    const raw = await body(request);
    if (raw.action === "open") {
      const { data, error } = await db.rpc("record_open", {
        bookmark_id: id,
        owner_id: userId,
      });
      if (error) throw error;
      if (!data) throw new ApiError("Resource not found.", 404);
      return json(data);
    }
    const parsed = resourcePatch.safeParse(raw);
    if (!parsed.success) throw new ApiError(parsed.error.issues[0].message);
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
    return json(data);
  } catch (e) {
    return failure(e);
  }
}
export async function DELETE(request: Request, ctx: Context) {
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
