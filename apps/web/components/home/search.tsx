"use client";

// Home search box (modules.md Home › A; pagedesign.md §8.1 [DECIDED 2026-11-15]): the shared
// CatalogueSearchBox with exactly the behaviour of Search and Add. Only what happens next
// differs: a picked product → Search and Add with it marked (confirm panel open); Enter /
// "Ara" / "mağazalarda ara" → Search and Add with the text; a pasted link or a photo →
// Search and Add through InputSourceHandler.
import type { ApiError } from "@firsatgeldi/contracts";
import type { Locale, Translator } from "@firsatgeldi/i18n";
import { StatusBanner } from "@firsatgeldi/ui";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { errorMessage } from "../../lib/api/errors";
import { searchAddHref } from "../../lib/handoff";
import { CatalogueSearchBox } from "../catalogue-search/catalogue-search-box";
import { isLink, PhotoInput, useHandOverToSearchAdd } from "../input-source/input-source";

export function HomeSearch({ t, locale }: { t: Translator; locale: Locale }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const typed = query.trim();
  const handOver = useHandOverToSearchAdd(locale);
  const fileInput = useRef<HTMLInputElement>(null);
  const onError = useCallback((error: ApiError) => setProblem(errorMessage(t, error)), [t]);
  const searchText = () => {
    if (!typed) return;
    if (isLink(typed)) handOver.link(typed);
    else router.push(searchAddHref(locale, { query: typed }));
  };

  return (
    <div className="flex flex-col gap-2">
      <PhotoInput inputRef={fileInput} onFiles={handOver.files} />
      <CatalogueSearchBox
        t={t}
        query={query}
        onQueryChange={setQuery}
        signedIn
        onSubmit={searchText}
        submitting={false}
        canSubmit={typed.length > 0}
        onChoose={(product) => router.push(searchAddHref(locale, { productId: product.id }))}
        onSearchStores={searchText}
        onLink={() => handOver.link(typed)}
        onAddPhoto={() => fileInput.current?.click()}
        onError={onError}
      />
      {problem && <StatusBanner tone="danger">{problem}</StatusBanner>}
    </div>
  );
}
