// The mock API exists only in development and tests (implementation_plan.md §4).
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
// @ts-expect-error — plain ES module script without type declarations.
import { findMockLeaks, mockMarkers } from "../scripts/check-no-mock.mjs";

const workerRoute = new URL("../app/mockServiceWorker.js/route.dev.ts", import.meta.url);

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

async function loadWith(env: Record<string, string>) {
  vi.resetModules();
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  return { config: (await import("../next.config")).default };
}

describe("service worker route", () => {
  it("is a route.dev.ts file", () => {
    expect(existsSync(workerRoute)).toBe(true);
  });

  it("is not part of a production build", async () => {
    const extensions = (await loadWith({ NODE_ENV: "production" })).config.pageExtensions ?? [];
    expect(extensions.some((extension) => "route.dev.ts".endsWith(`route.${extension}`))).toBe(false);
  });
});

describe("production build check", () => {
  const dirs: string[] = [];
  afterEach(() => {
    for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  function buildDir(content: string): string {
    const dir = mkdtempSync(join(tmpdir(), "fg-build-"));
    dirs.push(dir);
    mkdirSync(join(dir, "static", "chunks"), { recursive: true });
    writeFileSync(join(dir, "static", "chunks", "app.js"), content);
    return dir;
  }

  it("reads the marker from the mock package", () => {
    expect(mockMarkers()[0]).toMatch(/^firsatgeldi-mock-api-/);
  });

  it("fails when mock code is in the output", () => {
    const [marker] = mockMarkers() as string[];
    expect(findMockLeaks(buildDir(`console.log("${marker}")`))).toHaveLength(1);
  });

  it("passes a clean output", () => {
    expect(findMockLeaks(buildDir("console.log('app')"))).toEqual([]);
  });
});
