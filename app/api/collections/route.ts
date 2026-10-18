import { monitored } from "@/lib/monitoring";
import {
  actor,
  body,
  failure,
  json,
  ApiError,
  ownedCollection,
} from "@/lib/api";
import { collectionSchema } from "@/lib/validation";
async function handleGET(request: Request) {
  try {
    const { db, userId } = await actor(request);
    const { data, error } = await db
      .from("collections")
      .select("*")
      .eq("user_id", userId)
      .order("created_at");
    if (error) throw error;
    return json(data);
  } catch (e) {
    return failure(e);
  }
}
async function handlePOST(request: Request) {
  try {
    const { db, userId } = await actor(request);
    const parsed = collectionSchema.safeParse(await body(request));
    if (!parsed.success) throw new ApiError(parsed.error.issues[0].message);
    await ownedCollection(db, userId, parsed.data.parent_id);
    const { data, error } = await db
      .from("collections")
      .insert({ ...parsed.data, user_id: userId })
      .select()
      .single();
    if (error)
      throw new ApiError(
        "Could not create collection. Check the name and nesting depth.",
      );
    return json(data, 201);
  } catch (e) {
    return failure(e);
  }
}

export const GET = monitored("GET /api/collections", handleGET);
export const POST = monitored("POST /api/collections", handlePOST);
