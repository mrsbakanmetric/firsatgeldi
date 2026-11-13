// The shell preview [DECIDED 2026-11-14] exists only in development: its page
// file uses an extension a production build does not know.
import { existsSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";

const previewPage = new URL("../app/[locale]/dev/shell/page.dev.tsx", import.meta.url);

async function loadConfig(nodeEnv: string) {
  vi.resetModules();
  vi.stubEnv("NODE_ENV", nodeEnv);
  return (await import("../next.config")).default;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("development-only shell preview", () => {
  it("is a page.dev.tsx file", () => {
    expect(existsSync(previewPage)).toBe(true);
  });

  it("is a page in development", async () => {
    expect((await loadConfig("development")).pageExtensions).toContain("dev.tsx");
  });

  it("is not part of a production build", async () => {
    const extensions = (await loadConfig("production")).pageExtensions ?? [];
    expect(extensions).not.toContain("dev.tsx");
    expect(extensions.some((extension) => "page.dev.tsx".endsWith(`page.${extension}`))).toBe(false);
  });
});
