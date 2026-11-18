import { describe, expect, it } from "vitest";
import { emailDomain, maskEmail, passwordAccepted, passwordRules } from "./auth";

describe("maskEmail", () => {
  it("keeps only the first letters and the domain ending, as drawn", () => {
    expect(maskEmail("serkan@ornek.com")).toBe("s***@o***.com");
    expect(maskEmail("a@b.com.tr")).toBe("a***@b***.com.tr");
  });

  it("never returns the address for malformed input", () => {
    expect(maskEmail("serkan")).toBe("***");
    expect(maskEmail("@ornek.com")).toBe("***");
    expect(maskEmail("serkan@")).toBe("***");
  });
});

describe("emailDomain", () => {
  it("returns the lower-case domain only", () => {
    expect(emailDomain("Serkan@Ornek.COM")).toBe("ornek.com");
    expect(emailDomain("serkan")).toBeNull();
  });
});

describe("passwordRules", () => {
  it("checks length, a letter and a digit", () => {
    expect(passwordRules("abc", 8)).toEqual({ length: false, letter: true, digit: false });
    expect(passwordRules("12345678", 8)).toEqual({ length: true, letter: false, digit: true });
    expect(passwordAccepted("deneme123", 8)).toBe(true);
  });

  it("counts Turkish letters as letters", () => {
    expect(passwordRules("çşğüöı12", 8)).toEqual({ length: true, letter: true, digit: true });
  });

  it("uses the configured minimum length", () => {
    expect(passwordAccepted("abc1", 4)).toBe(true);
    expect(passwordAccepted("abc1", 5)).toBe(false);
  });
});
