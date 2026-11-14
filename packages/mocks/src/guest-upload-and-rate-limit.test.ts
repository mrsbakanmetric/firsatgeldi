// Decisions of 2026-11-14 (architecture.md §11a, §16.1; database.md §4, §18):
// upload status is read with `upload.own.view`, guests included, own uploads
// only; seller lookup is for signed-in users, limited per minute.
import { ApiError, type ApiLocale, ENDPOINTS } from "@firsatgeldi/contracts";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { PRODUCTS } from "./fixtures/catalog";
import { PLATFORMS } from "./fixtures/market";
import { SYSTEM_SETTINGS } from "./settings";
import { createTestApi } from "./test/harness";

const t = createTestApi();
const { api, controller } = t;
const product = PRODUCTS.acePro2FlashPrint;
const LIMIT = SYSTEM_SETTINGS["seller_lookup.rate_limit_per_minute"];
const MINUTE_MS = 60_000;
/** Both API languages; the texts behind the message keys are checked in apps/web (lib/api/errors.test.ts). */
const LOCALES = ["tr", "en"] as const satisfies readonly ApiLocale[];

beforeAll(() => t.server.listen({ onUnhandledFrame: "error" }));
afterEach(() => {
  t.signInAs("user");
  t.useLocale("tr");
  t.resetClock();
});
afterAll(() => t.server.close());

async function failure(promise: Promise<unknown>): Promise<ApiError> {
  const error = await promise.then(() => undefined, (caught: unknown) => caught);
  expect(error).toBeInstanceOf(ApiError);
  return error as ApiError;
}

async function upload(): Promise<string> {
  const presign = await api.call("presignUploads", { body: { purpose: "IDENTIFY", files: [{ mime: "image/jpeg", bytes: 10 }] } });
  const id = presign.data.uploads[0]?.uploadId;
  if (!id) throw new Error("no upload");
  return id;
}

function lookup() {
  return api.call("sellerLookup", { params: { id: product.id }, body: { platformId: PLATFORMS.HEPSIBURADA.id, name: "kamera dünyası" } });
}

describe("upload status permission", () => {
  it("GET /uploads/:id uses upload.own.view, is open to guests and logs upload.status", () => {
    expect(ENDPOINTS.getUpload).toMatchObject({ permission: "upload.own.view", public: true, activity: "upload.status" });
    expect(ENDPOINTS.presignUploads.permission).toBe("upload.own.create");
  });

  it("signed-in users hold upload.own.view", async () => {
    expect((await api.call("getMe", {})).data.permissions).toContain("upload.own.view");
  });
});

describe.each(LOCALES)("upload ownership — %s", (locale) => {
  it("a guest reads their own upload", async () => {
    t.useLocale(locale);
    t.signInAs("guest");
    const id = await upload();
    expect((await api.call("getUpload", { params: { id } })).data.id).toBe(id);
  });

  it("another guest session gets NOT_FOUND, with the message from the catalogue", async () => {
    t.useLocale(locale);
    t.signInAs("guest");
    const id = await upload();
    t.newGuestSession();
    const error = await failure(api.call("getUpload", { params: { id } }));
    expect(error.body).toEqual({ code: "NOT_FOUND", messageKey: "errors.notFound" });
  });

  it("a guest cannot read a user's upload, and a user cannot read a guest's", async () => {
    t.useLocale(locale);
    const userUpload = await upload();
    t.signInAs("guest");
    expect((await failure(api.call("getUpload", { params: { id: userUpload } }))).body.code).toBe("NOT_FOUND");
    const guestUpload = await upload();
    t.signInAs("user");
    expect((await failure(api.call("getUpload", { params: { id: guestUpload } }))).body.code).toBe("NOT_FOUND");
  });

  it("a user cannot read another user's upload", async () => {
    t.useLocale(locale);
    const id = await upload();
    t.signInAs("secondUser");
    expect((await failure(api.call("getUpload", { params: { id } }))).body.code).toBe("NOT_FOUND");
  });
});

describe("upload status logging", () => {
  it("every status read writes upload.status, refused reads included", async () => {
    t.signInAs("guest");
    const id = await upload();
    const before = controller.state.activity.length;
    await api.call("getUpload", { params: { id } });
    t.newGuestSession();
    await failure(api.call("getUpload", { params: { id } }));
    const rows = controller.state.activity.slice(before);
    expect(rows.map((row) => [row.action, row.outcome, row.targetType, row.targetId, row.userId])).toEqual([
      ["upload.status", "OK", "upload", id, null],
      ["upload.status", "ERROR", "upload", id, null],
    ]);
    expect(rows[0]?.anonId).not.toBe(rows[1]?.anonId);
  });
});

describe("seller lookup", () => {
  it("guests get UNAUTHENTICATED", async () => {
    t.signInAs("guest");
    expect((await failure(lookup())).body.code).toBe("UNAUTHENTICATED");
  });

  it.each(LOCALES)("above the per-minute limit a user gets RATE_LIMITED with its catalogue key (%s)", async (locale) => {
    t.useLocale(locale);
    t.signInAs("secondUser");
    // A window of its own for each locale, clear of the other locale's lookups.
    t.advanceClock(MINUTE_MS * 10 * (LOCALES.indexOf(locale) + 1));
    for (let call = 0; call < LIMIT; call += 1) expect((await lookup()).data.match?.sellerName).toBe("Kamera Dünyası");

    const before = controller.state.activity.length;
    const error = await failure(lookup());
    expect(error.status).toBe(429);
    expect(error.body).toEqual({ code: "RATE_LIMITED", messageKey: "errors.rateLimited" });
    expect(controller.state.activity.slice(before).map((row) => [row.action, row.outcome])).toEqual([["seller_lookup", "LIMITED"]]);

    // The limit is per user: another user is not affected.
    t.signInAs("user");
    expect((await lookup()).data.match).not.toBeNull();

    // A minute after the first lookups, the user can look up again.
    t.signInAs("secondUser");
    t.advanceClock(MINUTE_MS);
    expect((await lookup()).data.match).not.toBeNull();
  });
});
