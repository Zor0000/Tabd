import { actor, body, failure, json, ApiError } from "@/lib/api";
import { metadata } from "@/lib/metadata";
import { resourceSchema } from "@/lib/validation";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    await actor(request);
    const input = resourceSchema
      .pick({ url: true })
      .safeParse(await body(request));
    if (!input.success) throw new ApiError("Enter a valid website URL.");
    try {
      return json(await metadata(input.data.url, request.signal));
    } catch {
      return json({
        warning: "Preview unavailable. You can still save this website.",
      });
    }
  } catch (e) {
    return failure(e);
  }
}
