import { AuthForm } from "@/components/auth-form";
import { authNotices } from "@/lib/auth";
export const metadata = {
  title: "Confirm email · Tabd",
  robots: { index: false, follow: false },
};
export default async function VerifyEmail({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const params = await searchParams;
  return (
    <AuthForm
      initialMode="resend"
      notice={
        Object.hasOwn(authNotices, params.notice || "")
          ? authNotices[params.notice!]
          : ""
      }
    />
  );
}
