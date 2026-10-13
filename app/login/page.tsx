import { AuthForm } from "@/components/auth-form";
import { authDestination, authNotices } from "@/lib/auth";
export const metadata = {
  title: "Sign in · Tabd",
  robots: { index: false, follow: false },
};
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; next?: string }>;
}) {
  const params = await searchParams;
  return (
    <AuthForm
      notice={
        Object.hasOwn(authNotices, params.notice || "")
          ? authNotices[params.notice!]
          : ""
      }
      next={authDestination(params.next)}
    />
  );
}
