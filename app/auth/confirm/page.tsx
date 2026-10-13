import { authDestination } from "@/lib/auth";
import { AuthConfirm } from "@/components/auth-confirm";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Confirm your request · Tabd",
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};
export default async function Confirm({
  searchParams,
}: {
  searchParams: Promise<{
    token_hash?: string;
    type?: string;
    next?: string;
    redirect_to?: string;
  }>;
}) {
  const params = await searchParams;
  let next = authDestination(params.next);
  if (typeof params.redirect_to === "string") {
    try {
      next = authDestination(
        new URL(params.redirect_to).searchParams.get("next"),
      );
    } catch {
      /* Fall back to the library. */
    }
  }
  return (
    <AuthConfirm
      tokenHash={typeof params.token_hash === "string" ? params.token_hash : ""}
      type={typeof params.type === "string" ? params.type : ""}
      next={next}
    />
  );
}
