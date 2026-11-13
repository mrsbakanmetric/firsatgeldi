// Uploads and identification (architecture.md §10, §11a; database.md §11, §14b).
import { addCalendarDays, toCalendarDay } from "@firsatgeldi/core";
import { http, HttpResponse } from "msw";
import type { ApiLocale } from "@firsatgeldi/contracts";
import { ATTRIBUTE_LABELS, type ProductFixture, PRODUCT_LIST, PRODUCTS, SIMILAR } from "../fixtures/catalog";
import { listingUrl, offerByListingUrl, OFFERS, PLATFORM_LIST, PLATFORMS, SELLERS } from "../fixtures/market";
import { pick } from "../fixtures/text";
import { ORDER_SCREENSHOT_EXTRACTION } from "../fixtures/users";
import { newId } from "../ids";
import { MockApiError, route } from "../route";
import { MOCK_SETTINGS, SYSTEM_SETTINGS } from "../settings";
import type { IdentifyRequestRow, MockController, UploadRow } from "../state";
import { money, productAttributes, productSummary, variantLine } from "../views";
import { matchProducts } from "./catalog";
import { emit, fold, sameActor, scrubPersonalData, tokens } from "./shared";

const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;
const BUNDLE_QUESTION_ID = "bundle";
/** Path of the mock object storage that presigned URLs point to. */
export const MOCK_STORAGE_PATH = "/mock-storage/quarantine";

/** Bundle question prompt (design: "Paket doğru mu?"); identification text is produced in the user's language (architecture.md §19). */
const BUNDLE_PROMPT = { tr: "Paket doğru mu?", en: "Is the bundle right?" } as const;

function familyOf(product: ProductFixture): ProductFixture[] {
  return PRODUCT_LIST.filter((item) => item.family === product.family);
}

function candidatesFor(products: readonly ProductFixture[], locale: ApiLocale, match: "EXACT" | "CLOSE", base: ProductFixture | null) {
  return products.map((product) => ({
    product: productSummary(product, locale),
    variantLine: variantLine(product, locale),
    match,
    difference:
      match === "CLOSE" && base
        ? product.generation?.tr !== base.generation?.tr
          ? ("GENERATION" as const)
          : ("BUNDLE" as const)
        : null,
  }));
}

/** Understood attributes without bundle: the bundle is asked as a question when the family has several. */
function understoodFor(product: ProductFixture, locale: ApiLocale, overrides: Record<string, string>) {
  const confidence = 0.9;
  return productAttributes(product, locale)
    .filter((attribute) => attribute.key !== "bundle")
    .map((attribute) => ({ ...attribute, value: overrides[attribute.key] ?? attribute.value, confidence }));
}

interface Resolution {
  readonly lead: ProductFixture | null;
  readonly exact: ProductFixture[];
  readonly close: ProductFixture[];
}

/** Text → products: exact = every word matches; otherwise products matching at least half the words. */
function resolveText(text: string, locale: ApiLocale): Resolution {
  const exact = matchProducts(text, locale);
  if (exact.length) {
    const lead = exact[0] ?? null;
    // One family with several bundles → offer every bundle as a candidate.
    const families = new Set(exact.map((product) => product.family));
    const expanded = families.size === 1 && lead ? familyOf(lead) : exact;
    const ordered = [...exact, ...expanded.filter((product) => !exact.includes(product))];
    return { lead, exact: ordered, close: [] };
  }
  const words = tokens(text);
  const scored = PRODUCT_LIST.map((product) => {
    const haystack = fold(pick(product.searchTerms, locale));
    return { product, hits: words.filter((word) => haystack.includes(word)).length };
  }).filter((entry) => entry.hits * 2 >= words.length && entry.hits > 0);
  const close = scored.sort((a, b) => b.hits - a.hits).map((entry) => entry.product);
  return { lead: close[0] ?? null, exact: [], close };
}

function resultFor(controller: MockController, row: IdentifyRequestRow, locale: ApiLocale, empty: boolean, link: ReturnType<typeof detectLink>) {
  const resolution = empty ? { lead: null, exact: [], close: [] } : withCorrections(resolveFor(controller, row, row.text ?? "", locale), row, locale);
  const lead = resolution.lead;
  const family = lead ? familyOf(lead) : [];
  const bundles = family.filter((product) => product.bundle !== null);
  const questions =
    bundles.length > 1
      ? [{
          id: BUNDLE_QUESTION_ID,
          attributeKey: "bundle",
          prompt: BUNDLE_PROMPT[locale],
          options: bundles.map((product) => ({ id: product.key, label: product.bundle ? pick(product.bundle, locale) : pick(product.name, locale) })),
          selectedOptionId: row.selectedOptions[BUNDLE_QUESTION_ID] ?? (resolution.exact[0]?.bundle ? resolution.exact[0].key : null),
        }]
      : [];
  return {
    requestId: row.id,
    understood: lead ? understoodFor(lead, locale, row.attributes) : [],
    questions,
    candidates: [...candidatesFor(resolution.exact, locale, "EXACT", lead), ...candidatesFor(resolution.close, locale, "CLOSE", lead)],
    items: [],
    similarCount: lead && !empty ? (SIMILAR[lead.family] ?? []).length : 0,
    link,
  };
}

