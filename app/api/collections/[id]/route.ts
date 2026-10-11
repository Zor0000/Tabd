import {
  actor,
  body,
  failure,
  json,
  ApiError,
  ownedCollection,
} from "@/lib/api";
import { collectionPatch } from "@/lib/validation";
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, ctx: Context) {
  try {
    const { db, userId } = await actor(request);
    const { id } = await ctx.params;
    const parsed = collectionPatch.safeParse(await body(request));
    if (!parsed.success) throw new ApiError(parsed.error.issues[0].message);
    await ownedCollection(db, userId, parsed.data.parent_id);
    const { data, error } = await db
      .from("collections")
      .update(parsed.data)
      .eq("id", id)
      .eq("user_id", userId)
      .select()
      .maybeSingle();
    if (error)
      throw new ApiError(
        "Could not update collection. Check for duplicate names or invalid nesting.",
      );
    if (!data) throw new ApiError("Collection not found.", 404);
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
      .from("collections")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (error) throw error;
    return json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
