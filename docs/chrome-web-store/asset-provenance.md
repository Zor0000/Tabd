# Store image provenance

Generated 19 October 2026 from extension version 0.1.1 at commit `7b5f2e7f758acab2e0460a44334a2b569240736b`.

- `icon-128.png`: existing packaged transparent PNG; unchanged.
- `promo-440x280.png`: existing Tabd SVG domino mark rendered on the brand dark background with isolated headless Chromium. No synthetic product claims or ratings.
- `01-save-1280x800.png`: actual production extension popup rendered by headless Chromium, with fixture collections and a synthetic example page. Branded layout states “Actual extension UI · Example content” and “Tabd account required.”
- `02-details-1280x800.png`: same popup with optional details expanded, sample tags and a sample note. No customer data or account credentials.
- `03-library-1280x800.png`: direct full-viewport screenshot of the live `/preview` sample library, not an authenticated account.
- `popup-save.png` and `popup-details.png`: raw source captures retained for inspection; upload the 1280 × 800 files to the store, not these source crops.

The fixture intercepts all extension API requests and uses a nonfunctional placeholder credential only in an ephemeral browser profile, which is deleted after capture. It does not create accounts or write production resources. Arc and SpaceO were not used. The capture script is retained locally at `artifacts/chrome-web-store/capture.mjs`.

Required image dimensions and PNG decoding are verified before packaging. Screenshots are listing illustrations of real UI; their fixture saves do not establish hosted acceptance, which was verified separately.
