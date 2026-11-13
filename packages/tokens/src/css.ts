// Turns the built tokens into the web theme: Tailwind v4 `@theme` variables
// plus the dark-theme overrides. Pure function; scripts/generate.ts writes the
// result to generated/theme.css. No value is defined here.
import type { BuiltTokens, Shadow } from "./build";

/** Attribute on <html> that holds the user's explicit choice ("light" | "dark"). Absent = follow the system. */
export const THEME_ATTRIBUTE = "data-theme";

type ColorMap = Record<string, string | string[]>;

const px = (value: number) => `${value}px`;

/** CSS identifiers stay bare; family names with spaces or other characters are quoted. */
function fontStack(names: readonly string[]): string {
  return names.map((name) => (/^-?[a-z][a-z0-9-]*$/i.test(name) ? name : JSON.stringify(name))).join(", ");
}

function shadow(layers: readonly Shadow[]): string {
  return layers.map((layer) => `${px(layer.x)} ${px(layer.y)} ${px(layer.blur)} ${px(layer.spread)} ${layer.color}`).join(", ");
}

function colorDeclarations(colors: ColorMap): string[] {
  return Object.entries(colors).flatMap(([role, value]) =>
    Array.isArray(value) ? value.map((entry, index) => `--color-${role}-${index + 1}: ${entry};`) : [`--color-${role}: ${value};`],
  );
}

function block(selector: string, declarations: readonly string[], indent = ""): string {
  return [`${indent}${selector} {`, ...declarations.map((line) => `${indent}  ${line}`), `${indent}}`].join("\n");
}

export function toThemeCss(tokens: BuiltTokens): string {
  const { themes, typography, motion } = tokens;
  const light = themes.light.color as ColorMap;
  const dark = themes.dark.color as ColorMap;
  const darkSelector = `:root[${THEME_ATTRIBUTE}="dark"]`;
  const systemDarkSelector = `:root:not([${THEME_ATTRIBUTE}="light"])`;

  const theme = [
    // Remove Tailwind's default scales: only token values exist as utilities.
    "--*: initial;",
    ...colorDeclarations(light),
    ...Object.entries(tokens.space).map(([key, value]) => `--spacing-${key}: ${px(value)};`),
    ...Object.entries(tokens.radius).map(([key, value]) => `--radius-${key}: ${px(value)};`),
    ...Object.entries(typography["font-family"]).map(([key, value]) => `--font-${key}: ${fontStack(value)};`),
    ...Object.entries(typography.weight).map(([key, value]) => `--font-weight-${key}: ${value};`),
    ...Object.entries(typography.scale).flatMap(([key, value]) => [
      `--text-${key}: ${px(value.size)};`,
      `--text-${key}--line-height: ${px(value.line)};`,
      `--text-${key}--font-weight: ${value.weight};`,
    ]),
    ...Object.entries(tokens.shadow)
      .filter(([, layers]) => layers.length > 0)
      .map(([key, layers]) => `--shadow-${key}: ${shadow(layers)};`),
    ...Object.entries(tokens.breakpoint).map(([key, value]) => `--breakpoint-${key}: ${px(value)};`),
    `--ease-standard: cubic-bezier(${motion.easing.join(", ")});`,
  ];

  // Values with no Tailwind namespace: used as `h-(--size-header-height)`, `duration-(--duration-fast)`.
  const plain = [
    "color-scheme: light;",
    ...Object.entries(motion.duration).map(([key, value]) => `--duration-${key}: ${value}ms;`),
    ...Object.entries(tokens["border-width"]).map(([key, value]) => `--border-width-${key}: ${px(value)};`),
    ...Object.entries(tokens.size).map(([key, value]) => `--size-${key}: ${px(value)};`),
  ];

  const darkDeclarations = ["color-scheme: dark;", ...colorDeclarations(dark)];

  return [
    `/* Generated from docs/design-tokens.json (theme "${tokens.$meta.theme}") by packages/tokens/scripts/generate.ts. Do not edit. */`,
    "",
    // `static`: every variable is emitted, so non-Tailwind code (SVG charts) can use var(--color-…).
    block("@theme static", theme),
    "",
    block(":root", plain),
    "",
    "/* Dark: the user's explicit choice … */",
    block(darkSelector, darkDeclarations),
    "",
    "/* … or the system setting, unless the user chose light. */",
    block("@media (prefers-color-scheme: dark)", [block(systemDarkSelector, darkDeclarations, "")].flatMap((text) => text.split("\n"))),
    "",
    "/* Tailwind's dark: variant follows the same rules. */",
    `@custom-variant dark {`,
    `  &:where(${darkSelector}, ${darkSelector} *) {`,
    "    @slot;",
    "  }",
    "  @media (prefers-color-scheme: dark) {",
    `    &:where(${systemDarkSelector}, ${systemDarkSelector} *) {`,
    "      @slot;",
    "    }",
    "  }",
    "}",
    "",
  ].join("\n");
}
