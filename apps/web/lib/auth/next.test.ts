import { describe, expect, it } from "vitest";
import { clock } from "./countdown";
import { safeNext, signInHref, signUpHref } from "./next";

describe("safeNext", () => {
  it("keeps a page of this site with its query", () => {
    expect(safeNext("/tr/ara?devam=1", "tr")).toBe("/tr/ara?devam=1");
    expect(safeNext("/en/tracking/42", "tr")).toBe("/en/tracking/42");
  });

  it("never leaves the site", () => {
    for (const raw of ["https://evil.test/tr", "//evil.test/tr", "/\\evil.test", "javascript:alert(1)", "tr/ara", "/xx/ara", "", null, undefined]) {
      expect(safeNext(raw, "tr")).toBe("/tr");
    }
    expect(safeNext("https://evil.test", "en")).toBe("/en");
  });
});

describe("signInHref", () => {
  it("adds the encoded return path", () => {
    expect(signInHref("tr", "/tr/ara?devam=1")).toBe("/tr/giris?next=%2Ftr%2Fara%3Fdevam%3D1");
    expect(signInHref("en")).toBe("/en/sign-in");
    expect(signUpHref("en")).toBe("/en/sign-in?mod=kayit");
    expect(signUpHref("tr", "/tr")).toBe("/tr/giris?next=%2Ftr&mod=kayit");
  });
});

describe("clock", () => {
  it("shows minutes and two-digit seconds", () => {
    expect(clock(872)).toBe("14:32");
    expect(clock(58)).toBe("0:58");
    expect(clock(0)).toBe("0:00");
  });
});
