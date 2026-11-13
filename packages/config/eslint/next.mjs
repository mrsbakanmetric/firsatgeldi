// ESLint for Next.js apps: Next's recommended rules + the mock-API boundary.
import { defineConfig } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { ignores } from "./base.mjs";

export default defineConfig(ignores, nextVitals, nextTs, {
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: ["@firsatgeldi/mocks", "@firsatgeldi/mocks/*"],
            message: "The mock API is for development and tests only; never import it from app code.",
          },
        ],
      },
    ],
  },
}, {
  files: ["**/*.test.ts", "**/*.test.tsx", "**/test/**", "**/dev/**"],
  rules: { "no-restricted-imports": "off" },
});
