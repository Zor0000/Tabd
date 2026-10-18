import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const fixture = process.argv.includes("--test");
// Local .env files configure `npm run dev`, never the installed release.
// Tests get their own directory so they cannot overwrite a loaded extension.
const origin = fixture
  ? "http://localhost:3000"
  : process.env.WXT_APP_URL || "https://www.tab-dd.tech";
const url = new URL(origin);
if (!fixture && (url.protocol !== "https:" || url.username || url.password))
  throw new Error("Release builds require an HTTPS WXT_APP_URL.");
const result = spawnSync(
  process.execPath,
  ["node_modules/wxt/bin/wxt.mjs", "build"],
  {
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    stdio: "inherit",
    env: {
      ...process.env,
      WXT_APP_URL: url.origin,
      TABD_EXTENSION_OUT_DIR: fixture ? ".output-test" : ".output",
    },
  },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
