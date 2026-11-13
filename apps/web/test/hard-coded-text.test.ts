// The web app's real lint configuration must reject deliberate hard-coded
// visible text (fixtures below) and accept catalogue lookups.
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const eslint = new ESLint({ cwd: new URL("..", import.meta.url).pathname });

async function ruleIds(body: string): Promise<string[]> {
  const code = `declare const t: (key: string) => string;\nexport function Fixture() {\n  return ${body};\n}\n`;
  const [result] = await eslint.lintText(code, { filePath: "app/fixture.tsx" });
  return (result?.messages ?? []).map((message) => message.ruleId ?? message.message);
}

describe("hard-coded text lint (apps/web)", () => {
  it("accepts catalogue texts and non-text attributes", async () => {
    expect(await ruleIds(`<main className="p-4" aria-label={t("a")} title={t("b")}>{t("c")}</main>`)).toEqual([]);
  });

  it.each([
    ["text in JSX", `<p>Merhaba</p>`, "react/jsx-no-literals"],
    ["English text in JSX", `<p>Hello</p>`, "react/jsx-no-literals"],
    ["a string expression", `<p>{"Merhaba"}</p>`, "react/jsx-no-literals"],
    ["an aria-label", `<button aria-label="Kapat" />`, "no-restricted-syntax"],
    ["an alt text", `<img alt={"Ürün"} />`, "no-restricted-syntax"],
    ["a placeholder", `<input placeholder={\`Ara\`} />`, "no-restricted-syntax"],
    ["a title", `<div title="Close" />`, "no-restricted-syntax"],
  ])("rejects %s", async (_name, body, rule) => {
    expect(await ruleIds(body)).toContain(rule);
  });
});
