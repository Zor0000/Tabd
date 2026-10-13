"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { browserClient, configured } from "@/lib/supabase/client";
import { authDestination, authError } from "@/lib/auth";
import { AuthShell } from "@/components/auth-shell";
import { Button } from "@/components/ui/button";

export function AuthConfirm({
  tokenHash,
  type,
  next,
}: {
  tokenHash: string;
  type: string;
  next: string;
}) {
  const recovery = type === "recovery";
  const valid =
    Boolean(tokenHash) && ["signup", "recovery", "email_change"].includes(type);
  const [error, setError] = useState(
    valid
      ? ""
      : "This link is incomplete. Request a new email and use its link.",
  );
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  async function confirm() {
    if (pending.current || !valid || !configured) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const { error } = await browserClient().auth.verifyOtp({
        token_hash: tokenHash,
        type: type as "signup" | "recovery" | "email_change",
      });
      if (error) throw error;
      location.replace(recovery ? "/reset-password" : authDestination(next));
    } catch (error) {
      setError(authError(error));
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <AuthShell
      title={recovery ? "Choose a fresh start." : "One last step."}
      description={
        recovery
          ? "Continue to choose a new password for your Tabd account."
          : "Confirm your email to continue to Tabd."
      }
    >
      <div className="sheet-form auth-form-spaced">
        {error && (
          <p className="form-message" role="alert">
            {error}
          </p>
        )}
        {!configured && (
          <p className="form-message" role="alert">
            Account access is not configured in this environment.
          </p>
        )}
        <Button disabled={!valid || busy || !configured} onClick={confirm}>
          {busy
            ? "Confirming…"
            : recovery
              ? "Continue to reset password"
              : "Confirm email"}
        </Button>
        <Link
          className="auth-text-link"
          href={recovery ? "/forgot-password" : "/verify-email"}
        >
          Request a new email
        </Link>
      </div>
    </AuthShell>
  );
}
