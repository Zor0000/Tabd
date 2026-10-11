import { randomBytes, createHash } from "node:crypto";
import { actor, failure, json, ApiError } from "@/lib/api";
export async function POST(request: Request) {
  try {
    const { db, userId, extension } = await actor(request);
    if (extension) throw new ApiError("Link from the dashboard.", 403);
    const token = "tabd_" + randomBytes(32).toString("hex");
    const { error } = await db
      .from("extension_tokens")
      .insert({
        user_id: userId,
        token_hash: createHash("sha256").update(token).digest("hex"),
        expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
      });
    if (error) throw error;
    return json({ token });
  } catch (e) {
    return failure(e);
  }
}
export async function DELETE(request: Request) {
  try {
    const { db, userId, extension } = await actor(request);
    if (extension) throw new ApiError("Revoke links from the dashboard.", 403);
    const { error } = await db
      .from("extension_tokens")
      .delete()
      .eq("user_id", userId);
    if (error) throw error;
    return json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
