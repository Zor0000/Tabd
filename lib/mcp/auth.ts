import { enforceLimit } from "../rate-limit";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { actor, ApiError } from "../api";

export function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function checkMcpOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const allowed = new URL(process.env.NEXT_PUBLIC_APP_URL || request.url)
    .origin;
  if (origin && origin !== allowed)
    throw new ApiError("Invalid request origin.", 403);
}

/** Account settings can only be managed with a verified browser session. */
export async function dashboardActor(request: Request) {
  if (request.headers.has("authorization"))
    throw new ApiError("Manage agent access from the dashboard.", 403);
  return actor(request);
}

/** No cookie fallback and no extension credentials on the MCP endpoint. */
export async function mcpActor(request: Request) {
  checkMcpOrigin(request);
  const match = /^Bearer (tabd_mcp_[a-f0-9]{64})$/i.exec(
    request.headers.get("authorization") || "",
  );
  if (!match)
    throw new ApiError("Connect with a Tabd agent token from /agents.", 401);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new ApiError("Agent access is not configured.", 503);
  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await db
    .from("mcp_tokens")
    .select("user_id")
    .eq("token_hash", tokenHash(match[1]))
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (error)
    throw new ApiError(
      "Agent access is unavailable. Check the MCP database migration.",
      503,
    );
  if (!data)
    throw new ApiError(
      "Agent token expired or revoked. Create a new token in /agents.",
      401,
    );
  await enforceLimit(data.user_id as string, "mcp");
  return { db, userId: data.user_id as string };
}
