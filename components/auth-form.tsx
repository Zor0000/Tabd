"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { browserClient, configured } from "@/lib/supabase/client";
import {
  authDestination,
  authError,
  MIN_PASSWORD_LENGTH,
  passwordProblem,
} from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/auth-shell";
import { PasswordField } from "@/components/password-field";

type Mode = "login" | "signup" | "forgot" | "resend";
const copy = {
  login: [
    "Good to have you back.",
    "Your useful things, right where you left them.",
    "Sign in",
  ],
  signup: [
    "Make yourself at home.",
    "A place for everything worth saving.",
    "Create account",
  ],
  forgot: [
    "Forgot your password?",
    "We’ll email you a link to choose a new password.",
    "Send reset link",
  ],
  resend: [
    "Confirm your email.",
    "Request a fresh link to finish setting up your Tabd account.",
    "Resend confirmation email",
  ],
};
export function AuthForm({
  initialMode = "login",
  notice = "",
  next = "/",
}: {
  initialMode?: Mode;
  notice?: string;
  next?: string;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [message, setMessage] = useState(notice);
  const [failed, setFailed] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [cooldown, setCooldown] = useState(0);
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  const destination = authDestination(next);
  const callback = () =>
    `${location.origin}/auth/callback?next=${encodeURIComponent(destination)}`;
  const changeMode = (value: Mode) => {
    setMode(value);
    setMessage("");
    setFailed(false);
    setPassword("");
    setConfirmation("");
  };
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (
      pending.current ||
      !configured ||
      ((mode === "forgot" || mode === "resend") && cooldown > 0)
    )
      return;
    if (mode === "signup") {
      const problem = passwordProblem(password, confirmation);
      if (problem) {
        setMessage(problem);
        setFailed(true);
        return;
      }
    }
    pending.current = true;
    setBusy(true);
    setMessage("");
    setFailed(false);
    try {
      const client = browserClient();
      if (mode === "forgot") {
        const { error } = await client.auth.resetPasswordForEmail(
          email.trim(),
          {
            redirectTo: `${location.origin}/auth/callback?next=/reset-password`,
          },
        );
        if (error) throw error;
        setMessage(
          "If there’s an account for that email, a reset link is on its way. Check your inbox and spam folder.",
        );
        setCooldown(60);
      } else if (mode === "resend") {
        const { error } = await client.auth.resend({
          type: "signup",
          email: email.trim(),
          options: { emailRedirectTo: callback() },
        });
        if (error) throw error;
        setMessage(
          "If this account needs confirmation, a new link is on its way. Check your inbox and spam folder.",
        );
        setCooldown(60);
      } else {
        const { data, error } =
          mode === "signup"
            ? await client.auth.signUp({
                email: email.trim(),
                password,
                options: { emailRedirectTo: callback() },
              })
            : await client.auth.signInWithPassword({
                email: email.trim(),
                password,
              });
        if (error) throw error;
        if (mode === "signup" && !data.session) {
          setMode("resend");
          setPassword("");
          setConfirmation("");
          setCooldown(60);
          setMessage(
            "Check your inbox for a Tabd confirmation email. If you already have an account, sign in instead.",
          );
        } else {
          location.replace(destination);
        }
      }
    } catch (error) {
      setMessage(authError(error));
      setFailed(true);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  const emailOnly = mode === "forgot" || mode === "resend";
  return (
    <AuthShell title={copy[mode][0]} description={copy[mode][1]}>
      {!emailOnly && (
        <div className="auth-mode" aria-label="Account options">
          <button
            disabled={busy}
            type="button"
            aria-pressed={mode === "login"}
            onClick={() => changeMode("login")}
          >
            Sign in
          </button>
          <button
            disabled={busy}
            type="button"
            aria-pressed={mode === "signup"}
            onClick={() => changeMode("signup")}
          >
            Sign up
          </button>
        </div>
      )}
      <form
        className={`sheet-form${emailOnly ? " auth-form-spaced" : ""}`}
        onSubmit={submit}
        aria-busy={busy}
      >
        <label>
          Email
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            disabled={busy}
          />
        </label>
        {!emailOnly && (
          <PasswordField
            value={password}
            onChange={setPassword}
            autoComplete={
              mode === "signup" ? "new-password" : "current-password"
            }
            minLength={mode === "signup" ? MIN_PASSWORD_LENGTH : undefined}
            hint={
              mode === "signup"
                ? "At least 12 characters. A few unrelated words work well."
                : undefined
            }
            disabled={busy}
          />
        )}
        {mode === "signup" && (
          <PasswordField
            label="Confirm password"
            value={confirmation}
            onChange={setConfirmation}
            disabled={busy}
          />
        )}
        {mode === "login" && (
          <button
            className="auth-text-link auth-align-end"
            type="button"
            disabled={busy}
            onClick={() => changeMode("forgot")}
          >
            Forgot password?
          </button>
        )}
        {message && (
          <p
            className={`form-message auth-feedback${failed ? " auth-feedback-error" : ""}`}
            role={failed ? "alert" : "status"}
          >
            {message}
          </p>
        )}
        <Button
          disabled={busy || !configured || (emailOnly && cooldown > 0)}
          type="submit"
        >
          {busy ? (
            <>
              <span>Please wait…</span>
              <Loader2 size={15} className="spin" />
            </>
          ) : (
            <>
              <span>
                {emailOnly && cooldown
                  ? `Send again in ${cooldown}s`
                  : copy[mode][2]}
              </span>
              <ArrowRight size={16} />
            </>
          )}
        </Button>
      </form>
      {mode === "login" && (
        <button
          className="auth-text-link auth-secondary-link"
          disabled={busy}
          type="button"
          onClick={() => changeMode("resend")}
        >
          Resend confirmation email
        </button>
      )}
      {emailOnly && (
        <button
          className="auth-text-link auth-secondary-link"
          type="button"
          disabled={busy}
          onClick={() => changeMode("login")}
        >
          Back to sign in
        </button>
      )}
      {!emailOnly &&
        configured &&
        process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true" && (
          <Button
            variant="secondary"
            disabled={busy}
            onClick={async () => {
              if (pending.current) return;
              pending.current = true;
              setBusy(true);
              setMessage("");
              try {
                const { error } = await browserClient().auth.signInWithOAuth({
                  provider: "google",
                  options: { redirectTo: callback() },
                });
                if (error) throw error;
              } catch (error) {
                setMessage(authError(error));
                setFailed(true);
                pending.current = false;
                setBusy(false);
              }
            }}
          >
            Continue with Google
          </Button>
        )}
      {!configured && (
        <p className="auth-preview-note">
          Account access is not configured in this environment.{" "}
          <Link href="/preview">
            Explore the preview library <ArrowRight size={12} />
          </Link>
        </p>
      )}
    </AuthShell>
  );
}
