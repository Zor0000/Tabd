import { limitActor, RateLimitError } from "./rate-limit";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { serverClient } from "./supabase/server";
export class ApiError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export async function actor(request: Request) {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  )
    throw new ApiError("Connect Supabase to use your personal library.", 503);
  const bearer = request.headers.get("authorization");
  if (bearer !== null) {
    if (!process.env.SUPABASE_SECRET_KEY)
      throw new ApiError("Extension access is not configured.", 503);
    const match = /^Bearer +(tabd_[a-f0-9]{64})$/i.exec(bearer);
    if (!match)
      throw new ApiError("Reconnect the extension to your account.", 401);
    const token = match[1];
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SECRET_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data, error } = await db
      .from("extension_tokens")
      .select("user_id")
      .eq("token_hash", createHash("sha256").update(token).digest("hex"))
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (error)
      throw new ApiError("Extension access is temporarily unavailable.", 503);
    if (!data)
      throw new ApiError(
        "Extension link expired. Reconnect your account.",
        401,
      );
    await limitActor(request, data.user_id as string);
    return { db, userId: data.user_id as string, extension: true };
  }
  if (!["GET", "HEAD"].includes(request.method)) {
    const origin = request.headers.get("origin");
    // Next.js may build request.url from the bind address or proxy hostname.
    // Use the configured browser-facing origin when available.
    const appOrigin = new URL(process.env.NEXT_PUBLIC_APP_URL || request.url)
      .origin;
    if (origin && origin !== appOrigin)
      throw new ApiError("Invalid request origin.", 403);
  }
  const db = await serverClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) throw new ApiError("Please sign in to continue.", 401);
  await limitActor(request, user.id);
  return { db, userId: user.id, extension: false };
}
export function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}
export function failure(error: unknown) {
  if (error instanceof RateLimitError) {
    const response = json({ error: error.message }, error.status);
    response.headers.set("Retry-After", String(error.retryAfter));
    return response;
  }
  if (error instanceof ApiError)
    return json({ error: error.message }, error.status);
  return json({ error: "Something went wrong. Please try again." }, 500);
}
export async function body(request: Request): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError("Request body is required.");
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 20000) {
        await reader.cancel();
        throw new ApiError("Request is too large.", 413);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const text = Buffer.concat(chunks).toString("utf8");
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError("Invalid JSON.");
  }
}
export async function ownedCollection(
  db: Awaited<ReturnType<typeof actor>>["db"],
  userId: string,
  id: string | null | undefined,
) {
  if (!id) return;
  const { data, error } = await db
    .from("collections")
    .select("id")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new ApiError("Collection not found.", 404);
}
