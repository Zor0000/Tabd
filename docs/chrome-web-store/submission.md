# Chrome Web Store submission packet

Prepared 19 October 2026 for extension **0.1.1**. Status: package and listing materials prepared; not uploaded, submitted, approved, or published. This packet does not replace the publisher dashboard's current requirements.

## Package and assets

Use `artifacts/chrome-web-store/0.1.1/tabd-extension-0.1.1-chrome-mv3.zip`, identical to the tested unpacked release. SHA-256: `79e0bf8dc38b2842b5409dbc1d22778414cb19c6189c2f82c038327707092887`. The root contains `manifest.json`; the ZIP is not wrapped in an extra directory. Version is 0.1.1, Manifest V3, production origin only. No development server, remote JavaScript, account credentials, or private signing key is required in the package.

The asset directory also contains `icon-128.png`, `promo-440x280.png`, and screenshots `01-save-1280x800.png`, `02-details-1280x800.png`, and `03-library-1280x800.png`. Screenshots use actual UI with clearly labeled sample content, not a customer's library. See `asset-provenance.md` for capture details.

## Listing fields — ready to paste

**Name:** Tabd — Good finds, kept.

**Short description:** Keep the web’s useful things. Click, choose a collection, save.

**Language:** English

**Suggested category:** Productivity (choose the closest current dashboard category).

**Website:** https://www.tab-dd.tech

**Support URL:** https://github.com/Zor0000/Tabd/issues — general product support only; never post account details or credentials. Private account/privacy support needs the owner's confirmed contact email.

**Privacy policy URL:** Pending. Publish the completed policy at a publicly accessible URL and link it from the website before submission. Do not enter the draft policy URL as a finished policy.

**Detailed description:**

Keep the useful pages you find on the web in your personal Tabd library.

Open Tabd on a page, choose a collection, and save. Add a title, tags, a status, or a personal note when you want more context. If a page is already in your library, Tabd lets you review it and save your changes.

• Save the current page's URL and title to your Tabd account.
• Organize saves into collections, including nested collections.
• Add optional notes and tags without leaving the page.
• Revisit saved links in the Tabd website.
• Use the popup in your system's light or dark appearance.

A Tabd account and an internet connection are required. Create an account at https://www.tab-dd.tech, confirm your email, then click “Connect to Tabd” in the extension and approve the connection on the website in the same browser profile.

The extension accesses the selected page when you open it. It sends page details to your Tabd account when you save. It does not request browsing-history permission or monitor all of your tabs. Connection credentials are stored locally in the extension. You can disconnect in the popup and revoke extension access in your website Settings. Connections expire after 30 days.

The Tabd website also offers optional read-only MCP access for compatible coding agents. That is configured separately on the website and is not required to use this extension.

## Privacy practices — proposed answers

**Single purpose:** Save and organize a page selected by the user in their personal Tabd web library, including optional tags and notes.

| Permission                                          | Justification                                                                                                                                                                                                                                                       |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `activeTab`                                         | Read the URL, title, and available favicon of the page the user invokes the popup on, so the user can choose to save that page. No background browsing-history collection or content script is used.                                                                |
| `storage`                                           | Store the account-link token, verified Tabd origin, and last selected collection locally so the extension stays connected and remembers the save destination.                                                                                                       |
| Host access to `https://www.tab-dd.tech/*`          | Verify the Tabd server, load the user's collections, and create or update the user's saved resources through its authenticated HTTPS API. Access is limited to this origin.                                                                                         |
| External messaging from `https://www.tab-dd.tech/*` | Receive a connection handshake and account token from the user-approved Tabd connection page. The extension verifies the sender and token before storing the connection. This is a manifest connection restriction, not a request for access to unrelated websites. |

**Remote code:** No. Extension JavaScript and CSS are packaged locally. Remote JSON responses and favicons are data, not executable code.

