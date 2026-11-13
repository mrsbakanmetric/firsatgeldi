// Dependency boundary for platform-independent packages (core, contracts):
// no UI framework, no web-only package, no mock data. The future mobile
// client must be able to reuse them unchanged (architecture.md §2).
import { defineConfig } from "eslint/config";
import base from "./base.mjs";

export default defineConfig(base, {
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: ["react", "react/*", "react-dom", "react-dom/*", "react-native", "react-native/*"],
            message: "This package is framework-free; UI frameworks are not allowed here.",
          },
          {
            group: ["next", "next/*", "@next/*"],
            message: "This package is framework-free; Next.js is not allowed here.",
          },
          {
            group: ["@firsatgeldi/ui", "@firsatgeldi/ui/*", "@firsatgeldi/web", "@firsatgeldi/web/*"],
            message: "Framework-free packages must not depend on UI or app code.",
          },
          {
            group: ["@firsatgeldi/mocks", "@firsatgeldi/mocks/*"],
            message: "Production code must not import the mock API.",
          },
        ],
      },
    ],
  },
});
