import { THEME_ATTRIBUTE } from "@firsatgeldi/tokens";
import { afterEach, describe, expect, it, vi } from "vitest";
import { applyThemePreference, readThemePreference, THEME_STORAGE_KEY, themeInitScript, writeThemePreference } from "./theme-dom";

class MemoryStorage {
  values = new Map<string, string>();
  getItem = (key: string) => this.values.get(key) ?? null;
  setItem = (key: string, value: string) => void this.values.set(key, value);
  removeItem = (key: string) => void this.values.delete(key);
}

class FakeRoot {
  attributes = new Map<string, string>();
  setAttribute = (name: string, value: string) => void this.attributes.set(name, value);
  removeAttribute = (name: string) => void this.attributes.delete(name);
}

const blocked = {
  getItem: () => {
    throw new Error("blocked");
  },
  setItem: () => {
    throw new Error("blocked");
  },
  removeItem: () => {
    throw new Error("blocked");
  },
};

describe("stored theme preference", () => {
  it("defaults to system when nothing or something unknown is stored", () => {
    const storage = new MemoryStorage();
    expect(readThemePreference(storage)).toBe("system");
    storage.setItem(THEME_STORAGE_KEY, "sepia");
    expect(readThemePreference(storage)).toBe("system");
    expect(readThemePreference(undefined)).toBe("system");
  });

  it("stores light and dark, and forgets the choice for system", () => {
    const storage = new MemoryStorage();
    writeThemePreference(storage, "dark");
    expect(readThemePreference(storage)).toBe("dark");
    writeThemePreference(storage, "system");
    expect(storage.values.has(THEME_STORAGE_KEY)).toBe(false);
  });

  it("survives blocked storage", () => {
    expect(readThemePreference(blocked)).toBe("system");
    expect(() => writeThemePreference(blocked, "dark")).not.toThrow();
  });
});

describe("applying the preference", () => {
  it("pins light or dark on the root and unpins for system", () => {
    const root = new FakeRoot();
    applyThemePreference(root, "dark");
    expect(root.attributes.get(THEME_ATTRIBUTE)).toBe("dark");
    applyThemePreference(root, "light");
    expect(root.attributes.get(THEME_ATTRIBUTE)).toBe("light");
    applyThemePreference(root, "system");
    expect(root.attributes.has(THEME_ATTRIBUTE)).toBe(false);
  });
});

describe("inline script before first paint", () => {
  afterEach(() => vi.unstubAllGlobals());

  function run(storage: Pick<Storage, "getItem">) {
    const root = new FakeRoot();
    vi.stubGlobal("window", { localStorage: storage });
    vi.stubGlobal("document", { documentElement: root });
    new Function(themeInitScript)();
    return root;
  }

  it.each(["light", "dark"])("applies a stored %s choice", (choice) => {
    const storage = new MemoryStorage();
    storage.setItem(THEME_STORAGE_KEY, choice);
    expect(run(storage).attributes.get(THEME_ATTRIBUTE)).toBe(choice);
  });

  it.each([null, "system", "sepia"])("leaves the system setting in charge for %s", (stored) => {
    const storage = new MemoryStorage();
    if (stored !== null) storage.setItem(THEME_STORAGE_KEY, stored);
    expect(run(storage).attributes.has(THEME_ATTRIBUTE)).toBe(false);
  });

  it("does not throw when storage is blocked", () => {
    expect(run(blocked).attributes.has(THEME_ATTRIBUTE)).toBe(false);
  });
});
