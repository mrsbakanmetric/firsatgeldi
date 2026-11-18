"use client";

// Arama geçmişi (design "9 Ayarlar" v2.1 Main + Forms 10; modules.md Settings and Account,
// decisions 2026-11-18): search in the searches + category with counts; each row shows the
// matched product's image, the search in quotes, the product, "Takip ediliyor"/"Takipte değil",
// the date and "Gizle" — no price. A hidden search leaves the list ("Arama gizlendi · Geri al"
// undoes it); the record is kept. Empty: "Henüz arama yok" + "Ürün ara"; nothing matches the
// filter: "Eşleşen arama yok" + "Filtreyi temizle". Users only (the Application Manager has none).
import type { SearchHistory } from "@firsatgeldi/contracts";
import { type Locale, localizedPath, type Translator } from "@firsatgeldi/i18n";
import { Button, buttonClasses, EmptyState, ProductImage, SearchField, Select, StatusBanner } from "@firsatgeldi/ui";
import { useQueryClient } from "@tanstack/react-query";
import { History, Package } from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { errorMessage } from "../../lib/api/errors";
import { useApiMutation, useApiQuery } from "../../lib/api/hooks";
import { imageUrl } from "../catalogue-search/catalogue-search-box";
import { whenText } from "./security";
import { SectionError, SectionLoading, SettingsCard, useMarkSaved } from "./settings";

const ALL = "all";

export function HistorySection({ locale, t }: { locale: Locale; t: Translator }) {
  const [text, setText] = useState("");
  const [category, setCategory] = useState(ALL);
  const [hiddenId, setHiddenId] = useState<string | null>(null);
  const q = useDeferredValue(text.trim());
  const queryClient = useQueryClient();
  const markSaved = useMarkSaved();
  const query = useApiQuery("getSearchHistory", { query: { ...(q ? { q } : {}), ...(category === ALL ? {} : { category }) } }, { placeholderData: (previous) => previous });
  const hide = useApiMutation("hideSearch");
  const unhide = useApiMutation("unhideSearch");
  // Every history read (here, Home's recent searches) changes with a hide.
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["getSearchHistory"] });

  if (query.isPending) return <SectionLoading t={t} />;
  if (query.isError) return <SectionError t={t} onRetry={() => void query.refetch()} />;
  const history: SearchHistory = query.data.data;
  const filtered = q !== "" || category !== ALL;

  if (history.items.length === 0 && !filtered && !hiddenId) {
    return (
      <EmptyState
        icon={History}
        title={t("settings.history.emptyTitle")}
        description={t("settings.history.emptyText")}
        action={
          <Link href={localizedPath("/ara", locale)} className={buttonClasses("primary")}>
            {t("settings.history.emptyAction")}
          </Link>
        }
      />
    );
  }

  const categories = [{ value: ALL, label: t("settings.history.all"), count: history.facets.total }, ...history.facets.categories.map((entry) => ({ value: entry.id, label: entry.name, count: entry.count }))];
  const clear = () => {
    setText("");
    setCategory(ALL);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <SearchField
          size="list"
          className="min-w-0 flex-1"
          label={t("settings.history.search")}
          hideLabel
          placeholder={t("settings.history.search")}
          value={text}
          onChange={(event) => setText(event.target.value)}
          clearLabel={t("settings.history.clear")}
          onClear={() => setText("")}
        />
        <Select label={t("settings.history.category")} compact options={categories} value={category} onValueChange={setCategory} />
      </div>

      {hiddenId && (
        <StatusBanner
          tone="info"
          action={
            <Button
              variant="secondary"
              size="compact"
              loading={unhide.isPending}
              onClick={() =>
                unhide.mutate(
                  { params: { id: hiddenId } },
                  {
                    onSuccess: () => {
                      setHiddenId(null);
                      markSaved();
                      refresh();
                    },
                  },
                )
              }
            >
              {t("settings.history.undo")}
            </Button>
          }
        >
          {t("settings.history.hidden")}
        </StatusBanner>
      )}
      {(hide.isError || unhide.isError) && <StatusBanner tone="danger">{errorMessage(t, hide.error ?? unhide.error)}</StatusBanner>}

      {history.items.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-border bg-surface p-5">
          <p className="text-body font-semibold text-text">{t("settings.history.noResults")}</p>
          <Button variant="secondary" size="compact" onClick={clear}>
            {t("settings.history.clear")}
          </Button>
        </div>
      ) : (
        <SettingsCard>
          <ul className="flex flex-col divide-y divide-divider">
            {history.items.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-3 px-5 py-3 md:flex-nowrap">
                <ProductImage src={imageUrl(item.product?.imageSha256 ?? null)} {...(item.product ? { alt: item.product.name } : {})} size="sm" fallbackIcon={Package} />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-body-sm font-semibold text-text">{t("settings.history.query", { query: item.query })}</span>
                  <span className="truncate text-caption text-text-muted">{item.product?.name ?? t("settings.history.noProduct")}</span>
                </div>
                {item.product && <TrackingTag t={t} tracking={item.product.tracking} />}
                <span className="shrink-0 text-caption text-text-muted">{whenText(t, locale, item.occurredAt)}</span>
                <Button
                  variant="ghost"
                  size="compact"
                  loading={hide.isPending && hide.variables?.params.id === item.id}
                  onClick={() =>
                    hide.mutate(
                      { params: { id: item.id } },
                      {
                        onSuccess: () => {
                          setHiddenId(item.id);
                          markSaved();
                          refresh();
                        },
                      },
                    )
                  }
                >
                  {t("settings.history.hide")}
                </Button>
              </li>
            ))}
          </ul>
        </SettingsCard>
      )}
    </div>
  );
}

/** "Takip ediliyor" (primary-subtle) or "Takipte değil" (dashed outline), as drawn. */
function TrackingTag({ t, tracking }: { t: Translator; tracking: boolean }) {
  return tracking ? (
    <span className="shrink-0 rounded-pill bg-primary-subtle px-2 py-1 text-caption font-semibold text-on-primary-subtle">{t("settings.history.tracking")}</span>
  ) : (
    <span className="shrink-0 rounded-pill border border-dashed border-border px-2 py-1 text-caption font-semibold text-text-muted">{t("settings.history.notTracking")}</span>
  );
}
