// The web app's real lint configuration must reject deliberate hard-coded
// values (fixtures below) and accept design-token usage.
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const eslint = new ESLint({ cwd: new URL("..", import.meta.url).pathname });

async function ruleIds(code: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath: "app/fixture.tsx" });
  return (result?.messages ?? []).map((message) => message.ruleId ?? message.message);
}

const component = (body: string) => `export function Fixture() {\n  return ${body};\n}\n`;

describe("hard-coded value lint (apps/web)", () => {
  it("accepts token classes and token variables", async () => {
    expect(await ruleIds(component(`<div className="bg-surface p-4 text-body text-text rounded-md shadow-sm h-(--size-header-height)" />`))).toEqual([]);
  });

  it.each([
    ["a colour outside the tokens", `<div className="bg-red-500" />`, "better-tailwindcss/no-unknown-classes"],
    ["a spacing step outside the tokens", `<div className="p-7" />`, "better-tailwindcss/no-unknown-classes"],
    ["a font size outside the tokens", `<div className="text-xl" />`, "better-tailwindcss/no-unknown-classes"],
    ["an arbitrary size", `<div className="w-[13px]" />`, "better-tailwindcss/no-restricted-classes"],
    ["an arbitrary colour", `<div className="bg-[#ffffff]" />`, "better-tailwindcss/no-restricted-classes"],
    ["a literal colour", `<div style={{ color: "#047857" }} />`, "firsatgeldi/no-literal-style-values"],
    ["a literal size", `<div style={{ padding: 8 }} />`, "firsatgeldi/no-literal-style-values"],
  ])("rejects %s", async (_name, body, rule) => {
    expect(await ruleIds(component(body))).toContain(rule);
  });
});
