// Shared ESLint base for every TypeScript workspace that is not a Next.js app.
import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

export const ignores = globalIgnores([
  "**/node_modules/**",
  "**/dist/**",
  "**/.next/**",
  "**/.turbo/**",
  "**/coverage/**",
  "**/generated/**",
  "**/next-env.d.ts",
]);

export default defineConfig(ignores, js.configs.recommended, tseslint.configs.strict);
