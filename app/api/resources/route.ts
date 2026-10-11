import {
  actor,
  body,
  failure,
  json,
  ApiError,
  ownedCollection,
} from "@/lib/api";
import { resourceSchema, normalizeUrl } from "@/lib/validation";
export async function GET(request: Request) {
  try {
    const { db, userId } = await actor(request);
    const params = new URL(request.url).searchParams;
    let query = db
      .from("bookmarks")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    const q = params.get("q")?.trim();
    if (q)
      query = query.textSearch("search_document", q, {
        type: "websearch",
        config: "simple",
      });
    const page = Number(params.get("page") || 0);
    if (!Number.isInteger(page) || page < 0 || page > 10000)
      throw new ApiError("Invalid page.");
    const { data, error } = await query.range(page * 500, page * 500 + 499);
    if (error) throw error;
    return json(data);
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    const { db, userId } = await actor(request);
    const parsed = resourceSchema.safeParse(await body(request));
    if (!parsed.success) throw new ApiError(parsed.error.issues[0].message);
    const input = parsed.data;
    await ownedCollection(db, userId, input.collection_id);
    const { data, error } = await db
      .from("bookmarks")
      .insert({
        ...input,
        title: input.title || new URL(input.url).hostname,
        hostname: new URL(input.url).hostname,
        normalized_url: normalizeUrl(input.url),
        user_id: userId,
      })
      .select()
      .single();
    if (error?.code === "23505") {
      const { data: existing } = await db
        .from("bookmarks")
        .select("*")
        .eq("user_id", userId)
        .eq("normalized_url", normalizeUrl(input.url))
        .single();
      return json(
        { error: "This website is already in your library.", existing },
        409,
      );
    }
    if (error) throw error;
    return json(data, 201);
  } catch (e) {
    return failure(e);
  }
}
