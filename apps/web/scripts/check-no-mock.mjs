// Production build check (implementation_plan.md §4: "A build check fails if the
// mock ends up in a production bundle"). Runs after `next build` and scans the
// build output for code that exists only in the mock API.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));

/** Build output folders that ship (server code and browser assets); caches are not scanned. */
export const SCANNED_DIRS = ["static", "server"];

/**
 * Strings found only in mock code: the mock package's build marker, MSW's
 * library text and its service worker's checksum constant. (The route folder
 * name "mockServiceWorker.js" may appear in the route tree; it holds no code.)
 */
export function mockMarkers() {
  const source = readFileSync(join(here, "../../../packages/mocks/src/marker.ts"), "utf8");
  const marker = /MOCK_BUILD_MARKER = "([^"]+)"/.exec(source)?.[1];
  if (!marker) throw new Error("Mock build marker not found in packages/mocks/src/marker.ts");
  return [marker, "Mock Service Worker", "INTEGRITY_CHECKSUM"];
}

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* files(path);
    else yield path;
  }
}

/** Every [file, marker] pair found under the build output. */
export function findMockLeaks(buildDir, markers = mockMarkers()) {
  const leaks = [];
  for (const sub of SCANNED_DIRS) {
    let root;
    try {
      root = statSync(join(buildDir, sub)).isDirectory() ? join(buildDir, sub) : null;
    } catch {
      root = null;
    }
    if (!root) continue;
    for (const file of files(root)) {
      const text = readFileSync(file, "latin1");
      for (const marker of markers) if (text.includes(marker)) leaks.push([file, marker]);
    }
  }
  return leaks;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const buildDir = join(here, "../.next");
  if (!statSync(join(buildDir, "static"), { throwIfNoEntry: false })) {
    console.error("check-no-mock: no production build found in .next/static");
    process.exit(1);
  }
  const leaks = findMockLeaks(buildDir);
  if (leaks.length) {
    for (const [file, marker] of leaks) console.error(`Mock API code in the production build: ${file} contains "${marker}"`);
    process.exit(1);
  }
  console.log("check-no-mock: the production build contains no mock API code.");
}
