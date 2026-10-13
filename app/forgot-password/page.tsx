import { AuthForm } from "@/components/auth-form";
import { authNotices } from "@/lib/auth";
export const metadata = {
  title: "Reset password · Tabd",
  robots: { index: false, follow: false },
};
export default async function ForgotPassword({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const params = await searchParams;
  return (
    <AuthForm
      initialMode="forgot"
      notice={
        Object.hasOwn(authNotices, params.notice || "")
          ? authNotices[params.notice!]
          : ""
      }
    />
  );
}
