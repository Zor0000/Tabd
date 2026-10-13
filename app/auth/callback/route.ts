import { NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase/server";
import { authDestination } from "@/lib/auth";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = authDestination(url.searchParams.get("next"));
  const redirect = (path: string) => {
    const response = NextResponse.redirect(new URL(path, url.origin));
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  };
  const code = url.searchParams.get("code");
  if (code && !url.searchParams.has("error")) {
    try {
      const db = await serverClient();
      const { error } = await db.auth.exchangeCodeForSession(code);
      if (!error) return redirect(next);
    } catch {
      /* A safe recovery destination also handles network failures. */
    }
  }
  return redirect(
    next === "/reset-password"
      ? "/forgot-password?notice=link-expired"
      : "/login?notice=callback-failed",
  );
}