**Data categories:** Conservatively disclose Authentication information (the account-link token), Web history (the selected URL, without passive history collection), Website content (selected page title/favicon and saved details), and Personally identifiable information (the associated Tabd service uses email/account identifiers). The extension does not ask for the account password; website authentication is separate. Notes are user-generated content and can contain personal information; do not select “no user data collected.” Review the current dashboard category wording before certifying.

**Use:** Account authentication, personal library storage, organization, synchronization, metadata/previews, and service security. No advertising or unrelated profiling is implemented in this repository. Owner must confirm that actual business practices and infrastructure match the policy and data-use certifications before signing them.

## Reviewer test instructions

1. Install the submitted extension. **Before submitting:** the operator must register the store-assigned extension ID in production `NEXT_PUBLIC_EXTENSION_IDS`, preserving the current unpacked ID, then redeploy. Otherwise reviewers cannot pair it.
2. Open https://www.tab-dd.tech/login in the same Chrome profile. Use the dedicated, email-confirmed review account whose credentials are entered only in the dashboard's private Test instructions fields. Never put reviewer credentials in this repository, a public issue, screenshots, or release notes. Alternatively reviewers may create and confirm their own account if permitted by their workflow.
3. Open the extension and choose **Connect to Tabd**. Approve **Connect this extension** on the website. The connection page should confirm success.
4. Open a public HTTPS page, such as https://example.com. Open Tabd, choose Inbox or a collection, and save. The popup should confirm the save.
5. Open the website library and confirm the saved page appears. Save the same page again to test duplicate handling; add a tag or note and save changes.
6. In website Settings, revoke extension access. The next authenticated extension request should require reconnection. The account's saved resources should remain.
7. Internal Chrome pages cannot be saved. The popup explains this. Phone browsers are not supported by this desktop extension.

The operator should use only synthetic data in the review account, keep it available throughout review, and remove it after review is finished. Its setup and credentials are still pending; no account was created for this packet.

## Upload and submission sequence

1. Owner signs in to the [Chrome Web Store developer dashboard](https://chrome.google.com/webstore/devconsole), completes developer registration, required account verification, and any registration payment personally. Confirm the public developer identity/contact. Do not share a password or login token in chat.
2. Create a new item and upload the ZIP. Save the assigned item/extension ID. Uploading a draft does not publish it.
3. Send the non-secret assigned extension ID to the release operator. Register it in production while retaining existing IDs, then validate pairing with that exact identity. The website's allowlist must remain enforced.
4. Complete the listing with this copy and the image assets. Publish the finalized privacy policy and enter its URL. Supply a private reviewer account and instructions.
5. Select distribution: public visibility is the intended destination; choose the supported territories in the dashboard. Confirm pricing and publisher/trader declarations from actual business circumstances rather than guessing.
6. Confirm that the data-use statements match actual operation. Run the store-ID pairing/save/revoke check and inspect dashboard validation errors.
7. Submit for review only after the remaining items are complete. Prefer **deferred publication** so approval does not automatically publish an unverified listing. Preparation in this task is not submission approval.
8. After approval, publish deliberately, verify installation from the store, and update website/release links. Keep the unpacked pilot instructions available for existing users.

## Remaining owner inputs

- Public developer name and support/privacy email.
- Registered developer-account status and authenticated dashboard access (manual steps are acceptable; Arc will not be automated).
- Operational privacy commitments: retention/deletion handling, provider configuration, and data-use certification.
- Store-assigned ID after draft upload, and private reviewer-account setup.

## Official references checked

- [Publishing and deferred publication](https://developer.chrome.com/docs/webstore/publish)
- [Privacy fields and permission justifications](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy)
- [User-data disclosures and policy requirements](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)
- [Image requirements](https://developer.chrome.com/docs/webstore/images): 128 × 128 PNG icon, 440 × 280 small promotional image, and at least one 1280 × 800 or 640 × 400 screenshot.
