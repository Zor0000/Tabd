import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Support — Tabd",
  description:
    "Get help with Tabd, report a problem, or request account deletion.",
};

export default function SupportPage() {
  return (
    <article>
      <h1>How can we help?</h1>
      <p>
        Contact Neeraj Chormale at{" "}
        <a href="mailto:neerajcwork@gmail.com">neerajcwork@gmail.com</a> for
        Tabd support and privacy requests.
      </p>
      <h2>Report a problem</h2>
      <p>
        Tell us what you tried, what happened, and which browser and device you
        use. Include an error message or screenshot if it helps. Remove private
        links and personal information first.
      </p>
      <p>
        Never send passwords, connection tokens, recovery codes, or sign-in
        links. Send security reports by email, not through a public issue.
      </p>
      <h2>Sign-in help</h2>
      <p>
        If you forgot your password,{" "}
        <Link href="/forgot-password">request a password reset</Link>. Check
        your spam folder for account emails. Contact support if you still cannot
        sign in.
      </p>
      <h2 id="account-deletion">Delete your account</h2>
      <ol>
        <li>
          If you want a copy of your library, open Settings and select Export
          library as JSON.
        </li>
        <li>
          Email{" "}
          <a href="mailto:neerajcwork@gmail.com?subject=Tabd%20account%20deletion">
            neerajcwork@gmail.com
          </a>{" "}
          from your account email address. Use the subject “Tabd account
          deletion”.
        </li>
        <li>
          We verify account ownership before deletion. If you cannot access your
          account email, explain this in your request. Do not send a password.
        </li>
        <li>
          We confirm when the account and its data have been removed from active
          systems. Account deletion cannot be undone.
        </li>
      </ol>
      <p>
        This removes your library, collections, preferences, connection
        credentials, and associated preview files. You can request deletion
        without signing in. See the <Link href="/privacy">privacy policy</Link>{" "}
        for backup, log, and support-email retention limits.
      </p>
      <h2>Disconnect the extension or an agent</h2>
      <p>
        In Tabd Settings, select Revoke extension access to invalidate extension
        connections. In agent settings, revoke unwanted agent tokens. Signing
        out or uninstalling the extension does not delete your library.
      </p>
    </article>
  );
}
