"use client";

// Profilim lists (design "13 Keşfet ve Profil" v2.1 Me + MeStates; pagedesign.md §8.9a):
// - Takipçilerim: "Takip istekleri · N" (only when one waits; Onayla / Reddet), then followers
//   with "Takipten çıkar".
// - Takip ettiklerim: "Takipten çık", or "İsteği geri al" while the request waits.
// - Paylaştığım fırsatlar: sample shares with category chips (counts) and the status pill; no
//   new-share button until Discover; never a seller, store or link.
// Removing, unfollowing and withdrawing have no dialog: the result line offers "Geri al".
// Names are plain text until other profiles exist. Each list has its search and empty state.
import type { LinkSubmissionView, PersonView } from "@firsatgeldi/contracts";
import { type Locale, type Translator } from "@firsatgeldi/i18n";
import { Button, EmptyState, FilterChips, PersonRow, ProductImage, SearchField, SharedDealRow, type SharedDealTone, SkeletonBlock, StatusBanner, tabId, tabPanelId, Tabs } from "@firsatgeldi/ui";
import { useQueryClient } from "@tanstack/react-query";
import { Package, Share2, UserPlus, Users } from "lucide-react";
import { useDeferredValue, useState } from "react";
import { errorMessage } from "../../lib/api/errors";
import { useApiMutation, useApiQuery } from "../../lib/api/hooks";
import { imageUrl } from "../catalogue-search/catalogue-search-box";
import { ago, money, useNow } from "../search-add/format";

type Tab = "followers" | "following" | "shares";
const TABS: readonly Tab[] = ["followers", "following", "shares"];
const ID_BASE = "profile";
const ALL = "all";
const STATUS_TONES: Record<LinkSubmissionView["status"], SharedDealTone> = { VERIFIED: "ok", PENDING: "wait", REJECTED: "muted" };

/** "ayse_d" → "AD", "emre.y" → "EY", "mert" → "ME". */
export function personInitials(username: string, locale: Locale): string {
  const parts = username.split(/[._-]+/).filter(Boolean);
  const letters = parts.length > 1 ? parts.slice(0, 2).map((part) => part.charAt(0)) : [username.slice(0, 2)];
  return letters.join("").toLocaleUpperCase(locale);
}

type Undo = { kind: "removed" | "unfollowed" | "withdrawn"; userId: string; username: string };

/** `onCopy`: "Profil bağlantısını kopyala" (only with a username), offered by the empty followers list. */
export function ProfileLists({ locale, t, pendingRequests, onCopy }: { locale: Locale; t: Translator; pendingRequests: number; onCopy?: () => void }) {
  const [tab, setTab] = useState<Tab>("followers");
  const [text, setText] = useState("");
  const [undo, setUndo] = useState<Undo | null>(null);
  const queryClient = useQueryClient();
  // Every list and the header counts change with a follow action.
  const refresh = () => {
    for (const name of ["getMyProfile", "getFollowers", "getFollowing", "getFollowRequests"]) void queryClient.invalidateQueries({ queryKey: [name] });
  };
  const restoreFollow = useApiMutation("restoreFollow", { onSuccess: () => (setUndo(null), refresh()) });
  const restoreFollower = useApiMutation("restoreFollower", { onSuccess: () => (setUndo(null), refresh()) });
  const restoring = restoreFollow.isPending || restoreFollower.isPending;
  const restoreError = restoreFollow.error ?? restoreFollower.error;

  return (
    <div className="flex flex-col gap-4">
      {undo && (
        <StatusBanner
          tone="info"
          action={
            <Button
              variant="secondary"
              size="compact"
              loading={restoring}
              onClick={() => (undo.kind === "removed" ? restoreFollower.mutate({ params: { userId: undo.userId } }) : restoreFollow.mutate({ params: { userId: undo.userId } }))}
            >
              {t("profile.undo")}
            </Button>
          }
        >
          {t(`profile.done.${undo.kind}`, { username: undo.username })}
        </StatusBanner>
      )}
      {restoreError && <StatusBanner tone="danger">{errorMessage(t, restoreError)}</StatusBanner>}
      <Tabs
        label={t("profile.tabsLabel")}
        idBase={ID_BASE}
        value={tab}
        onChange={(next) => {
          setTab(next);
          setText("");
        }}
        tabs={TABS.map((id) => ({ id, label: t(`profile.tabs.${id}`) }))}
      />
      <div role="tabpanel" id={tabPanelId(ID_BASE, tab)} aria-labelledby={tabId(ID_BASE, tab)} className="flex flex-col gap-4">
        <SearchField
          size="list"
          label={tab === "shares" ? t("profile.searchShares") : t("profile.searchPeople")}
          hideLabel
          placeholder={tab === "shares" ? t("profile.searchShares") : t("profile.searchPeople")}
          value={text}
          onChange={(event) => setText(event.target.value)}
          clearLabel={t("profile.clearSearch")}
          onClear={() => setText("")}
        />
        {tab === "followers" && <Followers locale={locale} t={t} text={text} pendingRequests={pendingRequests} {...(onCopy ? { onCopy } : {})} onDone={(next) => (setUndo(next), refresh())} />}
        {tab === "following" && <Following locale={locale} t={t} text={text} onDone={(next) => (setUndo(next), refresh())} />}
        {tab === "shares" && <Shares locale={locale} t={t} text={text} />}
      </div>
    </div>
  );
}

