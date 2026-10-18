import { createClient } from "@supabase/supabase-js";

export class RateLimitError extends Error {
  constructor(
    public status: 429 | 503,
    public retryAfter: number,
  ) {
    super(
      status === 429
        ? "Too many requests. Please try again shortly."
        : "Request protection is temporarily unavailable. Please try again shortly.",
    );
  }
}

export const policies = {
  read: { limit: 300, seconds: 60 },
  write: { limit: 60, seconds: 60 },
  metadata: { limit: 30, seconds: 60 },
  mcp: { limit: 120, seconds: 60 },
  capture: { limit: 20, seconds: 60 },
  captureDaily: { limit: 200, seconds: 86400 },
  captureGlobal: { limit: 60, seconds: 60 },
} as const;
export type Policy = keyof typeof policies;

/** Shared atomic counters, never a per-process fallback. Only called after auth. */
export async function enforceLimit(subject: string, policy: Policy) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new RateLimitError(503, 30);
  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { limit, seconds } = policies[policy];
  try {
    const { data, error } = await db
      .rpc("consume_api_limit", {
        subject_key: subject,
        bucket_name: policy,
        max_requests: limit,
        window_seconds: seconds,
      })
      .abortSignal(AbortSignal.timeout(3000));
    if (
      error ||
      !data ||
      typeof data.allowed !== "boolean" ||
      !Number.isInteger(data.retry_after)
    )
      throw new RateLimitError(503, 30);
    if (!data.allowed)
      throw new RateLimitError(429, Math.max(1, data.retry_after));
  } catch (error) {
    if (error instanceof RateLimitError) throw error;
    throw new RateLimitError(503, 30);
  }
}

export async function limitActor(request: Request, userId: string) {
  const path = new URL(request.url).pathname;
  await enforceLimit(
    userId,
    request.method === "GET" || request.method === "HEAD" ? "read" : "write",
  );
  if (path === "/api/metadata" || path.endsWith("/metadata"))
    await enforceLimit(userId, "metadata");
}
