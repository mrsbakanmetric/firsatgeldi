// Turns docs/design-tokens.json (the design side's single source of truth) into
// resolved, platform-neutral values. Pure functions only: the generator script
// writes the result, the tests call these directly. No value is defined here.

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };
type JsonObject = { [key: string]: Json };

export interface Shadow {
  x: number;
  y: number;
  blur: number;
  spread: number;
  color: string;
}

/** Keys that only describe usage for people; they are not values. */
const DESCRIPTIVE_KEYS = new Set(["use", "rule", "note", "description"]);

const HEX = /^#[0-9a-f]{6}$/i;
const RGBA = /^rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*(0|1|0?\.\d+)\s*\)$/i;
const PX = /^-?\d+(\.\d+)?px$/;
const MS = /^\d+(\.\d+)?ms$/;
const REFERENCE = /^\{([^{}]+)\}$/;

export class TokenError extends Error {
  override name = "TokenError";
}

function isObject(value: Json | undefined): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function child(source: JsonObject, key: string, path: string): JsonObject {
  const value = source[key];
  if (!isObject(value)) throw new TokenError(`Missing object "${path}${key}"`);
  return value;
}

export function isColor(value: string): boolean {
  return HEX.test(value) || RGBA.test(value);
}

/** "16px" → 16. Anything else is an error: sizes must be pixel values. */
export function parsePx(value: Json, path: string): number {
  if (typeof value === "string" && PX.test(value)) return Number.parseFloat(value);
  throw new TokenError(`Expected a px value at "${path}", got ${JSON.stringify(value)}`);
}

/** "120ms" → 120. */
export function parseMs(value: Json, path: string): number {
  if (typeof value === "string" && MS.test(value)) return Number.parseFloat(value);
  throw new TokenError(`Expected a ms value at "${path}", got ${JSON.stringify(value)}`);
}

/** "cubic-bezier(0.2, 0, 0, 1)" → [0.2, 0, 0, 1]. */
export function parseCubicBezier(value: Json, path: string): [number, number, number, number] {
  const match = typeof value === "string" ? /^cubic-bezier\(([^)]+)\)$/.exec(value) : null;
  const parts = match?.[1]?.split(",").map((part) => Number(part.trim())) ?? [];
  const [a, b, c, d] = parts;
  if (parts.length !== 4 || a === undefined || b === undefined || c === undefined || d === undefined || parts.some(Number.isNaN)) {
    throw new TokenError(`Expected cubic-bezier(a, b, c, d) at "${path}", got ${JSON.stringify(value)}`);
  }
  return [a, b, c, d];
}

/** "0 1px 2px rgba(…)" → [{ x, y, blur, spread, color }]; "none" → []. */
export function parseShadow(value: Json, path: string): Shadow[] {
  if (value === "none") return [];
  const match = typeof value === "string" ? /^(\S+)\s+(\S+)\s+(\S+)(?:\s+(\S+))?\s+(rgba\([^)]+\)|#[0-9a-f]{6})$/i.exec(value) : null;
  if (!match) throw new TokenError(`Unrecognised shadow at "${path}": ${JSON.stringify(value)}`);
  const [, x = "", y = "", blur = "", spread, color = ""] = match;
  const length = (part: string) => (part === "0" ? 0 : parsePx(part, path));
  if (!isColor(color)) throw new TokenError(`Unrecognised shadow colour at "${path}": ${color}`);
  return [{ x: length(x), y: length(y), blur: length(blur), spread: spread === undefined ? 0 : length(spread), color }];
}

