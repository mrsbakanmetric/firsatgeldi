// Deliberate literals (test fixtures) must fail; token usage must pass.
import { RuleTester } from "eslint";
import tseslint from "typescript-eslint";
import { describe, it } from "vitest";
import rule from "./no-literal-style-values.mjs";

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const tester = new RuleTester({
  languageOptions: {
    parser: tseslint.parser,
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

tester.run("no-literal-style-values", rule, {
  valid: [
    `const a = <div className="bg-surface p-4 text-text rounded-md" />;`,
    `const a = <div className="h-(--size-header-height)" />;`,
    `const a = <div style={{ color: "var(--color-primary)", padding: "var(--spacing-4)" }} />;`,
    `const a = <div style={{ opacity: 0.4, flex: 1, zIndex: 2, margin: 0 }} />;`,
    `import x from "./icons/#anchor"; export { x };`,
    `"use client";`,
    `const link = "/help#faq";`,
    `const id = "#main-content";`,
    `const size = 16;`,
  ],
  invalid: [
    { code: `const c = "#FF5A36";`, errors: [{ messageId: "literal" }] },
    { code: `const c = "#fff";`, errors: [{ messageId: "literal" }] },
    { code: "const c = `rgba(0, 0, 0, ${0.5})`;", errors: [{ messageId: "literal" }] },
    { code: `const c = "hsl(120 50% 50%)";`, errors: [{ messageId: "literal" }] },
    { code: `const c = "oklch(0.7 0.1 150)";`, errors: [{ messageId: "literal" }] },
    { code: `const s = "12px";`, errors: [{ messageId: "literal" }] },
    { code: `const s = "0 4px 12px black";`, errors: [{ messageId: "literal" }] },
    { code: `const s = "1.5rem";`, errors: [{ messageId: "literal" }] },
    { code: `const a = <div className="p-[13px]" />;`, errors: [{ messageId: "literal" }] },
    { code: `const a = <div className="bg-[#ffffff]" />;`, errors: [{ messageId: "literal" }] },
    { code: `const a = <div style={{ padding: 8 }} />;`, errors: [{ messageId: "styleNumber" }] },
    { code: `const a = <div style={{ marginTop: -4, fontSize: 14 }} />;`, errors: [{ messageId: "styleNumber" }, { messageId: "styleNumber" }] },
    { code: `const a = <div style={{ color: "#000000" }} />;`, errors: [{ messageId: "literal" }] },
  ],
});
