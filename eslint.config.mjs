import { defineConfig } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/** Ignores must be first so ESLint does not crawl huge trees (e.g. `.next`, `node_modules`). */
const eslintConfig = defineConfig([
  {
    ignores: [
      "**/node_modules/**",
      ".next/**",
      ".next-local/**",
      ".next.bak-*/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "*.tsbuildinfo",
    ],
  },
  ...nextVitals,
  ...nextTs,
]);

export default eslintConfig;
