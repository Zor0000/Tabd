"use client";
import { useRef, useState } from "react";
import { LogOut } from "lucide-react";
import { browserClient } from "@/lib/supabase/client";
import { authError } from "@/lib/auth";
import { Button } from "@/components/ui/button";
export function AccountAccess() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  async function signOut(scope: "local" | "global") {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const { error } = await browserClient().auth.signOut({ scope });
      if (error) throw error;
      // A full navigation discards the private library and router cache.
      location.replace(
        `/login?notice=${scope === "local" ? "signed-out" : "signed-out-all"}`,
      );
    } catch (error) {
      setError(authError(error));
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <Button variant="secondary" asChild>
        <a href="/account/password">Change password</a>
      </Button>
      <Button variant="ghost" disabled={busy} onClick={() => signOut("local")}>
        <LogOut size={16} />
        Sign out of this browser
      </Button>
      <Button variant="ghost" disabled={busy} onClick={() => signOut("global")}>
        Sign out of all browsers
      </Button>
      <p className="auth-hint">
        Browser sign-out doesn’t revoke extension or agent tokens. Manage those
        connections separately.
      </p>
      {error && (
        <p className="form-message" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