/** "Fırsat Avcısı · Sen de takip ediyorsun · Aksiyon kamerası · 14 ürün takip ediyor" — only what the person shares. */
function personMeta(t: Translator, person: PersonView, relation: string | null): string {
  const parts = [
    person.badges.dealHunter ? t("profile.badge") : null,
    relation,
    person.topCategory?.name ?? null,
    person.trackingCount === null ? t("profile.meta.notShared") : t("profile.meta.tracking", { count: person.trackingCount }),
  ];
  return parts.filter((part): part is string => part !== null).join(t("common.listSeparator"));
}

function ListLoading({ t }: { t: Translator }) {
  return (
    <div className="flex flex-col gap-3">
      <span role="status" className="sr-only">
        {t("profile.states.loading")}
      </span>
      <SkeletonBlock shape="card" />
    </div>
  );
}

function ListError({ t, error, onRetry }: { t: Translator; error: unknown; onRetry: () => void }) {
  return (
    <StatusBanner
      tone="danger"
      title={t("profile.states.errorTitle")}
      action={
        <Button variant="secondary" size="compact" onClick={onRetry}>
          {t("profile.states.retry")}
        </Button>
      }
    >
      {errorMessage(t, error)}
    </StatusBanner>
  );
}

function NoMatch({ text }: { text: string }) {
  return <p className="rounded-lg border border-border bg-surface p-5 text-body-sm text-text-muted">{text}</p>;
}

