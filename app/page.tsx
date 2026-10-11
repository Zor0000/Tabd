import { redirect } from "next/navigation";
import { Dashboard } from "@/components/dashboard";
import { serverClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export default async function Home() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  )
    return <Dashboard preview />;
  const db = await serverClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/login");
  return (
    <Dashboard
      email={user.email}
      displayName={user.user_metadata?.display_name}
    />
  );
}
