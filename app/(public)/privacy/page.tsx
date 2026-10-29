import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy policy — Tabd",
  description:
    "How Tabd handles your account, saved links, extension data, and privacy requests.",
};

export default function PrivacyPage() {
  return (
    <article>
      <h1>Privacy policy</h1>
      <p>Effective date: October 30, 2026.</p>
      <p>
        Tabd is a personal web library operated by Neeraj Chormale. This policy
        covers the website, browser extension, and optional coding-agent
        connections.
      </p>
      <p>
        For privacy questions, email{" "}
        <a href="mailto:neerajcwork@gmail.com">neerajcwork@gmail.com</a>.
      </p>

      <h2>Information we handle</h2>
      <ul>
        <li>
          <strong>Your account:</strong> Your email address, account identifier,
          profile details, and authentication information. Supabase Auth handles
          password authentication. The extension does not ask for your password.
        </li>
        <li>
          <strong>Your library:</strong> Saved URLs, titles, descriptions, tags,
          notes, collections, favorites, and preferences you provide.
        </li>
        <li>
          <strong>The selected tab:</strong> When you open the extension, it
          reads the selected page’s URL, title, and available favicon. When you
          save, it sends the URL and form details to Tabd. It also loads
          collections and checks for an existing saved link.
        </li>
        <li>
          <strong>Local storage:</strong> The website uses session cookies and
          local browser storage for sign-in and preferences. The extension
          stores its connection token, Tabd server origin, and last selected
          collection in browser-local storage. Credentials are not stored in
          browser sync storage. The server stores token hashes.
        </li>
        <li>
          <strong>Service records:</strong> Hosting and authentication providers
          process network information, such as IP addresses and request details.
          Application events include routes, status, duration, request
          identifiers, and operation results. These events exclude request
          bodies, account tokens, raw saved URLs, and search text.
        </li>
      </ul>
      <p>
        The extension does not continuously monitor your browsing. It has no
        browsing-history permission, broad all-sites permission, or content
        scripts.
      </p>

      <h2>How we use information</h2>
      <p>
        We use information to sign you in, save and organize your library, show
        previews, remember preferences, and protect and troubleshoot Tabd.
      </p>
      <p>
        Tabd does not sell user data or use saved references for advertising.
      </p>
      <p>
        Tabd servers may visit saved public URLs to retrieve metadata or create
        screenshots. Those sites receive requests from our infrastructure.
        Images and favicons may also cause your browser to contact their hosts.
        Do not save links that contain passwords, access tokens, or other
        private credentials.
      </p>

      <h2>Providers and optional connections</h2>
      <p>
        Vercel hosts the application. Supabase provides authentication, the
        database, and preview storage. Account emails use the configured email
        delivery service, including Resend. Support emails are handled through
        Gmail. These providers process information needed to provide their
        services.
      </p>
      <p>
        If you give a Tabd MCP token to a coding-agent client, that client can
        read your library and explicit preferences. This connection is optional.
        The agent provider handles received information under its own terms and
        privacy policy.
      </p>
      <p>
        We share information to provide these functions and connections, or
        where necessary for security or legal obligations.
      </p>

      <h2>Your controls</h2>
      <p>
        You can edit or delete saved links in your library. Use Settings to
        export your library as JSON or revoke extension access. Revoke agent
        tokens in agent settings.
      </p>
      <p>
        Extension and agent tokens expire after 30 days. Signing out of the
        website does not revoke these tokens. Disconnecting or uninstalling the
        extension removes its local data, but does not delete your account or
        library.
      </p>
      <p>
        To request account deletion, follow the{" "}
        <Link href="/support#account-deletion">
          account deletion instructions
        </Link>
        . We verify the request before deleting account data. You do not need to
        install the extension to make a request.
      </p>

      <h2>Retention and deletion</h2>
      <p>
        We keep account and library data while you use Tabd, until you delete it
        or request account deletion. Deleting a saved link removes its database
        record. Associated stored previews become inaccessible through your
        library, but can remain in storage until cleanup.
      </p>
      <p>
        For a verified account-deletion request, we remove the account, its
        library and preferences, connection credentials, and associated preview
        files from active systems.
      </p>
      <p>
        Deletion from active systems does not guarantee immediate removal from
        provider backups or operational logs. Those copies follow provider
        retention and deletion processes. We do not promise a fixed
        backup-erasure period. Support correspondence may remain as needed to
        resolve requests and keep a record of their handling.
      </p>

      <h2>Security and extension data use</h2>
      <p>
        The production service uses HTTPS and account-scoped access controls.
        Protect your device and browser profile. Local storage is not a promise
        of application-level encryption. No service can guarantee absolute
        security.
      </p>
      <p>
        Tabd’s use of data obtained through the extension follows the{" "}
        <a href="https://developer.chrome.com/docs/webstore/program-policies/user-data-faq">
          Chrome Web Store User Data Policy
        </a>
        , including its Limited Use requirements. We use this data only for the
        disclosed features and permitted service or security purposes.
      </p>
      <p>
        We do not use extension data for personalized advertising,
        creditworthiness, or unrelated resale. Human access is limited to
        permitted cases, such as your explicit consent to support, security
        investigations, or legal requirements.
      </p>

      <h2>Questions and changes</h2>
      <p>
        Contact <a href="mailto:neerajcwork@gmail.com">neerajcwork@gmail.com</a>{" "}
        to request access, correction, or deletion, or to ask a privacy
        question. Do not post private account information in public issues.
      </p>
      <p>
        We publish policy updates on this page and update the effective date
        when the policy changes.
      </p>
    </article>
  );
}
