# Tabd extension 0.1.1

Built 19 October 2026 from main commit `7b5f2e7f758acab2e0460a44334a2b569240736b`.

This is an **unpacked desktop Chrome-compatible extension release**, not a Chrome Web Store publication. Arc saving and pairing were previously verified by the owner. Updates are manual.

## Release files

- Public download: [GitHub release](https://github.com/Zor0000/Tabd/releases/tag/extension-v0.1.1)
- Local ZIP: `artifacts/releases/extension-v0.1.1/tabd-extension-0.1.1-chrome-mv3.zip`
- Integrity: `artifacts/releases/extension-v0.1.1/SHA256SUMS`
- Inspected manifest: `artifacts/releases/extension-v0.1.1/manifest.json`
- Existing loadable directory: `extension/.output/chrome-mv3`

The ZIP contains the manifest at its root, ten runtime files, and no environment files, credentials, source maps, test fixtures, or dependencies. Its SHA-256 is `79e0bf8dc38b2842b5409dbc1d22778414cb19c6189c2f82c038327707092887`.

## Install a new copy

1. Download the ZIP and checksum from the selected release channel. Extract to a permanent folder; do not load the ZIP itself.
2. Open the browser's Extensions page (`chrome://extensions` in Chrome), enable Developer mode, select **Load unpacked**, and select the extracted folder containing `manifest.json`.
3. Copy the extension ID shown there. Before pairing, the Tabd operator must add that ID to production `NEXT_PUBLIC_EXTENSION_IDS` while preserving existing IDs, then deploy the updated configuration. A new unpacked directory can produce a new ID. Do not remove the pairing allowlist to work around this requirement.
4. Sign in at https://www.tab-dd.tech in the same browser profile. Open Tabd's toolbar popup, choose **Connect to Tabd**, and confirm the connection on the website.
5. Visit a page, open Tabd, choose a collection, and save. Confirm the page appears in your website library. If the connection expires, reconnect; extension access lasts 30 days and can be revoked in library Settings.

Until a stable distribution ID is established, this is an operator-assisted pilot installation path. A public ZIP alone does not make pairing work for every new user.

## Update the owner's verified installation

The verified owner installation ID is `obfbelnckoidbghkmgibhbfedcgcfpmb`. Keep its existing `extension/.output/chrome-mv3` directory in place.

The release build has already refreshed that directory. In the browser's Extensions page, click **Reload** on the existing Tabd entry; do not remove and reinstall it or move the folder. Confirm version 0.1.1 and the same ID. Refresh any open Tabd connection page before reconnecting. Existing saved resources live in the account, not this folder.

For future ZIP updates, close the popup, replace runtime files in the same permanent directory with the extracted release, and reload the existing extension. Keep the directory stable. Retain the prior release if rollback is needed; restore its runtime files in that same directory and reload.

## Permissions and verification

- Manifest V3, version 0.1.1.
- `activeTab`: access the page selected when the user invokes the extension.
- `storage`: persist the extension connection locally.
- Host access and external messaging: only `https://www.tab-dd.tech/*`.
- Both compiled entrypoints use `https://www.tab-dd.tech` as their configured origin. Shared development helpers contain localhost strings, but their development branch is disabled for this configured origin; the manifest grants no localhost access.
- Headless Chromium verified the production-origin external-message handshake and actual toolbar popup dimensions of 360 × 298. ZIP extraction integrity and byte-for-byte correspondence with the release directory passed.

Rebuild with `WXT_APP_URL=https://www.tab-dd.tech npm run build --prefix extension`. Tests must use `extension/.output-test`; do not overwrite the installed release with a test build.

## Distribution decision

Distribution uses the public [GitHub release](https://github.com/Zor0000/Tabd/releases/tag/extension-v0.1.1), with this guide and checksum. This remains an unpacked pilot release with operator-assisted ID registration. The owner authorized making the source repository public on 19 October 2026. Do not post tokens or account information in public issues.

For Chrome Web Store distribution, prepare a store listing and privacy disclosures, upload the package using the owner's publisher account, obtain the assigned extension ID, allowlist it in production, and complete store review. This work has not submitted or published a store listing. A store installation needs its own pairing verification; the unpacked acceptance does not establish that result.
