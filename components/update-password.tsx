"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { browserClient } from "@/lib/supabase/client";
import { authError, MIN_PASSWORD_LENGTH, passwordProblem } from "@/lib/auth";
import { AuthShell } from "@/components/auth-shell";
import { PasswordField } from "@/components/password-field";
import { Button } from "@/components/ui/button";
export function UpdatePassword({ changing = false }: { changing?: boolean }) {
  const [password, setPassword] = useState("");
  const [current, setCurrent] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [updated, setUpdated] = useState(false);
  const pending = useRef(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pending.current) return;
    const problem = passwordProblem(password, confirmation);
    if (!updated && problem) {
      setError(problem);
      return;
    }
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const client = browserClient();
      if (!updated) {
        const { error } = await client.auth.updateUser({
          password,
          ...(changing ? { current_password: current } : {}),
        });
        if (error) throw error;
        setUpdated(true);
        setPassword("");
        setConfirmation("");
        setCurrent("");
      }
      const { error } = await client.auth.signOut({ scope: "global" });
      if (error) {
        setError(
          "Your password was updated, but we couldn’t finish signing out. Retry below.",
        );
        return;
      }
      location.replace("/login?notice=password-updated");
    } catch (error) {
      setError(authError(error));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <AuthShell
      title={changing ? "Change your password." : "Set a new password."}
      description="Choose a unique password. After saving, you’ll sign in again on your browsers."
    >
      <form
        className="sheet-form auth-form-spaced"
        onSubmit={submit}
        aria-busy={busy}
      >
        {!updated && (
          <>
            {changing && (
              <PasswordField
                label="Current password"
                autoComplete="current-password"
                value={current}
                onChange={setCurrent}
                disabled={busy}
              />
            )}
            <PasswordField
              label="New password"
              value={password}
              onChange={setPassword}
              minLength={MIN_PASSWORD_LENGTH}
              hint="At least 12 characters. A few unrelated words work well."
              disabled={busy}
            />
            <PasswordField
              label="Confirm new password"
              value={confirmation}
              onChange={setConfirmation}
              disabled={busy}
            />
          </>
        )}
        {error && (
          <p className="form-message" role="alert">
            {error}
          </p>
        )}
        <Button disabled={busy}>
          {busy
            ? "Saving…"
            : updated
              ? "Finish signing out"
              : "Save new password"}
        </Button>
        <Link
          className="auth-text-link"
          href={changing ? "/" : "/forgot-password"}
        >
          {changing ? "Back to your library" : "Request a new reset link"}
        </Link>
        {changing && (
          <Link className="auth-text-link" href="/forgot-password">
            Forgot your current password?
          </Link>
        )}
        <p className="auth-hint">
          Extension and agent access are managed separately in Settings.
        </p>
      </form>
    </AuthShell>
  );
}
