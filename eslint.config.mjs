import { defineConfig, globalIgnores } from "eslint/config";
import next from "eslint-config-next/core-web-vitals";
import ts from "eslint-config-next/typescript";
export default defineConfig([
  ...next,
  ...ts,
  globalIgnores([
    ".next/**",
    ".next-test/**",
    "extension/.output/**",
    "extension/.output-test/**",
    "extension/.wxt/**",
    "test-results/**",
    "playwright-report/**",
    ".impeccable/review/**",
  ]),
  { rules: { "@next/next/no-img-element": "off" } },
]);
