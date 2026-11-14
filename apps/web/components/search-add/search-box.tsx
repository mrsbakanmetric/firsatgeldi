"use client";

// Input step search box + autocomplete (design "1 Ara ve Ekle", AutoComplete
// A–D, compact UI v3; modules.md Search and Add "Autocomplete"): the box is
// 48 px with an icon-only photo button, × only while there is text and a
// compact "Ara". While typing, an overlay opens under the box (it never pushes
// the page) with every match in a scrollable list and a compact preview of the
// active one; the first matches also appear as image tiles, only from 4 matches
// on. ↑/↓ move, Enter chooses; Esc and a click outside close it. Our own
// catalogue only — no prices, no stores. A pasted store link is detected;
// nothing found → "mağazalarda ara".
import { type ApiError, type IdentifyResult, imagePath, type ProductSummary } from "@firsatgeldi/contracts";
import type { Translator } from "@firsatgeldi/i18n";
import { Button, chipClasses, cn, focusRing, Icon, ProductImage, SearchField, SkeletonBlock, useEscape, useOutsidePress } from "@firsatgeldi/ui";
import { Camera, Link2, Package, Store } from "lucide-react";
import { type KeyboardEvent, type ReactNode, type Ref, useEffect, useId, useMemo, useRef, useState } from "react";
import { API_BASE_URL } from "../../lib/api/config";
import { useApiMutation, useApiQuery } from "../../lib/api/hooks";

/** Time after the last keystroke before the catalogue is asked again. */
const TYPING_PAUSE_MS = 150;
/** How many recent searches are offered on an empty box (design D shows a short row). */
const RECENT_COUNT = 4;
/** Image tiles only from this many matches; with fewer the list alone shows them (no product twice). */
const TILE_MIN_MATCHES = 4;
/** Key attributes in the compact preview (pagedesign.md §8.2: 3–4). */
const PREVIEW_ATTRIBUTES = 4;
const URL_PATTERN = /^https?:\/\/\S+\.\S+/i;

export function imageUrl(sha256: string | null): string | null {
  return sha256 ? `${API_BASE_URL}${imagePath(sha256, "THUMB_160")}` : null;
}

export function isLink(text: string): boolean {
  return URL_PATTERN.test(text.trim());
}

function useDebounced(value: string): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), TYPING_PAUSE_MS);
    return () => clearTimeout(timer);
  }, [value]);
  return debounced;
}

export interface SearchBoxProps {
  t: Translator;
  /** The text input, so the empty state's way cards can focus it. */
  inputRef?: Ref<HTMLInputElement>;
  query: string;
  onQueryChange: (query: string) => void;
  signedIn: boolean;
  /** Enter / "Ara" (always "Ara", never "Yeniden ara"): identify the typed text (and ready photos). */
  onSubmit: () => void;
  submitting: boolean;
  canSubmit: boolean;
  /** A tile, a row or "Bu ürünü seç". */
  onChoose: (product: ProductSummary) => void;
  /** "… için mağazalarda ara" (catalogue miss → identify, architecture.md §11). */
  onSearchStores: () => void;
  /** "Bu linkle devam et" with the identified link. */
  onLink: (result: IdentifyResult) => void;
  /** "Fotoğraf ekle" inside the box. */
  onAddPhoto: () => void;
  /** Thumbnails of attached photos, shown inside the box. */
  below?: ReactNode;
  onError: (error: ApiError) => void;
}

