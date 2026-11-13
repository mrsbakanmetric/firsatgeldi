import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { tokens } from "../generated/tokens";
import generatedJson from "../generated/tokens.json";
import {
  buildTokens,
  parseCubicBezier,
  parseFontFamily,
  parseMs,
  parsePx,
  parseShadow,
  resolveReference,
  TokenError,
} from "./build";

const source = JSON.parse(readFileSync(new URL("../../../docs/design-tokens.json", import.meta.url), "utf8"));

describe("value parsers", () => {
  it("turns px and ms into numbers", () => {
    expect(parsePx("16px", "x")).toBe(16);
    expect(parsePx("0px", "x")).toBe(0);
    expect(parseMs("120ms", "x")).toBe(120);
    expect(() => parsePx("16rem", "x")).toThrow(TokenError);
    expect(() => parseMs("1s", "x")).toThrow(TokenError);
  });

  it("splits shadows, font lists and easing", () => {
    expect(parseShadow("0 4px 12px rgba(1,2,3,0.5)", "x")).toEqual([{ x: 0, y: 4, blur: 12, spread: 0, color: "rgba(1,2,3,0.5)" }]);
    expect(parseShadow("none", "x")).toEqual([]);
    expect(() => parseShadow("inset 0 1px", "x")).toThrow(TokenError);
    expect(parseFontFamily("Inter, 'Segoe UI', sans-serif", "x")).toEqual(["Inter", "Segoe UI", "sans-serif"]);
    expect(parseCubicBezier("cubic-bezier(0.2, 0, 0, 1)", "x")).toEqual([0.2, 0, 0, 1]);
    expect(() => parseCubicBezier("ease-in", "x")).toThrow(TokenError);
  });
});

describe("references", () => {
  const root = { a: { b: "#000000", c: "{a.b}", loop: "{a.loop}" } };

  it("resolves nested references", () => {
    expect(resolveReference(root, "{a.c}", "x")).toBe("#000000");
  });

  it("fails on unknown and circular references", () => {
    expect(() => resolveReference(root, "{a.missing}", "x")).toThrow(/Unresolved/);
    expect(() => resolveReference(root, "{a.loop}", "x")).toThrow(/Circular/);
  });
});

describe("buildTokens on docs/design-tokens.json", () => {
  const built = buildTokens(source);

  it("matches the generated files (run `pnpm generate` after changing the token file)", () => {
    expect(generatedJson).toEqual(JSON.parse(JSON.stringify(built)));
    expect(tokens).toEqual(generatedJson);
  });

  it("leaves no unresolved reference in the themes", () => {
    expect(JSON.stringify(built.themes)).not.toMatch(/\{palette\./);
  });

  it("has the same colour roles in light and dark", () => {
    expect(Object.keys(built.themes.dark.color).sort()).toEqual(Object.keys(built.themes.light.color).sort());
  });

  it("keeps only values (descriptive keys are dropped)", () => {
    expect(JSON.stringify(built)).not.toMatch(/"(use|rule|note|description)":/);
  });

  it("fails when a colour role has no dark value", () => {
    const broken = structuredClone(source);
    const theme = broken.themes[broken.$meta.activeTheme];
    delete theme.dark.color.primary;
    expect(() => buildTokens(broken)).toThrow(/missing: dark\.primary/);
  });
});