/** Applies the user's attribute corrections ("Nasıl anladık · özelliği değiştir"). */
function withCorrections(base: Resolution, row: IdentifyRequestRow, locale: ApiLocale): Resolution {
  const corrections = Object.entries(row.attributes);
  if (!corrections.length || !base.lead) return base;
  const lower = fold;
  const matches = PRODUCT_LIST.filter(
    (product) =>
      product.brand === base.lead?.brand &&
      corrections.every(([key, value]) => productAttributes(product, locale).some((attribute) => attribute.key === key && lower(attribute.value) === lower(value))),
  );
  return matches.length ? { lead: matches[0] ?? null, exact: matches, close: [] } : { lead: base.lead, exact: [], close: familyOf(base.lead) };
}

function resolveFor(controller: MockController, row: IdentifyRequestRow, text: string, locale: ApiLocale): Resolution {
  if (row.link) {
    const offer = offerByListingUrl(row.link);
    if (offer) {
      const product = PRODUCTS[offer.product];
      return { lead: product, exact: [product], close: [] };
    }
  }
  if (row.uploadIds.length) {
    const ready = row.uploadIds.map((id) => controller.state.uploads.get(id)).filter((upload) => upload?.status === "READY");
    if (ready.length) {
      const product = PRODUCTS.acePro2FlashPrint;
      return { lead: product, exact: familyOf(product).sort((a) => (a === product ? -1 : 1)), close: [] };
    }
  }
  return resolveText(text, locale);
}

/** A pasted link of a known store: the user's own platform, seller and price (design case A). */
function detectLink(link: string | null) {
  if (!link) return null;
  const host = new URL(link).hostname.replace(/^www\./, "");
  const platform = PLATFORM_LIST.find((item) => host === item.domain);
  if (!platform) return null;
  const offer = offerByListingUrl(link);
  return {
    platformId: platform.id,
    platformName: platform.name,
    sellerName: offer ? SELLERS[offer.seller].name : null,
    pricePaid: offer ? money(offer.priceMinor) : null,
  };
}

function ownUpload(controller: MockController, id: string, actor: UploadRow["owner"]): UploadRow {
  const upload = controller.state.uploads.get(id);
  if (!upload || !sameActor(upload.owner, actor)) throw new MockApiError("NOT_FOUND");
  return upload;
}

