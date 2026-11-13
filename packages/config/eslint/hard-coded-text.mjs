// Hard-coded text guard for UI code (apps/web, packages/ui): every visible text
// comes from the i18n catalogue (@firsatgeldi/i18n), never from a literal in JSX.
import { defineConfig } from "eslint/config";
import react from "eslint-plugin-react";

/** Attributes whose value is shown to people or read by assistive technology. */
const TEXT_ATTRIBUTES = [
  "alt",
  "aria-description",
  "aria-label",
  "aria-placeholder",
  "aria-roledescription",
  "aria-valuetext",
  "label",
  "placeholder",
  "title",
];

const attribute = `JSXAttribute[name.name=/^(${TEXT_ATTRIBUTES.join("|")})$/]`;
const message = "Visible text must come from the i18n catalogue (t(\"…\")), not a literal.";

/**
 * @param {{ files?: string[], registerReactPlugin?: boolean }} options
 *   registerReactPlugin: false when another config (Next.js) already registers "react".
 */
export function hardCodedText({ files = ["**/*.{tsx,jsx}"], registerReactPlugin = true } = {}) {
  return defineConfig({
    files,
    ignores: ["**/*.test.*"],
    ...(registerReactPlugin ? { plugins: { react } } : {}),
    rules: {
      // Text children: <p>Merhaba</p>, <p>{"Merhaba"}</p>, <p>{`Merhaba`}</p>.
      "react/jsx-no-literals": ["error", { noStrings: true, ignoreProps: true, allowedStrings: [] }],
      // Text attributes: aria-label="Kapat", title={"…"}, alt={`…`}.
      "no-restricted-syntax": [
        "error",
        { selector: `${attribute} > Literal`, message },
        { selector: `${attribute} > JSXExpressionContainer > Literal[value=/\\S/]`, message },
        { selector: `${attribute} > JSXExpressionContainer > TemplateLiteral`, message },
      ],
    },
  });
}
