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
 * The platform and seller are the user's own and therefore visible.
 */
export const DetectedLink = z.object({
  platformId: Id,
  platformName: z.string().min(1),
  sellerName: z.string().nullable(),
  pricePaid: Money.nullable(),
});

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
});
export type IdentifyResult = z.infer<typeof IdentifyResult>;

/** `POST /identify/:requestId/answer` — answer a question or correct an understood attribute. */
export const IdentifyAnswer = z.union([
  z.object({ questionId: z.string().min(1), optionId: z.string().min(1) }),
  z.object({ attributeKey: z.string().min(1), value: z.string().trim().min(1) }),
]);
export type IdentifyAnswer = z.infer<typeof IdentifyAnswer>;
