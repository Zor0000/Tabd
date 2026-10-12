"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { browserClient, configured } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { AuthWordmark } from "@/components/auth-wordmark";

export default function Login() {
  const router = useRouter();
  const [signup, setSignup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!configured) {
      setMessage(
        "Account access is not connected yet. Explore the preview library below.",
      );
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const client = browserClient();
      const { data, error } = signup
        ? await client.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: location.origin + "/auth/callback" },
          })
        : await client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (signup && !data.session)
        setMessage("Check your email to confirm your account, then sign in.");
      else {
        const next = new URLSearchParams(location.search).get("next");
        router.push(next?.startsWith("/connect?") ? next : "/");
        router.refresh();
      }
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-split">
      <AuthWordmark />
      <section
        className="auth-account"
        aria-label={signup ? "Create your account" : "Sign in to Tabd"}
      >
        <Link href="/preview" className="auth-back">
          Explore preview <ArrowRight size={14} />
        </Link>
        <div className="auth-account-inner">
          <Link href="/" className="brand">
            tabd<span className="brand-period">.</span>
          </Link>
          <h1>
            {signup ? "Make yourself at home." : "Good to have you back."}
          </h1>
          <p>
            {signup
              ? "A place for everything worth saving."
              : "Your useful things, right where you left them."}
          </p>
          <div className="auth-mode" aria-label="Account options">
            <button
              type="button"
              aria-pressed={!signup}
              onClick={() => {
                setSignup(false);
                setMessage("");
              }}
            >
              Sign in
            </button>
            <button
              type="button"
              aria-pressed={signup}
              onClick={() => {
                setSignup(true);
                setMessage("");
              }}
            >
              Sign up
            </button>
          </div>
          <form className="sheet-form" onSubmit={submit}>
            <label>
              Email
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                minLength={8}
                autoComplete={signup ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={signup ? "At least 8 characters" : "Your password"}
                required
              />
            </label>
            {message && (
              <p className="form-message" role="status">
                {message}
              </p>
            )}
            <Button disabled={busy || !configured} type="submit">
              {busy && <Loader2 size={15} className="spin" />}
              {signup ? "Create account" : "Sign in"}
              <ArrowRight size={16} />
            </Button>
          </form>
          {configured &&
            process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true" && (
              <Button
                variant="secondary"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const { error } =
                      await browserClient().auth.signInWithOAuth({
                        provider: "google",
                        options: {
                          redirectTo: location.origin + "/auth/callback",
                        },
                      });
                    if (error) throw error;
                  } catch (e) {
                    setMessage((e as Error).message);
                    setBusy(false);
                  }
                }}
              >
                Continue with Google
              </Button>
            )}
          {!configured && (
            <p className="auth-preview-note">
              Account access is coming once your library is connected.{" "}
              <Link href="/preview">
                Take a look around <ArrowRight size={12} />
              </Link>
            </p>
          )}
        </div>
        <p className="auth-account-footer">Save something good.</p>
      </section>
    </main>
  );
}