export function SearchBox({ t, inputRef, query, onQueryChange, signedIn, onSubmit, submitting, canSubmit, onChoose, onSearchStores, onLink, onAddPhoto, below, onError }: SearchBoxProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const typed = query.trim();
  const link = isLink(typed);
  const debounced = useDebounced(typed);
  const searching = open && debounced.length > 0 && !link;

  const suggestions = useApiQuery("autocomplete", { query: { q: debounced } }, { enabled: searching, placeholderData: (previous) => previous });
  const recent = useApiQuery("getSearchHistory", { query: {} }, { enabled: open && signedIn && typed.length === 0, retry: false });
  const linkCheck = useApiMutation("identify", { onError });
  const { mutate: checkLink, reset: resetLink } = linkCheck;

  useEffect(() => {
    if (link) checkLink({ body: { link: typed } });
    else resetLink();
  }, [link, typed, checkLink, resetLink]);

  useEffect(() => {
    if (suggestions.isError) onError(suggestions.error);
  }, [suggestions.isError, suggestions.error, onError]);

  const items = searching && suggestions.data ? suggestions.data.data.items : [];
  const total = suggestions.data?.meta?.total ?? items.length;
  const tileCount = suggestions.data?.data.tileCount ?? 0;
  const didYouMean = searching ? (suggestions.data?.data.didYouMean ?? null) : null;
  const current = items[Math.min(active, Math.max(0, items.length - 1))] ?? null;
  const listId = `${id}-list`;
  const optionId = (index: number) => `${id}-option-${index}`;
  const noHits = searching && suggestions.isSuccess && items.length === 0 && !didYouMean;
  const showTiles = total >= TILE_MIN_MATCHES && tileCount > 0;
  const recentItems = signedIn ? (recent.data?.data.items.slice(0, RECENT_COUNT) ?? []) : [];
  // Nothing to offer on an empty box without recent searches: no overlay at all.
  const hasContent = link || typed.length > 0 || recentItems.length > 0;

  // Overlay (components.popover-dismiss): a click outside the box and its list, or Esc, closes it.
  const frame = useRef<HTMLDivElement>(null);
  const inside = useMemo(() => [frame], []);
  useOutsidePress(inside, open, () => setOpen(false));
  useEscape(open && hasContent, () => setOpen(false));

  const choose = (product: ProductSummary) => {
    setOpen(false);
    onChoose(product);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" && items.length) {
      event.preventDefault();
      setOpen(true);
      setActive((index) => Math.min(items.length - 1, index + 1));
    } else if (event.key === "ArrowUp" && items.length) {
      event.preventDefault();
      setActive((index) => Math.max(0, index - 1));
    } else if (event.key === "Escape") {
      setOpen(false);
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (open && current && items.length) choose(current);
      else if (canSubmit) {
        setOpen(false);
        onSubmit();
      }
    }
  };

  const stores = (product: ProductSummary) => t("searchAdd.suggest.stores", { count: product.storeCount });
  const meta = (product: ProductSummary) => [product.category.name, product.generation].filter(Boolean).join(t("common.listSeparator"));

  return (
    <div ref={frame} className="relative flex flex-col">
      <SearchField
        ref={inputRef}
        label={t("searchAdd.search.label")}
        hideLabel
        placeholder={t("searchAdd.search.label")}
        value={query}
        onChange={(event) => {
          onQueryChange(event.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={open && items.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        {...(open && current && items.length ? { "aria-activedescendant": optionId(items.indexOf(current)) } : {})}
        clearLabel={t("searchAdd.search.clear")}
        onClear={() => {
          onQueryChange("");
          setOpen(true);
        }}
        trailing={
          <>
            <Button variant="ghost" size="compact" iconOnly icon={Camera} label={t("searchAdd.search.addPhoto")} onClick={onAddPhoto} />
            <Button size="compact" onClick={() => (setOpen(false), onSubmit())} disabled={!canSubmit} loading={submitting}>
              {t("searchAdd.search.submit")}
            </Button>
          </>
        }
        below={below}
      />

      {open && hasContent && (
        <div className="absolute inset-x-0 top-full z-(--z-index-popover) mt-2 flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 shadow-md">
          {link ? (
            <LinkCard t={t} pending={linkCheck.isPending} result={linkCheck.data?.data ?? null} onContinue={(result) => (setOpen(false), onLink(result))} />
          ) : typed.length === 0 ? (
            <div className="flex flex-col gap-2">
              <p className="text-caption text-text-muted">{t("searchAdd.suggest.recent")}</p>
              <div className="flex flex-wrap gap-2">
                {recentItems.map((item) => (
                  <button key={item.id} type="button" onClick={() => onQueryChange(item.query)} className={chipClasses()}>
                    {item.query}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {didYouMean && (
                <button type="button" onClick={() => onQueryChange(didYouMean)} className={cn("self-start text-body-sm font-semibold text-primary underline underline-offset-4", focusRing)}>
                  {t("searchAdd.suggest.didYouMean", { query: didYouMean })}
                </button>
              )}
              {searching && suggestions.isPending && <SkeletonBlock shape="card" />}
              {items.length > 0 && (
                <div className="flex flex-col gap-4">
                  <p className="text-caption text-text-muted">
                    {[t("searchAdd.suggest.found", { count: total }), showTiles ? t("searchAdd.suggest.firstTiles", { count: tileCount }) : null, t("searchAdd.suggest.updates")]
                      .filter(Boolean)
                      .join(t("common.listSeparator"))}
                  </p>
                  {showTiles && (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    {items.slice(0, tileCount).map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => choose(product)}
                        onMouseEnter={() => setActive(items.indexOf(product))}
                        onFocus={() => setActive(items.indexOf(product))}
                        className={cn(
                          "flex items-center gap-3 rounded-md border p-3 text-left",
                          product === current ? "border-(length:--border-width-strong) border-primary" : "border-border",
                          focusRing,
                        )}
                      >
                        <ProductImage src={imageUrl(product.imageSha256)} size="sm" fallbackIcon={Package} />
                        <span className="flex min-w-0 flex-col">
                          <span className="text-body-sm font-semibold break-words text-text">{product.name}</span>
                          <span className="text-caption text-text-muted">{meta(product)}</span>
                          <span className="text-caption text-text-muted">{stores(product)}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                  )}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="flex min-w-0 flex-col gap-2">
                      <p className="text-caption text-text-muted uppercase">{t("searchAdd.suggest.allResults")}</p>
                      <ul id={listId} role="listbox" aria-label={t("searchAdd.suggest.label")} className="flex max-h-(--size-side-column-width) flex-col gap-1 overflow-y-auto">
                        {items.map((product, index) => (
                          <li
                            key={product.id}
                            id={optionId(index)}
                            role="option"
                            aria-selected={product === current}
                            onClick={() => choose(product)}
                            onMouseEnter={() => setActive(index)}
                            className={cn("flex cursor-pointer items-center gap-3 rounded-md p-2", product === current ? "bg-primary-subtle" : "hover:bg-surface-alt")}
                          >
                            <ProductImage src={imageUrl(product.imageSha256)} size="sm" fallbackIcon={Package} />
                            <span className="flex min-w-0 flex-1 flex-col">
                              <span className="text-body-sm break-words text-text">{product.name}</span>
                              <span className="text-caption text-text-muted">{meta(product)}</span>
                            </span>
                            <span className="text-caption whitespace-nowrap text-text-muted">{stores(product)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    {current && <Preview t={t} product={current} onChoose={() => choose(current)} />}
                  </div>
                  <p className="hidden text-caption text-text-muted md:block">{t("searchAdd.suggest.keyboardHint")}</p>
                </div>
              )}
              {noHits && (
                <div className="flex flex-col gap-2">
                  <p className="text-body-sm text-text">{t("searchAdd.suggest.notInCatalog")}</p>
                  <Button variant="secondary" icon={Store} onClick={() => (setOpen(false), onSearchStores())} loading={submitting}>
                    {t("searchAdd.suggest.searchStores", { query: typed })}
                  </Button>
                </div>
              )}
            </>
          )}
          {link && <p className="text-caption text-text-muted">{t("searchAdd.suggest.linkTip")}</p>}
        </div>
      )}
    </div>
  );
}

/** Compact preview (design v3): image 120 px, category, name, 3–4 key attributes, "Bu ürünü seç". */
function Preview({ t, product, onChoose }: { t: Translator; product: ProductSummary; onChoose: () => void }) {
  const rows = (
    [
      [t("searchAdd.suggest.brand"), product.brand ?? ""],
      [t("searchAdd.suggest.generation"), product.generation ?? ""],
      [t("searchAdd.suggest.colors"), product.colors.join(t("common.listSeparator"))],
      [t("searchAdd.suggest.bundles"), product.bundles.join(t("common.listSeparator"))],
    ] as [string, string][]
  )
    .filter(([, value]) => value)
    .slice(0, PREVIEW_ATTRIBUTES);
  return (
    <aside aria-label={t("searchAdd.suggest.previewLabel")} aria-live="polite" className="flex items-start gap-3 self-start rounded-md bg-surface-alt p-3">
      <ProductImage src={imageUrl(product.imageSha256)} size="lg" fallbackIcon={Package} className="bg-surface" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-col">
          <p className="text-caption text-text-muted">{[product.category.name, t("searchAdd.suggest.stores", { count: product.storeCount })].join(t("common.listSeparator"))}</p>
          <p className="text-body-sm font-semibold break-words text-text">{product.name}</p>
        </div>
        <dl className="flex flex-col gap-1 text-caption">
          {rows.map(([label, value]) => (
            <div key={label} className="flex gap-2">
              <dt className="shrink-0 text-text-muted">{label}</dt>
              <dd className="min-w-0 break-words text-text">{value}</dd>
            </div>
          ))}
        </dl>
        <Button size="compact" variant="secondary" onClick={onChoose} className="self-start">
          {t("searchAdd.suggest.choose")}
        </Button>
      </div>
    </aside>
  );
}

function LinkCard({ t, pending, result, onContinue }: { t: Translator; pending: boolean; result: IdentifyResult | null; onContinue: (result: IdentifyResult) => void }) {
  if (pending || !result) return <SkeletonBlock shape="card" />;
  const product = result.candidates[0]?.product ?? null;
  return (
    <div className="flex flex-col gap-3">
      {result.link && (
        <p className="flex items-center gap-2 text-body-sm font-semibold text-text">
          <Icon icon={Link2} className="text-primary" />
          <span>{t("searchAdd.suggest.linkDetected", { platform: result.link.platformName })}</span>
        </p>
      )}
      {product && (
        <div className="flex items-center gap-3">
          <ProductImage src={imageUrl(product.imageSha256)} size="sm" fallbackIcon={Package} />
          <span className="flex flex-col">
            <span className="text-body-sm font-semibold text-text">{product.name}</span>
            <span className="text-caption text-text-muted">{t("searchAdd.suggest.linkReads")}</span>
          </span>
        </div>
      )}
      <Button onClick={() => onContinue(result)} className="self-start">
        {t("searchAdd.suggest.linkContinue")}
      </Button>
    </div>
  );
}
