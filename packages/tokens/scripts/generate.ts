// Reads docs/design-tokens.json (read-only; owned by the design side) and writes
// generated/tokens.json (platform-neutral, for web and the future mobile app),
// generated/tokens.ts (the same values, typed `as const`) and
// generated/theme.css (web: Tailwind theme + light/dark CSS variables).
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { buildTokens } from "../src/build.ts";
import { toThemeCss } from "../src/css.ts";

const source = new URL("../../../docs/design-tokens.json", import.meta.url);
const outDir = new URL("../generated/", import.meta.url);

const tokens = buildTokens(JSON.parse(await readFile(source, "utf8")));
const json = `${JSON.stringify(tokens, null, 2)}\n`;
const header = "// Generated from docs/design-tokens.json by scripts/generate.ts. Do not edit.\n";

await mkdir(outDir, { recursive: true });
await writeFile(new URL("tokens.json", outDir), json);
await writeFile(new URL("tokens.ts", outDir), `${header}export const tokens = ${json.trimEnd()} as const;\n\nexport type Tokens = typeof tokens;\n`);
await writeFile(new URL("theme.css", outDir), toThemeCss(tokens));
