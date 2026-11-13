// Hard-coded value guard for UI code (apps/web, packages/ui): only design-token
// classes and variables. Tailwind's default scales are removed by the generated
// theme (@firsatgeldi/tokens/theme.css), so any class outside the tokens is unknown.
import { defineConfig } from "eslint/config";
import betterTailwind from "eslint-plugin-better-tailwindcss";
import { getDefaultSelectors } from "eslint-plugin-better-tailwindcss/api/defaults";
import { MatcherType, SelectorKind } from "eslint-plugin-better-tailwindcss/api/types";
import noLiteralStyleValues from "./rules/no-literal-style-values.mjs";

/**
 * Class lists are also checked in constants named `*_CLASSES` and their object
 * values (variant maps such as `const VARIANT_CLASSES = { primary: "bg-primary …" }`),
 * not only in className and cn().
 */
const CLASS_MAP_SELECTOR = {
  kind: SelectorKind.Variable,
  name: "^[A-Z][A-Z0-9_]*_CLASSES$",
  match: [{ type: MatcherType.String }, { type: MatcherType.ObjectValue }],
};

/**
 * @param {{ entryPoint: string, files?: string[] }} options
 *   entryPoint: the app's Tailwind CSS entry (imports the generated theme).
 */
export function hardCodedValues({ entryPoint, files = ["**/*.{ts,tsx,js,jsx,mjs}"] }) {
  return defineConfig({
    files,
    ignores: ["**/*.test.*", "**/*.config.*"],
    plugins: {
      "better-tailwindcss": betterTailwind,
      firsatgeldi: { rules: { "no-literal-style-values": noLiteralStyleValues } },
    },
    settings: {
      "better-tailwindcss": { entryPoint, selectors: [...getDefaultSelectors(), CLASS_MAP_SELECTOR] },
    },
    rules: {
      ...betterTailwind.configs["correctness-error"].rules,
      "better-tailwindcss/no-unknown-classes": "error",
      "better-tailwindcss/no-restricted-classes": [
        "error",
        {
          restrict: [
            {
              pattern: "^.*\\[.*\\].*$",
              message: "Arbitrary value \"$0\": use a design-token class or (--token) variable instead.",
            },
          ],
        },
      ],
      "firsatgeldi/no-literal-style-values": "error",
    },
  });
}
