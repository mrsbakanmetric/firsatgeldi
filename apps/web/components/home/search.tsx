"use client";

// Home search box (modules.md Home › A; pagedesign.md §8.1, design v2): the canonical
// SearchBox (48 px, camera, ×, compact "Ara") with the user's recent searches as chips
// under it. While typing, an inline area under the box (it pushes the page down) shows
// the first matches as image tiles — no price, no store. A tile hands over to Search and
// Add with the product marked; Enter / "Ara" hands the text over; a pasted link or a
// photo goes to Search and Add (InputSourceHandler).
import type { Locale, Translator } from "@firsatgeldi/i18n";
import { chipClasses, cn, focusRing, ProductImage, SearchBox, SkeletonBlock } from "@firsatgeldi/ui";
import { keepPreviousData } from "@tanstack/react-query";
import { Package } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useApiQuery } from "../../lib/api/hooks";
import { searchAddHref } from "../../lib/handoff";
import { isLink, PhotoInput, useHandOverToSearchAdd } from "../input-source/input-source";
import { imageUrl } from "../search-add/search-box";

/** Time after the last keystroke before the catalogue is asked again. */
const TYPING_PAUSE_MS = 150;
/** Recent searches under the box (design v2 draws three chips). */
const RECENT_COUNT = 3;

function useDebounced(value: string): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), TYPING_PAUSE_MS);
    return () => clearTimeout(timer);
  }, [value]);
  return debounced;
}

export function HomeSearch({ t, locale }: { t: Translator; locale: Locale }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const typed = query.trim();
  const debounced = useDebounced(typed);
  const link = isLink(typed);
  const handOver = useHandOverToSearchAdd(locale);
  const fileInput = useRef<HTMLInputElement>(null);
  const searching = debounced.length > 0 && !link;
  const suggestions = useApiQuery("autocomplete", { query: { q: debounced } }, { enabled: searching, placeholderData: keepPreviousData });
  const recent = useApiQuery("getSearchHistory", { query: {} }, { retry: false });
  const tiles = searching ? (suggestions.data?.data.items.slice(0, suggestions.data.data.tileCount) ?? []) : [];
  const recentItems = recent.data?.data.items.slice(0, RECENT_COUNT) ?? [];

  return (
    <div className="flex flex-col gap-3">
      <PhotoInput inputRef={fileInput} onFiles={handOver.files} />
      <SearchBox
        label={t("home.search.label")}
        placeholder={t("home.search.placeholder")}
        value={query}
        onValueChange={setQuery}
        onSubmit={() => (link ? handOver.link(typed) : typed && router.push(searchAddHref(locale, { query: typed })))}
        submitLabel={t("searchAdd.search.submit")}
        submitDisabled={typed.length === 0}
        addPhotoLabel={t("searchAdd.search.addPhoto")}
        onAddPhoto={() => fileInput.current?.click()}
        clearLabel={t("trackedItems.search.clear")}
      />
      {searching ? (
        // Inline results: part of the page flow, so the content below moves down.
        <section aria-label={t("home.search.results")} aria-live="polite" className="flex flex-col gap-2">
          {suggestions.isPending ? (
            <SkeletonBlock shape="card" />
          ) : tiles.length > 0 ? (
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {tiles.map((product) => (
                <li key={product.id} className="flex">
                  <Link
                    href={searchAddHref(locale, { productId: product.id })}
                    className={cn("flex min-w-0 flex-1 items-center gap-3 rounded-lg border border-border bg-surface p-3 hover:bg-surface-alt", focusRing)}
                  >
                    <ProductImage src={imageUrl(product.imageSha256)} size="sm" fallbackIcon={Package} />
                    <span className="flex min-w-0 flex-col">
                      <span className="line-clamp-2 text-body-sm font-semibold text-text">{product.name}</span>
                      <span className="truncate text-caption text-text-muted">{product.category.name}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-caption text-text-muted">{t("home.search.noResults")}</p>
          )}
        </section>
      ) : (
        recentItems.length > 0 && (
          <ul aria-label={t("home.search.recent")} className="flex flex-wrap gap-2">
            {recentItems.map((item) => (
              <li key={item.id}>
                <Link href={searchAddHref(locale, { query: item.query })} className={chipClasses()}>
                  {item.query}
                </Link>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}
