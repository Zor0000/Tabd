import { monitored } from "@/lib/monitoring";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { ApiError, body, failure, json } from "@/lib/api";
import { dashboardActor, tokenHash } from "@/lib/mcp/auth";

async function handleGET(request: Request) {
  try {
    const { db, userId } = await dashboardActor(request);
    const { data, error } = await db
      .from("mcp_tokens")
      .select("id,name,created_at,expires_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return json(data);
  } catch (error) {
    return failure(error);
  }
}

async function handlePOST(request: Request) {
  try {
    const { db, userId } = await dashboardActor(request);
    if (!process.env.SUPABASE_SECRET_KEY)
      throw new ApiError("Agent access is not configured on the server.", 503);
    const input = z
      .object({ name: z.string().trim().min(1).max(60) })
      .strict()
      .safeParse(await body(request));
    if (!input.success)
      throw new ApiError("Enter an agent name between 1 and 60 characters.");
    const token = "tabd_mcp_" + randomBytes(32).toString("hex");
    const { data, error } = await db
      .from("mcp_tokens")
      .insert({
        user_id: userId,
        name: input.data.name,
        token_hash: tokenHash(token),
      })
      .select("id,name,created_at,expires_at")
      .single();
    if (error) throw error;
    return json({ ...data, token }, 201);
  } catch (error) {
    return failure(error);
  }
}

async function handleDELETE(request: Request) {
  try {
    const { db, userId } = await dashboardActor(request);
    const input = z
      .object({ id: z.string().uuid() })
      .strict()
      .safeParse(await body(request));
    if (!input.success)
      throw new ApiError("A valid agent token ID is required.");
    const { error } = await db
      .from("mcp_tokens")
      .delete()
      .eq("user_id", userId)
      .eq("id", input.data.id);
    if (error) throw error;
    return json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}

export const GET = monitored("GET /api/mcp-tokens", handleGET);
export const POST = monitored("POST /api/mcp-tokens", handlePOST);
export const DELETE = monitored("DELETE /api/mcp-tokens", handleDELETE);
