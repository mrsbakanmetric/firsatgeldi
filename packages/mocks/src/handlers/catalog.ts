// ME reads, autocomplete, products and images.
import { tokens as themeTokens } from "@firsatgeldi/tokens";
import { http, HttpResponse } from "msw";
import { API_PREFIX, buildPath, ENDPOINTS } from "@firsatgeldi/contracts";
import { PRODUCT_LIST, type ProductFixture, PRODUCTS, SIMILAR, SPELLING_FIXES } from "../fixtures/catalog";
import { productKeyOf } from "../fixtures/market";
import { pick } from "../fixtures/text";
import { uuidFor } from "../ids";
import { MockApiError, permissionsOf, route } from "../route";
import { SYSTEM_SETTINGS } from "../settings";
import type { MockController } from "../state";
import { productSummary, productView } from "../views";
import { entitlements, fold, requireUser, scrubPersonalData, tokens } from "./shared";

const MS_PER_MINUTE = 60_000;

export function matchProducts(query: string, locale: "tr" | "en"): ProductFixture[] {
  const wanted = tokens(query);
  if (!wanted.length) return [];
  return PRODUCT_LIST.filter((product) => {
    const haystack = fold(pick(product.searchTerms, locale));
    return wanted.every((token) => haystack.includes(token));
  });
}

function spellingFix(query: string, locale: "tr" | "en"): string | null {
  const fixed = tokens(query).map((token) => SPELLING_FIXES[token] ?? token).join(" ");
  return fixed !== tokens(query).join(" ") && matchProducts(fixed, locale).length ? fixed : null;
}

/** Neutral placeholder image in the theme's colours; no store images in Phase 1 (implementation_plan.md §5 rule 7). */
function placeholderSvg(): string {
  const color = themeTokens.themes.light.color;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" fill="${color["surface-alt"]}"/><rect x="12" y="14" width="24" height="20" rx="3" fill="none" stroke="${color["text-muted"]}" stroke-width="2"/><circle cx="24" cy="24" r="5" fill="none" stroke="${color["text-muted"]}" stroke-width="2"/></svg>`;
}

const IMAGE_SHAS = new Set(PRODUCT_LIST.map((product) => product.imageSha256));

export function catalogHandlers(controller: MockController) {
  return [
    route(controller, "getMe", ({ actor }) => {
      const { user, userId } = requireUser(actor);
      return {
        data: {
          id: userId,
          displayName: user.displayName,
          username: user.username,
          emailMasked: user.emailMasked,
          phoneMasked: user.phoneMasked,
          locale: user.locale,
          theme: "system",
          privacyLevel: "ONLY_ME",
          roles: [...user.roles],
          permissions: permissionsOf(actor),
        },
      };
    }),

    route(controller, "getEntitlements", ({ actor }) => ({ data: entitlements(controller, actor) })),

    route(controller, "getSearchHistory", ({ actor, locale, now, empty }) => {
      const { user, userId } = requireUser(actor);
      if (empty) return { data: { items: [] } };
      const typed = controller.state.searchEvents
        .filter((row) => row.userId === userId && row.source === "SEARCH_BOX")
        .map((row) => ({ id: row.id, query: row.queryRaw, source: row.source, occurredAt: row.occurredAt }))
        .reverse();
      const fixture = user.searchHistory.map((entry, index) => ({
        id: uuidFor(`search:${user.key}:${index}`),
        query: pick(entry.query, locale),
        source: "SEARCH_BOX" as const,
        occurredAt: new Date(now.getTime() - entry.minutesAgo * MS_PER_MINUTE).toISOString(),
      }));
      return { data: { items: [...typed, ...fixture] } };
    }),

    route(controller, "autocomplete", ({ query, locale, actor, now, empty, note }) => {
      const pageSize = SYSTEM_SETTINGS["search.autocomplete_page_size"];
      const all = empty ? [] : matchProducts(query.q, locale);
      const offset = query.cursor ? Number.parseInt(query.cursor, 10) || 0 : 0;
      const page = all.slice(offset, offset + pageSize);
      const next = offset + pageSize < all.length ? String(offset + pageSize) : undefined;
      controller.state.searchEvents.push({
        id: uuidFor(`search-event:${controller.state.searchEvents.length}:${now.getTime()}`),
        userId: actor.kind === "user" ? actor.userId : null,
        anonId: actor.kind === "guest" ? actor.anonId : null,
        queryRaw: scrubPersonalData(query.q),
        locale,
        source: "AUTOCOMPLETE",
        resultCount: all.length,
        occurredAt: now.toISOString(),
      });
      note({ metadata: { source: "AUTOCOMPLETE", resultCount: all.length } });
      return {
        data: {
          items: page.map((product) => productSummary(product, locale)),
          tileCount: SYSTEM_SETTINGS["search.autocomplete_tiles"],
          didYouMean: all.length || empty ? null : spellingFix(query.q, locale),
        },
        meta: { total: all.length, ...(next ? { nextCursor: next } : {}) },
      };
    }),

    route(controller, "getProduct", ({ params, locale }) => {
      const key = productKeyOf(params.id);
      if (!key) throw new MockApiError("NOT_FOUND");
      return { data: productView(PRODUCTS[key], locale) };
    }),

    route(controller, "getSimilarProducts", ({ params, locale, empty }) => {
      const key = productKeyOf(params.id);
      if (!key) throw new MockApiError("NOT_FOUND");
      const product = PRODUCTS[key];
      const items = empty ? [] : (SIMILAR[product.family] ?? []).filter((item) => item.key !== key);
      return { data: { items: items.map((item) => ({ product: productSummary(PRODUCTS[item.key], locale), difference: item.difference })) } };
    }),

    // Catalogue images: binary, outside the JSON envelope (architecture.md §11a).
    http.get(`*${API_PREFIX}${ENDPOINTS.image.path}`, ({ params }) => {
      const sha = String(params["sha256"]);
      if (!IMAGE_SHAS.has(sha)) return new HttpResponse(null, { status: 404 });
      return new HttpResponse(placeholderSvg(), { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=31536000, immutable" } });
    }),
  ];
}

/** Image path of a catalogue image (for tests). */
export function imageRequestPath(sha256: string): string {
  return API_PREFIX + buildPath(ENDPOINTS.image.path, { sha256, variant: "CARD_480" });
}
