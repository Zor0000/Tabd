import { z } from "zod";
import { ApiError, body, failure, json } from "@/lib/api";
import { dashboardActor } from "@/lib/mcp/auth";

export async function GET(request: Request) {
  try {
    const { db, userId } = await dashboardActor(request);
    const { data, error } = await db
      .from("taste_profiles")
      .select("preferences,updated_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return json(data ?? { preferences: "", updated_at: null });
  } catch (error) {
    return failure(error);
  }
}

export async function PUT(request: Request) {
  try {
    const { db, userId } = await dashboardActor(request);
    const input = z
      .object({ preferences: z.string().trim().max(5000) })
      .strict()
      .safeParse(await body(request));
    if (!input.success)
      throw new ApiError("Keep your preferences under 5,000 characters.");
    const { data, error } = await db
      .from("taste_profiles")
      .upsert({
        user_id: userId,
        preferences: input.data.preferences,
        updated_at: new Date().toISOString(),
      })
      .select("preferences,updated_at")
      .single();
    if (error) throw error;
    return json(data);
  } catch (error) {
    return failure(error);
  }
}