export function identifyHandlers(controller: MockController) {
  const { state } = controller;
  return [
    route(controller, "presignUploads", ({ body, actor, now, origin, note }) => {
      const maxFiles = SYSTEM_SETTINGS["media.max_images_per_request"];
      if (body.files.length > maxFiles) throw new MockApiError("VALIDATION", { params: { max: maxFiles } });
      const tooLarge = body.files.findIndex((file) => file.bytes > SYSTEM_SETTINGS["media.max_bytes"]);
      if (tooLarge >= 0) throw new MockApiError("VALIDATION", { fields: { [`files.${tooLarge}.bytes`]: "errors.validation" } });
      const batchId = newId();
      const expiresAt = new Date(now.getTime() + MOCK_SETTINGS.presignMinutes * MS_PER_MINUTE).toISOString();
      const purgeAt = new Date(now.getTime() + SYSTEM_SETTINGS["media.private_retention_hours"] * MS_PER_HOUR).toISOString();
      const uploads = body.files.map((file, position) => {
        const upload: UploadRow = {
          id: newId(), batchId, owner: actor, purpose: body.purpose, position, declaredMime: file.mime, declaredBytes: file.bytes,
          status: "PRESIGNED", rejectReason: null, expiresAt, purgeAt,
        };
        state.uploads.set(upload.id, upload);
        return {
          uploadId: upload.id, position, uploadUrl: `${origin}${MOCK_STORAGE_PATH}/${upload.id}`, method: "PUT" as const,
          headers: { "Content-Type": file.mime }, expiresAt,
        };
      });
      note({ targetType: "upload_batch", targetId: batchId, metadata: { stage: "PRESIGN", purpose: body.purpose, count: body.files.length } });
      return { data: { batchId, uploads } };
    }),

    // Direct upload to object storage (not through the API, architecture.md §11a step 2).
    http.put(`*${MOCK_STORAGE_PATH}/:id`, ({ params }) => {
      const upload = state.uploads.get(String(params["id"]));
      if (!upload || upload.status !== "PRESIGNED") return new HttpResponse(null, { status: 403 });
      upload.status = "UPLOADED";
      return new HttpResponse(null, { status: 200 });
    }),

    route(controller, "completeUploads", ({ body, actor, note }) => {
      const batch = [...state.uploads.values()].filter((upload) => upload.batchId === body.batchId && sameActor(upload.owner, actor));
      if (!batch.length) throw new MockApiError("NOT_FOUND");
      for (const upload of batch) {
        if (upload.status !== "UPLOADED") continue;
        upload.status = "PROCESSING";
        controller.schedule(() => {
          upload.status = "READY";
          emit(controller, actor, { type: "upload.ready", data: { uploadId: upload.id, batchId: upload.batchId } });
        }, MOCK_SETTINGS.processingMs);
      }
      note({ targetType: "upload_batch", targetId: body.batchId, metadata: { stage: "COMPLETE", count: batch.length } });
      return { data: { batchId: body.batchId, uploads: batch.map((upload) => ({ uploadId: upload.id, status: upload.status })) } };
    }),

    route(controller, "getUpload", ({ params, actor, locale, now }) => {
      const upload = ownUpload(controller, params.id, actor);
      const extracted =
        upload.status === "READY" && upload.purpose === "ORDER_SCREENSHOT"
          ? (() => {
              const seller = SELLERS[ORDER_SCREENSHOT_EXTRACTION.seller];
              const offer = OFFERS.find((item) => item.seller === ORDER_SCREENSHOT_EXTRACTION.seller);
              return {
                productText: pick(ORDER_SCREENSHOT_EXTRACTION.productText, locale),
                sellerName: seller.name,
                platformName: PLATFORMS[seller.platform].name,
                pricePaid: offer ? money(offer.priceMinor) : null,
                orderedOn: addCalendarDays(toCalendarDay(now), -ORDER_SCREENSHOT_EXTRACTION.orderedDaysAgo),
              };
            })()
          : null;
      return {
        data: {
          id: upload.id, batchId: upload.batchId, purpose: upload.purpose, position: upload.position, status: upload.status,
          rejectReason: upload.rejectReason, extracted, purgeAt: upload.purgeAt,
        },
      };
    }),

    route(controller, "identify", ({ body, actor, locale, now, empty, note }) => {
      for (const id of body.uploadIds ?? []) ownUpload(controller, id, actor);
      const row: IdentifyRequestRow = {
        id: newId(), owner: actor, attributes: {}, selectedOptions: {},
        text: body.text ?? null, uploadIds: body.uploadIds ?? [], link: body.link ?? null,
      };
      state.identifyRequests.set(row.id, row);
      const source = body.link ? "LINK" : body.uploadIds ? "PHOTO" : "SEARCH_BOX";
      const result = resultFor(controller, row, locale, empty, detectLink(row.link));
      if (body.text) {
        state.searchEvents.push({
          id: newId(), userId: actor.kind === "user" ? actor.userId : null, anonId: actor.kind === "guest" ? actor.anonId : null,
          queryRaw: scrubPersonalData(body.text), locale, source, resultCount: result.candidates.length, occurredAt: now.toISOString(),
        });
      }
      note({ targetType: "identify_request", targetId: row.id, metadata: { source, candidateCount: result.candidates.length } });
      return { data: result };
    }),

    route(controller, "answerIdentify", ({ params, body, actor, locale, empty, note }) => {
      const row = state.identifyRequests.get(params.requestId);
      if (!row || !sameActor(row.owner, actor)) throw new MockApiError("NOT_FOUND");
      if ("questionId" in body) {
        if (body.questionId !== BUNDLE_QUESTION_ID) throw new MockApiError("VALIDATION", { fields: { questionId: "errors.validation" } });
        row.selectedOptions[body.questionId] = body.optionId;
      } else {
        if (!(body.attributeKey in ATTRIBUTE_LABELS)) throw new MockApiError("VALIDATION", { fields: { attributeKey: "errors.validation" } });
        row.attributes[body.attributeKey] = body.value;
      }
      note({ targetType: "identify_request", targetId: row.id, metadata: { answer: "questionId" in body ? "QUESTION" : "ATTRIBUTE" } });
      return { data: resultFor(controller, row, locale, empty, detectLink(row.link)) };
    }),
  ];
}

export { listingUrl };
