import { defineConfig } from "@playwright/test";
const port = process.env.TABD_TEST_PORT || "3210";
const baseURL = `http://localhost:${port}`;
export default defineConfig({
  testDir: "./tests/browser",
  use: { baseURL, headless: true },
  webServer: {
    command: `npm run dev -- --port ${port}`,
    url: baseURL,
    reuseExistingServer: false,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
      SUPABASE_SECRET_KEY: "",
      NEXT_PUBLIC_APP_URL: baseURL,
      NEXT_PUBLIC_GOOGLE_AUTH_ENABLED: "false",
      NEXT_PUBLIC_EXTENSION_IDS: "",
      NEXT_TELEMETRY_DISABLED: "1",
    },
    timeout: 120000,
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    {
      name: "mobile",
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
