# Tabd privacy policy — draft for owner review

**Not yet the published privacy policy.** Confirm the operator/contact, actual retention/deletion process, service providers, and commitments below before publication. Effective date will be the publication date.

## Who operates Tabd

Tabd is a personal web library at https://www.tab-dd.tech, with a companion desktop browser extension and optional coding-agent connections. Public operator name and private support/privacy contact are awaiting confirmation.

## Information handled

- **Account information:** The website uses an email address, account identifier, and authentication information to create and maintain your account. Password authentication is handled through Supabase Auth. The extension does not ask for your password.
- **Saved references:** When you open the extension, it reads the selected page's URL, title, and available favicon to show a save form. When you save, it sends the selected URL and details, chosen collection, status, tags, and optional personal note to Tabd. It loads collection names and may receive details of an already-saved page. The website stores your references, notes, collections, favorites, and preferences.
- **Local extension data:** The extension stores its account-link token, verified Tabd server origin, and last selected collection in browser-local extension storage. It does not use browser sync storage for these credentials. The account-link token authorizes access to your library; the server stores its hash.
- **Metadata and previews:** Tabd servers may request saved public URLs to retrieve metadata or create previews/screenshots. Requested sites receive normal network requests from Tabd's infrastructure. Displayed favicons or preview images may cause your browser to contact the image host. Avoid saving URLs containing private access credentials or sensitive query parameters.
- **Operational information:** The hosting and authentication providers process network information needed to operate the service, which may include IP addresses and request details. Tabd's structured application events record normalized routes, status, duration, request IDs, and operation outcomes; these events deliberately exclude account tokens, request bodies, raw saved URLs, and search text.

The extension has no browsing-history permission, no broad all-sites permission, and no content scripts. It does not continuously monitor browsing or upload every visited tab. Browser-local storage is not a promise of application-level encryption; protect your browser profile and device.

## Why information is used

To authenticate you, save and organize references, retrieve your library, show metadata/previews, remember extension preferences, and protect and troubleshoot the service. The repository does not implement advertising trackers, data sale, or advertising profiling. The operator must confirm these statements also describe all deployed services and business practices.

## Service providers and optional agents

Tabd uses Vercel for application hosting and Supabase for authentication, database storage, and preview storage. Account email delivery uses the configured email provider; confirm its identity and applicable retention before finalizing this policy. Providers process information as needed to deliver these functions.

If you separately create an MCP token and give it to a coding-agent client, that client can read your saved references and explicit preferences using Tabd's five read-only tools. The agent provider's own processing is governed by its terms and privacy policy. This connection is optional; the browser extension does not automatically create it. Revoke unwanted agent tokens in Tabd's agent settings.

Proposed commitment for owner confirmation: Tabd does not sell user data or use saved references for advertising. Transfers are limited to providing the requested service, user-authorized integrations, necessary security/legal purposes, and any other circumstances explicitly disclosed in the final policy.

## Your controls and retention

You can edit or delete saved references through the website and export your library as JSON. Disconnecting the extension removes its locally stored token but does not delete your account or saved references. Uninstalling removes extension-local data through the browser; it does not delete server-side data. Revoke extension access in website Settings to invalidate issued extension credentials. Browser sign-out alone does not revoke extension or agent access.

Extension and MCP credentials expire after 30 days and may be revoked earlier. The application currently has no self-service account-deletion interface. A working private contact and an operator process for account deletion, associated preview-object cleanup, backups, and provider retention must be established and described here before publication. Do not promise a deletion deadline or backup-retention period that has not been verified.

## Security and limited use

The production extension communicates with Tabd using HTTPS. Access is authenticated and scoped to the connected account. No service can promise absolute security.

Proposed commitment for owner confirmation: Tabd's handling of data obtained through the extension complies with the Chrome Web Store User Data Policy, including Limited Use requirements. Data is used only for the disclosed user-facing functionality and permitted service/security purposes; it is not used for personalized advertising, creditworthiness, or unrelated resale. Human access is limited to cases permitted by the policy.

## Contact and changes

Insert the confirmed private support/privacy email and operator name. Publish updates at a stable public policy URL and show the effective date. Do not direct users to disclose private account information in public GitHub issues.