/** "Inter, system-ui, 'Segoe UI'" → ["Inter", "system-ui", "Segoe UI"]. */
export function parseFontFamily(value: Json, path: string): string[] {
  if (typeof value !== "string" || value.trim() === "") throw new TokenError(`Expected a font list at "${path}"`);
  return value.split(",").map((name) => name.trim().replace(/^['"]|['"]$/g, ""));
}

/** Resolves "{palette.x.y}" references against the whole token document. */
export function resolveReference(root: JsonObject, value: Json, path: string, seen: string[] = []): Json {
  if (typeof value !== "string") return value;
  const match = REFERENCE.exec(value);
  if (!match?.[1]) return value;
  const target = match[1];
  if (seen.includes(target)) throw new TokenError(`Circular reference at "${path}": ${[...seen, target].join(" → ")}`);
  let current: Json | undefined = root;
  for (const key of target.split(".")) current = isObject(current) ? current[key] : undefined;
  if (current === undefined) throw new TokenError(`Unresolved reference ${value} at "${path}"`);
  return resolveReference(root, current, path, [...seen, target]);
}

function colorValue(root: JsonObject, value: Json, path: string): string | string[] {
  const resolved = resolveReference(root, value, path);
  if (typeof resolved === "string" && isColor(resolved)) return resolved;
  if (Array.isArray(resolved)) {
    return resolved.map((item, index) => {
      const entry = resolveReference(root, item, `${path}[${index}]`);
      if (typeof entry !== "string" || !isColor(entry)) throw new TokenError(`Not a colour at "${path}[${index}]": ${JSON.stringify(entry)}`);
      return entry;
    });
  }
  throw new TokenError(`Not a colour at "${path}": ${JSON.stringify(resolved)}`);
}

function mapValues<T>(source: JsonObject, path: string, map: (value: Json, path: string) => T, skipDescriptive = false): Record<string, T> {
  const out: Record<string, T> = {};
  for (const [key, value] of Object.entries(source)) {
    if (skipDescriptive && DESCRIPTIVE_KEYS.has(key)) continue;
    out[key] = map(value, `${path}${key}`);
  }
  return out;
}

function buildPalette(root: JsonObject): JsonObject {
  const walk = (value: Json, path: string): Json => {
    if (isObject(value)) return mapValues(value, `${path}.`, walk);
    if (typeof value === "string" && isColor(value)) return value;
    throw new TokenError(`Not a colour at "${path}": ${JSON.stringify(value)}`);
  };
  return walk(child(root, "palette", ""), "palette") as JsonObject;
}

function buildThemes(root: JsonObject) {
  const meta = child(root, "$meta", "");
  const active = meta["activeTheme"];
  if (typeof active !== "string") throw new TokenError(`"$meta.activeTheme" must name a theme`);
  const theme = child(child(root, "themes", ""), active, "themes.");
  const modes = ["light", "dark"] as const;
  const colors = modes.map((mode) => child(child(theme, mode, `themes.${active}.`), "color", `themes.${active}.${mode}.`));
  const [light, dark] = colors as [JsonObject, JsonObject];
  const missing = [
    ...Object.keys(light).filter((key) => !(key in dark)).map((key) => `dark.${key}`),
    ...Object.keys(dark).filter((key) => !(key in light)).map((key) => `light.${key}`),
  ];
  if (missing.length > 0) throw new TokenError(`Every colour role needs a light and a dark value; missing: ${missing.join(", ")}`);
  const build = (source: JsonObject, mode: string) => ({
    color: mapValues(source, `themes.${active}.${mode}.color.`, (value, path) => colorValue(root, value, path)),
  });
  return { name: active, themes: { light: build(light, "light"), dark: build(dark, "dark") } };
}

function buildTypography(root: JsonObject) {
  const typography = child(root, "typography", "");
  const family = child(typography, "font-family", "typography.");
  const scale = child(typography, "scale", "typography.");
  return {
    "font-family": mapValues(family, "typography.font-family.", parseFontFamily, true),
    weight: mapValues(child(typography, "weight", "typography."), "typography.weight.", (value, path) => {
      if (typeof value !== "number") throw new TokenError(`Expected a number at "${path}"`);
      return value;
    }),
    scale: mapValues(scale, "typography.scale.", (value, path) => {
      if (!isObject(value)) throw new TokenError(`Expected an object at "${path}"`);
      const weight = value["weight"];
      if (typeof weight !== "number") throw new TokenError(`Expected a weight number at "${path}.weight"`);
      const numeric = value["numeric"];
      return {
        size: parsePx(value["size"] ?? null, `${path}.size`),
        line: parsePx(value["line"] ?? null, `${path}.line`),
        weight,
        ...(typeof numeric === "string" ? { numeric } : {}),
      };
    }),
  };
}

/** Component settings keep their role references ("color.primary"); only px values become numbers. */
function buildComponents(root: JsonObject): JsonObject {
  const walk = (value: Json, path: string): Json => {
    if (isObject(value)) return mapValues(value, `${path}.`, walk, true);
    if (typeof value === "string" && PX.test(value)) return parsePx(value, path);
    return value;
  };
  return walk(child(root, "components", ""), "components") as JsonObject;
}

function buildBreakpoints(root: JsonObject): Record<string, number> {
  return mapValues(child(root, "breakpoint", ""), "breakpoint.", parsePx, true);
}

export function buildTokens(root: JsonObject) {
  const meta = child(root, "$meta", "");
  const { name, themes } = buildThemes(root);
  const motion = child(root, "motion", "");
  const { easing, ...durations } = motion;
  return {
    $meta: {
      name: meta["name"] ?? null,
      version: meta["version"] ?? null,
      source: "docs/design-tokens.json",
      theme: name,
      units: {
        dimensions: "Sizes, spacing, radii, border widths, line heights, shadow offsets and breakpoints are numbers in px (web) = dp/pt (mobile).",
        durations: "Durations are numbers in milliseconds.",
        easing: "Easing is a cubic-bezier control point list [x1, y1, x2, y2].",
        colors: "Colours are #RRGGBB or rgba(r, g, b, a) strings.",
        components: "Component values like \"color.primary\" refer to the theme's colour roles; resolve them per light/dark theme.",
      },
    },
    palette: buildPalette(root),
    themes,
    typography: buildTypography(root),
    space: mapValues(child(root, "space", ""), "space.", parsePx),
    radius: mapValues(child(root, "radius", ""), "radius.", parsePx),
    "border-width": mapValues(child(root, "border-width", ""), "border-width.", parsePx),
    shadow: mapValues(child(root, "shadow", ""), "shadow.", parseShadow),
    motion: {
      duration: mapValues(durations, "motion.", parseMs),
      easing: parseCubicBezier(easing ?? null, "motion.easing"),
    },
    size: mapValues(child(root, "size", ""), "size.", parsePx),
    breakpoint: buildBreakpoints(root),
    components: buildComponents(root),
  };
}

export type BuiltTokens = ReturnType<typeof buildTokens>;
