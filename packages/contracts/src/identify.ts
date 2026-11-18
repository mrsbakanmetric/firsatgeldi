// Product identification (architecture.md §10, §16 `POST /identify`;
// database.md §11 `identify_requests`). Candidates carry no seller or price.
import { z } from "zod";
import { Id, Money } from "./common";
import { ProductSummary, SimilarDifference } from "./products";

/** `POST /identify` { text?, uploadIds?, link? } — at least one input. */
export const IdentifyRequest = z
  .object({
    text: z.string().trim().min(1).optional(),
    uploadIds: z.array(Id).min(1).optional(),
    link: z.url().optional(),
  })
  .refine((input) => input.text !== undefined || input.uploadIds !== undefined || input.link !== undefined, {
    message: "text, uploadIds or link is required",
  });
export type IdentifyRequest = z.infer<typeof IdentifyRequest>;

/** "Nasıl anladık" — one understood attribute, editable by the user. */
export const UnderstoodAttribute = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  value: z.string().min(1),
  /** 0–1 (database.md §5 `product_attributes.confidence`). */
  confidence: z.number().min(0).max(1),
  /**
   * Allowed values from the category template, in the request's language
   * (database.md §5 `category_templates.fields[].options`); the user may also type a value.
   * [ASSUMPTION — field; user decision 2026-11-14, to be written into architecture.md §16.1.]
   */
  options: z.array(z.string().min(1)),
  /** Changing it clears the mark (`category_templates.fields[].match_critical`) [ASSUMPTION — field, as above]. */
  matchCritical: z.boolean(),
});

/** A short question when one attribute is unsure (design: "Paket doğru mu?"). */
export const IdentifyQuestion = z.object({
  id: z.string().min(1),
  attributeKey: z.string().min(1),
  prompt: z.string().min(1),
  options: z.array(z.object({ id: z.string().min(1), label: z.string().min(1) })).min(2),
  selectedOptionId: z.string().nullable(),
});

/** "Hangisi seninki?" — product and variant only; no price, no store. */
export const IdentifyCandidate = z.object({
  product: ProductSummary,
  variantLine: z.string().nullable(),
  /** EXACT = full match; CLOSE = nearest product when there is no exact match (design case D). */
  match: z.enum(["EXACT", "CLOSE"]),
  difference: SimilarDifference.nullable(),
});

/**
 * A pasted store link: ours to read for the user's own purchase (design case A).
 * The platform and seller are the user's own and therefore visible. Read in the order of
 * architecture.md §10.1 › Link reading order [DECIDED 2026-11-19]: seller and price paid
 * are null while no path can read them (the user types them, design v5).
 */
export const DetectedLink = z.object({
  platformId: Id,
  platformName: z.string().min(1),
  sellerName: z.string().nullable(),
  pricePaid: Money.nullable(),
  /** What the link text says (path 1), shown as chips (design v5) [ASSUMPTION — field, to be written into architecture.md §16.1]. */
  brand: z.string().nullable(),
  /** Manufacturer model code from the link text ("1042A237-101") [ASSUMPTION — field, as above]. */
  modelCode: z.string().nullable(),
});

/**
 * Why a pasted link gave no product (design v5 edge states) [ASSUMPTION — field, as above]:
 * NOT_FOUND = the link was read but the store search found no matching product ·
 * SHORT_LINK = a share link that only redirects · UNSUPPORTED_STORE = not a launch store ·
 * NOT_A_PRODUCT_PAGE = a store page that is not a product page.
 */
export const LinkProblem = z.enum(["NOT_FOUND", "SHORT_LINK", "UNSUPPORTED_STORE", "NOT_A_PRODUCT_PAGE"]);
export type LinkProblem = z.infer<typeof LinkProblem>;

/** One product found in a multi-product image (bulk add, database.md §11 `result.items[]`). */
export const IdentifyItem = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  candidates: z.array(IdentifyCandidate),
});

/** `POST /identify` → { understood, questions[], candidates[] | items[] } (architecture.md §16). */
export const IdentifyResult = z.object({
  requestId: Id,
  understood: z.array(UnderstoodAttribute),
  questions: z.array(IdentifyQuestion),
  candidates: z.array(IdentifyCandidate),
  items: z.array(IdentifyItem),
  /** Count for "Benzer ama farklı · N"; the list comes from `GET /products/:id/similar` [ASSUMPTION]. */
  similarCount: z.number().int().nonnegative(),
  link: DetectedLink.nullable(),
  /** Set only for a link input that gave no product; null otherwise. */
  linkProblem: LinkProblem.nullable(),
});
export type IdentifyResult = z.infer<typeof IdentifyResult>;

/** `POST /identify/:requestId/answer` — answer a question or correct an understood attribute. */
export const IdentifyAnswer = z.union([
  z.object({ questionId: z.string().min(1), optionId: z.string().min(1) }),
  z.object({ attributeKey: z.string().min(1), value: z.string().trim().min(1) }),
]);
export type IdentifyAnswer = z.infer<typeof IdentifyAnswer>;
