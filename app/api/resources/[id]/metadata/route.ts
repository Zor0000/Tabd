import { z } from "zod";
import { actor, ApiError, failure, json } from "@/lib/api";
import { recoverResourceMetadata } from "@/lib/resource-metadata";
export const runtime = "nodejs";
export const maxDuration = 30;
export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const { db, userId } = await actor(request);
    const { id } = await ctx.params;
    if (!z.uuid().safeParse(id).success)
      throw new ApiError("Resource not found.", 404);
    return json(await recoverResourceMetadata(db, userId, id));
  } catch (error) {
    return failure(error);
  }
}
