import { monitored } from "@/lib/monitoring";
import { RateLimitError } from "@/lib/rate-limit";
import { z } from "zod";
import { actor, ApiError, failure } from "@/lib/api";
import { persistedCapture } from "@/lib/preview-storage";

export const runtime = "nodejs";
export const maxDuration = 60;

async function handleGET(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { db, userId } = await actor(request);
    const { id } = await ctx.params;
    if (!z.uuid().safeParse(id).success)
      throw new ApiError("Resource not found.", 404);
    const { data, error } = await db
      .from("bookmarks")
      .select("url")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new ApiError("Resource not found.", 404);
    try {
      const image = await persistedCapture(db, userId, id, data.url);
      return new Response(new Uint8Array(image), {
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    } catch (error) {
      if (error instanceof RateLimitError) throw error;
      throw new ApiError("Landing-page preview unavailable.", 502);
    }
  } catch (error) {
    return failure(error);
  }
}

export const GET = monitored("GET /api/resources/[id]/preview", handleGET);
