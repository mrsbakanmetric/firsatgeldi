import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { tokens } from "../generated/tokens";
import { THEME_ATTRIBUTE, toThemeCss } from "./css";

const css = toThemeCss(tokens as never);
const generated = readFileSync(new URL("../generated/theme.css", import.meta.url), "utf8");

/** Text of the first block that starts with `selector {`. */
function blockOf(selector: string): string {
  const start = css.indexOf(`${selector} {`);
  expect(start, `block "${selector}" exists`).toBeGreaterThanOrEqual(0);
  let depth = 0;
  for (let index = css.indexOf("{", start); index < css.length; index += 1) {
    if (css[index] === "{") depth += 1;
    if (css[index] === "}") depth -= 1;
    if (depth === 0) return css.slice(start, index + 1);
  }
  throw new Error(`Unclosed block "${selector}"`);
}

const declarations = (colors: Record<string, string | readonly string[]>) =>
  Object.entries(colors).flatMap(([role, value]) =>
    typeof value === "string" ? [`--color-${role}: ${value};`] : value.map((entry, index) => `--color-${role}-${index + 1}: ${entry};`),
  );

describe("theme.css", () => {
  it("is the file the generator wrote", () => {
    expect(generated).toBe(css);
  });

  it("removes Tailwind's default scales", () => {
    expect(blockOf("@theme static")).toContain("--*: initial;");
  });

  it("defines every light colour role in the theme", () => {
    const theme = blockOf("@theme static");
    for (const line of declarations(tokens.themes.light.color)) expect(theme).toContain(line);
  });

  it.each([`:root[${THEME_ATTRIBUTE}="dark"]`, "@media (prefers-color-scheme: dark)"])("defines every dark colour role in %s", (selector) => {
    const dark = blockOf(selector);
    expect(dark).toContain("color-scheme: dark;");
    for (const line of declarations(tokens.themes.dark.color)) expect(dark).toContain(line);
  });

  it("lets the user's light choice win over a dark system setting", () => {
    expect(blockOf("@media (prefers-color-scheme: dark)")).toContain(`:root:not([${THEME_ATTRIBUTE}="light"])`);
  });

  it("exposes spacing, radius, type scale and breakpoints from the tokens only", () => {
    const theme = blockOf("@theme static");
    for (const [key, value] of Object.entries(tokens.space)) expect(theme).toContain(`--spacing-${key}: ${value}px;`);
    for (const [key, value] of Object.entries(tokens.radius)) expect(theme).toContain(`--radius-${key}: ${value}px;`);
    for (const [key, value] of Object.entries(tokens.typography.scale)) {
      expect(theme).toContain(`--text-${key}: ${value.size}px;`);
      expect(theme).toContain(`--text-${key}--line-height: ${value.line}px;`);
    }
    expect(theme).toContain(`--breakpoint-md: ${tokens.breakpoint.md}px;`);
    expect(theme).not.toMatch(/--spacing:/);
  });

  it("quotes font names that contain spaces", () => {
    const spaced = Object.values(tokens.typography["font-family"]).flat().filter((name) => name.includes(" "));
    for (const name of spaced) expect(blockOf("@theme static")).toContain(JSON.stringify(name));
  });

  it("leaves no unresolved token reference", () => {
    expect(css).not.toMatch(/\{palette\.|undefined|NaN/);
  });
});
