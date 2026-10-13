import { defineConfig } from "wxt";
import { loadEnv } from "vite";
import { appMatches } from "./lib/app-origin";
const env = loadEnv("production", process.cwd(), "WXT_");
const appUrl = new URL(
  process.env.WXT_APP_URL || env.WXT_APP_URL || "http://localhost:3000",
).origin;
const icons = {
  16: "icons/icon-16.png",
  24: "icons/icon-24.png",
  32: "icons/icon-32.png",
  48: "icons/icon-48.png",
  128: "icons/icon-128.png",
};
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  vite: () => ({
    define: { "import.meta.env.WXT_APP_URL": JSON.stringify(appUrl) },
  }),
  manifest: {
    name: "Tabd — Good finds, kept.",
    description:
      "Keep the web’s useful things. Click, choose a collection, save.",
    icons,
    permissions: ["activeTab", "storage"],
    host_permissions: appMatches(appUrl),
    externally_connectable: { matches: appMatches(appUrl) },
    action: { default_title: "Keep a good find with Tabd", default_icon: icons },
  },
});
