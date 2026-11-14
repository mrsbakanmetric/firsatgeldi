import { ApiError, ERRORS, NETWORK_ERROR_MESSAGE_KEY } from "@firsatgeldi/contracts";
import { createTranslator, LOCALES, type TranslationKey } from "@firsatgeldi/i18n";
import { describe, expect, it } from "vitest";
import { errorMessage } from "./errors";

const keys = [...Object.values(ERRORS).map((error) => error.messageKey), NETWORK_ERROR_MESSAGE_KEY];

describe.each(LOCALES)("API error messages — %s", (locale) => {
  const t = createTranslator(locale);

  it.each(keys)("%s is in the catalogue", (key) => {
    expect(t(key as TranslationKey)).not.toBe("");
  });

  it("translates an API error by its message key, never showing the code", () => {
    const text = errorMessage(t, new ApiError("api", 409, { code: "ALREADY_TRACKING", messageKey: "errors.alreadyTracking" }));
    expect(text).toBe(t("errors.alreadyTracking"));
    expect(text).not.toContain("ALREADY_TRACKING");
  });

  it("seller lookup above its per-minute limit reads as the decided text (modules.md Search and Add)", () => {
    const text = errorMessage(t, new ApiError("api", 429, { code: "RATE_LIMITED", messageKey: "errors.rateLimited" }));
    expect(text).toBe(locale === "tr" ? "Çok sık denedin. Biraz bekleyip tekrar dene." : "Too many tries. Wait a moment and try again.");
  });

  it("falls back to the general message for an unknown key or a non-API error", () => {
    expect(errorMessage(t, new ApiError("api", 400, { code: "VALIDATION", messageKey: "errors.somethingNew" }))).toBe(t("errors.internal"));
    expect(errorMessage(t, new Error("boom"))).toBe(t("errors.internal"));
  });
});
