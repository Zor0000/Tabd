import { redirect } from "next/navigation";
import { configured } from "@/lib/supabase/client";
import { serverClient } from "@/lib/supabase/server";
import { UpdatePassword } from "@/components/update-password";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "New password · Tabd",
  robots: { index: false, follow: false },
};
export default async function ResetPassword() {
  if (!configured) redirect("/forgot-password?notice=link-expired");
  const db = await serverClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/forgot-password?notice=link-expired");
  return <UpdatePassword />;
}
