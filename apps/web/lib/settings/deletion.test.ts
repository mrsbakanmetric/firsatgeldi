import { describe, expect, it } from "vitest";
import { deletionDate, deletionHomeHref } from "./deletion";

describe("the Home banner after deleting the account", () => {
  it("carries the restore date in the address and reads it back", () => {
    const href = deletionHomeHref("/tr", "2026-12-18T20:15:00.000Z");
    expect(href).toBe("/tr?deletion=2026-12-18");
    expect(deletionDate(href.slice(href.indexOf("?")))?.toISOString()).toBe("2026-12-18T12:00:00.000Z");
  });

  it("no banner without a valid date", () => {
    expect(deletionDate(null)).toBeNull();
    expect(deletionDate("")).toBeNull();
    expect(deletionDate("?deletion=yarın")).toBeNull();
    expect(deletionDate("?deletion=2026-13-45")).toBeNull();
  });
});
