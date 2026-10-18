import type { NextConfig } from "next";
const config: NextConfig = {
  // Keep browser tests isolated from an already-running local workspace.
  distDir: process.env.TABD_TEST_DIST_DIR || ".next",
  devIndicators: false,
  serverExternalPackages: [
    "playwright",
    "playwright-core",
    "@sparticuz/chromium",
  ],
  outputFileTracingIncludes: {
    "/api/resources/*/preview": [
      "./node_modules/@sparticuz/chromium/bin/**/*",
      // Playwright resolves this registry dynamically; Next's trace misses it.
      "./node_modules/playwright-core/browsers.json",
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};
export default config;
