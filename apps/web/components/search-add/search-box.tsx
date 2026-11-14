"use client";

// Input step search box + autocomplete (design "1 Ara ve Ekle", AutoComplete
// A–D; modules.md Search and Add "Autocomplete"): while typing, an area opens
// under the box (pushing the page down) with the first matches as image tiles,
// every match in a scrollable list and a preview of the active one. ↑/↓ move,
// Enter chooses, Esc closes. Our own catalogue only — no prices, no stores.
// A pasted store link is detected; nothing found → "mağazalarda ara".
import { type ApiError, type IdentifyResult, imagePath, type ProductSummary } from "@firsatgeldi/contracts";
import type { Translator } from "@firsatgeldi/i18n";
import { Button, cn, focusRing, Icon, ProductImage, SearchField, SkeletonBlock } from "@firsatgeldi/ui";
import { Camera, Link2, Package, Search, Store } from "lucide-react";
import { type KeyboardEvent, type ReactNode, useEffect, useId, useState } from "react";
import { API_BASE_URL } from "../../lib/api/config";
import { useApiMutation, useApiQuery } from "../../lib/api/hooks";

/** Time after the last keystroke before the catalogue is asked again. */
const TYPING_PAUSE_MS = 150;
/** How many recent searches are offered on an empty box (design D shows a short row). */
const RECENT_COUNT = 4;
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
  query: string;
  onQueryChange: (query: string) => void;
  signedIn: boolean;
  /** Enter / "Ara": identify the typed text (and ready photos). */
  onSubmit: () => void;
  /** "Ara" in the input step, "Yeniden ara" once there are results. */
  submitLabel: string;
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

export function SearchBox({ t, query, onQueryChange, signedIn, onSubmit, submitLabel, submitting, canSubmit, onChoose, onSearchStores, onLink, onAddPhoto, below, onError }: SearchBoxProps) {
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
    <div className="flex flex-col gap-3">
      <SearchField
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
            <Button variant="ghost" icon={Camera} onClick={onAddPhoto} className="hidden md:inline-flex">
              {t("searchAdd.search.addPhoto")}
            </Button>
            <Button variant="ghost" iconOnly icon={Camera} label={t("searchAdd.search.addPhoto")} onClick={onAddPhoto} className="md:hidden" />
            <Button onClick={() => (setOpen(false), onSubmit())} disabled={!canSubmit} loading={submitting} className="hidden md:inline-flex">
              {submitLabel}
            </Button>
            <Button iconOnly icon={Search} label={submitLabel} onClick={() => (setOpen(false), onSubmit())} disabled={!canSubmit} loading={submitting} className="md:hidden" />
          </>
        }
        below={below}
      />

      {open && (
        <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 shadow-md">
          {link ? (
            <LinkCard t={t} pending={linkCheck.isPending} result={linkCheck.data?.data ?? null} onContinue={(result) => (setOpen(false), onLink(result))} />
          ) : typed.length === 0 ? (
            <div className="flex flex-col gap-3">
              {signedIn && (recent.data?.data.items.length ?? 0) > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-caption text-text-muted uppercase">{t("searchAdd.suggest.recent")}</p>
                  <div className="flex flex-wrap gap-2">
                    {recent.data?.data.items.slice(0, RECENT_COUNT).map((item) => (
                      <Button key={item.id} variant="secondary" onClick={() => onQueryChange(item.query)}>
                        {item.query}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-body-sm text-text-muted">{t("searchAdd.suggest.emptyHint")}</p>
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
                    {[t("searchAdd.suggest.found", { count: total }), total > tileCount ? t("searchAdd.suggest.firstTiles", { count: tileCount }) : null, t("searchAdd.suggest.updates")]
                      .filter(Boolean)
                      .join(t("common.listSeparator"))}
                  </p>
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
          <p className="text-caption text-text-muted">{link ? t("searchAdd.suggest.linkTip") : t("searchAdd.suggest.sourceNote")}</p>
        </div>
      )}
    </div>
  );
}

function Preview({ t, product, onChoose }: { t: Translator; product: ProductSummary; onChoose: () => void }) {
  const rows: [string, string][] = [
    [t("searchAdd.suggest.brand"), product.brand ?? ""],
    [t("searchAdd.suggest.generation"), product.generation ?? ""],
    [t("searchAdd.suggest.colors"), product.colors.join(t("common.listSeparator"))],
    [t("searchAdd.suggest.bundles"), product.bundles.join(t("common.listSeparator"))],
  ];
  return (
    <aside aria-label={t("searchAdd.suggest.previewLabel")} aria-live="polite" className="flex flex-col gap-3 rounded-md bg-surface-alt p-3">
      <ProductImage src={imageUrl(product.imageSha256)} size="fill" fallbackIcon={Package} className="bg-surface" />
      <p className="text-caption text-text-muted">{product.category.name}</p>
      <p className="text-body font-semibold text-text">{product.name}</p>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-body-sm">
        {rows
          .filter(([, value]) => value)
          .map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-text-muted">{label}</dt>
              <dd className="text-text">{value}</dd>
            </div>
          ))}
      </dl>
      <p className="text-caption text-text-muted">
        {[t("searchAdd.suggest.stores", { count: product.storeCount }), t("searchAdd.suggest.previewNote")].join(t("common.listSeparator"))}
      </p>
      <Button variant="secondary" onClick={onChoose}>
        {t("searchAdd.suggest.choose")}
      </Button>
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
