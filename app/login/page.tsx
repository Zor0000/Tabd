"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { browserClient, configured } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
export default function Login() {
  const router = useRouter();
  const [signup, setSignup] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
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
    <main className="auth-page">
      <div className="auth-card">
        <Link href="/" className="brand">
          <span className="brand-symbol">
            <i />
            <i />
            <i />
          </span>
          tabd<span className="brand-period">.</span>
        </Link>
        <h1>
          {!configured
            ? "Make room for your library."
            : signup
              ? "Your next good find starts here."
              : "Welcome back."}
        </h1>
        <p>
          {!configured
            ? "The dashboard is ready to connect to your Supabase project."
            : signup
              ? "Create your own little corner of the web."
              : "Your useful things, right where you left them."}
        </p>
        {!configured ? (
          <>
            <ol className="auth-setup-list">
              <li>Create a Supabase project.</li>
              <li>
                Copy <code>.env.example</code> to <code>.env.local</code> and
                add your project URL and publishable key.
              </li>
              <li>Run the included SQL migration.</li>
              <li>Restart the app and create your account.</li>
            </ol>
            <p className="form-message">
              See README.md for the full setup, including Chrome extension
              configuration.
            </p>
            <Button asChild>
              <a href="/preview">
                Explore the preview library <ArrowRight size={15} />
              </a>
            </Button>
          </>
        ) : (
          <>
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
                  placeholder="At least 8 characters"
                  required
                />
              </label>
              {message && (
                <p className="form-message" role="status">
                  {message}
                </p>
              )}
              <Button disabled={busy} type="submit">
                {busy ? <Loader2 size={15} className="spin" /> : null}
                {signup ? "Create account" : "Sign in"}
                <ArrowRight size={15} />
              </Button>
            </form>
            {process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true" && (
              <Button
                variant="secondary"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  const { error } = await browserClient().auth.signInWithOAuth({
                    provider: "google",
                    options: { redirectTo: location.origin + "/auth/callback" },
                  });
                  if (error) {
                    setMessage(error.message);
                    setBusy(false);
                  }
                }}
              >
                Continue with Google
              </Button>
            )}
            <div className="auth-links">
              <button
                onClick={() => {
                  setSignup(!signup);
                  setMessage("");
                }}
              >
                {signup
                  ? "Already have an account? Sign in"
                  : "New here? Create an account"}
              </button>
              <a href="/preview">Preview</a>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
