import { defineConfig } from "wxt";
import { loadEnv } from "vite";
const env = loadEnv("production", process.cwd(), "WXT_");
const appUrl =
  process.env.WXT_APP_URL || env.WXT_APP_URL || "http://localhost:3000";
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "Tabd — Save to your library",
    description:
      "Keep the web’s useful things. Click, choose a collection, save.",
    permissions: ["activeTab", "storage"],
    host_permissions: [`${new URL(appUrl).origin}/*`],
    externally_connectable: { matches: [`${new URL(appUrl).origin}/*`] },
    action: { default_title: "Save to Tabd" },
  },
});