function Followers({ locale, t, text, pendingRequests, onCopy, onDone }: { locale: Locale; t: Translator; text: string; pendingRequests: number; onCopy?: () => void; onDone: (undo: Undo | null) => void }) {
  const q = useDeferredValue(text.trim());
  const followers = useApiQuery("getFollowers", { query: q ? { q } : {} }, { placeholderData: (previous) => previous });
  const requests = useApiQuery("getFollowRequests", {}, { enabled: pendingRequests > 0 });
  const approve = useApiMutation("approveFollow", { onSuccess: () => onDone(null) });
  const decline = useApiMutation("declineFollow", { onSuccess: () => onDone(null) });
  const remove = useApiMutation("removeFollower");
  if (followers.isPending) return <ListLoading t={t} />;
  if (followers.isError) return <ListError t={t} error={followers.error} onRetry={() => void followers.refetch()} />;
  const items = followers.data.data.items;
  const waiting = requests.data?.data.items ?? [];
  const failed = approve.error ?? decline.error ?? remove.error;

  return (
    <div className="flex flex-col gap-4">
      {failed && <StatusBanner tone="danger">{errorMessage(t, failed)}</StatusBanner>}
      {waiting.length > 0 && (
        <section aria-labelledby="profile-requests" className="overflow-hidden rounded-lg border border-border bg-surface">
          <h2 id="profile-requests" className="border-b border-divider px-5 py-3 text-body font-semibold text-text">
            {t("profile.requests", { count: waiting.length })}
          </h2>
          <ul className="flex flex-col divide-y divide-divider">
            {waiting.map(({ person }) => (
              <li key={person.id}>
                <PersonRow
                  avatar={{ initials: personInitials(person.username, locale), src: imageUrl(person.avatarSha256) }}
                  username={person.username}
                  meta={personMeta(t, person, null)}
                  actions={
                    <>
                      <Button variant="secondary" size="compact" loading={decline.isPending && decline.variables?.params.userId === person.id} onClick={() => decline.mutate({ params: { userId: person.id } })}>
                        {t("profile.decline")}
                      </Button>
                      <Button size="compact" loading={approve.isPending && approve.variables?.params.userId === person.id} onClick={() => approve.mutate({ params: { userId: person.id } })}>
                        {t("profile.approve")}
                      </Button>
                    </>
                  }
                />
              </li>
            ))}
          </ul>
        </section>
      )}
      {items.length === 0 && q === "" ? (
        <EmptyState
          icon={Users}
          title={t("profile.empty.followers.title")}
          description={t("profile.empty.followers.text")}
          {...(onCopy
            ? {
                action: (
                  <Button variant="secondary" onClick={onCopy}>
                    {t("profile.copyLink")}
                  </Button>
                ),
              }
            : {})}
        />
      ) : items.length === 0 ? (
        <NoMatch text={t("profile.noPeople")} />
      ) : (
        <ul className="flex flex-col divide-y divide-divider overflow-hidden rounded-lg border border-border bg-surface">
          {items.map(({ person }) => (
            <li key={person.id}>
              <PersonRow
                avatar={{ initials: personInitials(person.username, locale), src: imageUrl(person.avatarSha256) }}
                username={person.username}
                meta={personMeta(t, person, person.youFollow === "ACCEPTED" ? t("profile.meta.youFollow") : null)}
                actions={
                  <Button
                    variant="secondary"
                    size="compact"
                    loading={remove.isPending && remove.variables?.params.userId === person.id}
                    onClick={() => remove.mutate({ params: { userId: person.id } }, { onSuccess: () => onDone({ kind: "removed", userId: person.id, username: person.username }) })}
                  >
                    {t("profile.remove")}
                  </Button>
                }
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Following({ locale, t, text, onDone }: { locale: Locale; t: Translator; text: string; onDone: (undo: Undo | null) => void }) {
  const q = useDeferredValue(text.trim());
  const following = useApiQuery("getFollowing", { query: q ? { q } : {} }, { placeholderData: (previous) => previous });
  const unfollow = useApiMutation("unfollow");
  if (following.isPending) return <ListLoading t={t} />;
  if (following.isError) return <ListError t={t} error={following.error} onRetry={() => void following.refetch()} />;
  const items = following.data.data.items;
  if (items.length === 0 && q === "") return <EmptyState icon={UserPlus} title={t("profile.empty.following.title")} description={t("profile.empty.following.text")} />;
  if (items.length === 0) return <NoMatch text={t("profile.noPeople")} />;

  return (
    <div className="flex flex-col gap-4">
      {unfollow.isError && <StatusBanner tone="danger">{errorMessage(t, unfollow.error)}</StatusBanner>}
      <ul className="flex flex-col divide-y divide-divider overflow-hidden rounded-lg border border-border bg-surface">
        {items.map(({ person, status }) => {
          const pending = status === "PENDING";
          return (
            <li key={person.id}>
              <PersonRow
                avatar={{ initials: personInitials(person.username, locale), src: imageUrl(person.avatarSha256) }}
                username={person.username}
                meta={pending ? t("profile.meta.pending") : personMeta(t, person, person.followsYou ? t("profile.meta.followsYou") : null)}
                actions={
                  <Button
                    variant="secondary"
                    size="compact"
                    loading={unfollow.isPending && unfollow.variables?.params.userId === person.id}
                    onClick={() => unfollow.mutate({ params: { userId: person.id } }, { onSuccess: () => onDone({ kind: pending ? "withdrawn" : "unfollowed", userId: person.id, username: person.username }) })}
                  >
                    {pending ? t("profile.withdraw") : t("profile.unfollow")}
                  </Button>
                }
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** "Doğrulandı · +1 jeton" · "İnceleniyor" · "Reddedildi". */
function statusLabel(t: Translator, share: LinkSubmissionView): string {
  if (share.status === "VERIFIED") return t("profile.share.status.VERIFIED", { count: share.rewardTokens ?? 0 });
  return t(`profile.share.status.${share.status}`);
}

/** The line under the price, always with the check time. */
function shareNote(t: Translator, locale: Locale, share: LinkSubmissionView, now: number): string {
  const when = ago(t, share.checkedAt, now);
  if (share.status === "VERIFIED" && share.savingVsPrevious) return t("profile.share.saving", { amount: money(share.savingVsPrevious, locale), ago: when });
  if (share.status === "REJECTED" && share.rejectReason) {
    const reason =
      share.rejectReason === "NOT_CHEAPER" && share.cheapestPrice
        ? t("profile.share.reasons.NOT_CHEAPER", { price: money(share.cheapestPrice, locale) })
        : share.rejectReason === "DIFFERENT_MODEL"
          ? t("profile.share.reasons.DIFFERENT_MODEL", { name: share.otherProductName ?? "" })
          : t(`profile.share.reasons.${share.rejectReason as "OUT_OF_STOCK" | "SECOND_HAND"}`);
    return t("profile.share.rejected", { reason, ago: when });
  }
  return t("profile.share.sharedAt", { ago: when });
}

const fold = (value: string, locale: Locale) => value.toLocaleLowerCase(locale);

function Shares({ locale, t, text }: { locale: Locale; t: Translator; text: string }) {
  const now = useNow();
  const [category, setCategory] = useState(ALL);
  const shares = useApiQuery("getMyLinkSubmissions", { query: {} });
  if (shares.isPending) return <ListLoading t={t} />;
  if (shares.isError) return <ListError t={t} error={shares.error} onRetry={() => void shares.refetch()} />;
  const all = shares.data.data.items;
  if (all.length === 0) return <EmptyState icon={Share2} title={t("profile.empty.shares.title")} description={t("profile.empty.shares.text")} />;

  // Search by product, category or status, as the box says ("ürün, durum").
  const words = fold(text.trim(), locale).split(/\s+/).filter(Boolean);
  const matched = all.filter((share) => {
    const haystack = fold([share.product.name, share.product.category.name, statusLabel(t, share)].join(" "), locale);
    return words.every((word) => haystack.includes(word));
  });
  const categories = [...new Map(matched.map((share) => [share.product.category.id, share.product.category.name])).entries()];
  const shown = category === ALL ? matched : matched.filter((share) => share.product.category.id === category);

  return (
    <div className="flex flex-col gap-4">
      <FilterChips
        label={t("profile.category")}
        value={category}
        onChange={setCategory}
        options={[
          { id: ALL, label: t("profile.all"), count: matched.length },
          ...categories.map(([id, name]) => ({ id, label: name, count: matched.filter((share) => share.product.category.id === id).length })),
        ]}
      />
      {shown.length === 0 ? (
        <NoMatch text={t("profile.noShares")} />
      ) : (
        <ul className="flex flex-col divide-y divide-divider overflow-hidden rounded-lg border border-border bg-surface">
          {shown.map((share) => (
            <li key={share.id}>
              <SharedDealRow
                image={<ProductImage src={imageUrl(share.product.imageSha256)} alt={share.product.name} size="sm" fallbackIcon={Package} />}
                name={share.product.name}
                category={share.product.category.name}
                price={money(share.price, locale)}
                note={shareNote(t, locale, share, now)}
                status={{ label: statusLabel(t, share), tone: STATUS_TONES[share.status] }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
