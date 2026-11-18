"use client";

// Profilim — `/[locale]/profil` (design "13 Keşfet ve Profil" v2.1 Me + MeStates; pagedesign.md
// §8.9a; modules.md Profile and Following › Profilim in Phase 1; decisions 2026-11-18).
// List template with a 360 px side column; the content and the side column end together.
// - Header (`ProfileHeader`): photo or initials, @username (or "Profilin hazır değil" +
//   "Kullanıcı adı seç"), "Fırsat Avcısı", the visibility from Ayarlar › Gizlilik, four counts,
//   "…'dan beri üye"; "Profili düzenle" (Ayarlar › Profil) and "Profil bağlantısını kopyala"
//   ("Bağlantı kopyalandı · …" for a few seconds).
// - Tabs Takipçilerim (with "Takip istekleri") · Takip ettiklerim · Paylaştığım fırsatlar.
// - Side column: "Neyi kim görüyor?" (read-only; sharing permissions come with Discover) and
//   "Başkaları nasıl görüyor?" — choosing a viewer re-renders the page as that person sees it.
// States: loading (same layout), error, guest (sign in, back here), no username.
import type { CommunityConsents, MyProfile as MyProfileData, PrivacyLevel } from "@firsatgeldi/contracts";
import { formatNumber, formatSince } from "@firsatgeldi/core";
import { type Locale, localizedPath, type Translator } from "@firsatgeldi/i18n";
import { Button, buttonClasses, EmptyState, PageTemplate, ProfileHeader, SkeletonBlock, StatusBanner, ViewAsPreview, VisibilityCard } from "@firsatgeldi/ui";
import { LogIn } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useApiQuery, useSession } from "../../lib/api/hooks";
import { signInHref } from "../../lib/auth/next";
import { settingsHref } from "../../lib/settings/sections";
import { imageUrl } from "../catalogue-search/catalogue-search-box";
import { initialsOf } from "../shell/session-app-shell";
import { useTranslator } from "../shell/parts";
import { ProfileLists } from "./lists";

/** "Bağlantı kopyalandı" stays this long (design MeStates 5: 4 s). */
const COPIED_MS = 4_000;
/** Shown in the avatar when there is no name to take initials from (design MeStates 4). */
const NO_INITIALS = "?";
const SCHEME = /^https?:\/\//;

export type Viewer = "me" | "follower" | "stranger";
type SharedKind = "tracking" | "deals" | "savings" | "paidPrices";
const KINDS: readonly { kind: SharedKind; consent: keyof Omit<CommunityConsents, "askedAt"> }[] = [
  { kind: "tracking", consent: "shareTracking" },
  { kind: "deals", consent: "shareDeals" },
  { kind: "savings", consent: "shareSavings" },
  { kind: "paidPrices", consent: "sharePaidPrice" },
];

/** Whether a viewer sees the profile at all: Herkese açık · Takipçilerime (followers) · Sadece ben (nobody else). */
export function profileVisibleTo(privacy: PrivacyLevel, viewer: Viewer): boolean {
  if (viewer === "me") return true;
  return privacy === "EVERYONE" || (privacy === "FOLLOWERS" && viewer === "follower");
}

/** "Profil bağlantısını kopyala": copies `/u/{username}` and shows "Bağlantı kopyalandı · …" for a few seconds. */
function useCopyLink(locale: Locale) {
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const copy = (username: string) => {
    const link = `${globalThis.location.origin}${localizedPath("/u/[username]", locale, { username })}`;
    void globalThis.navigator.clipboard?.writeText(link);
    setCopied(link.replace(SCHEME, ""));
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(null), COPIED_MS);
  };
  return { copied, copy };
}

export function MyProfile({ locale }: { locale: Locale }) {
  const t = useTranslator(locale);
  const session = useSession();
  const link = useCopyLink(locale);
  const signedIn = session.status === "ready" && session.me !== null;
  const profile = useApiQuery("getMyProfile", {}, { enabled: signedIn });
  const consents = useApiQuery("getCommunityConsents", {}, { enabled: signedIn });
  const [chosen, setChosen] = useState<Viewer>("me");

  if (session.status === "ready" && session.me === null) {
    return (
      <PageTemplate kind="list" title={t("profile.title")}>
        <EmptyState
          icon={LogIn}
          title={t("profile.states.signInTitle")}
          description={t("profile.states.signInText")}
          action={
            <Link href={signInHref(locale, localizedPath("/profil", locale))} className={buttonClasses("primary")}>
              {t("shell.signIn")}
            </Link>
          }
        />
      </PageTemplate>
    );
  }
  if (session.status === "error" || profile.isError || consents.isError) {
    return (
      <PageTemplate kind="list" title={t("profile.title")}>
        <StatusBanner
          tone="danger"
          title={t("profile.states.errorTitle")}
          action={
            <Button
              variant="secondary"
              size="compact"
              onClick={() => {
                void profile.refetch();
                void consents.refetch();
              }}
            >
              {t("profile.states.retry")}
            </Button>
          }
        >
          {t("profile.states.errorText")}
        </StatusBanner>
      </PageTemplate>
    );
  }
  if (!profile.data || !consents.data || session.status !== "ready" || !session.me) return <ProfileLoading t={t} />;

  const data = profile.data.data;
  const shared = consents.data.data;
  // "Takip etmeyen biri" exists only for a public profile.
  const viewer: Viewer = chosen === "stranger" && data.privacyLevel !== "EVERYONE" ? "me" : chosen;
  const initials = initialsOf(session.me.displayName ?? data.username, locale) || NO_INITIALS;
  const privacyLabel = t(`settings.privacy.levels.${data.privacyLevel}`);
  const viewers: Viewer[] = data.privacyLevel === "EVERYONE" ? ["me", "follower", "stranger"] : ["me", "follower"];

  return (
    <PageTemplate
      kind="list"
      title={t("profile.title")}
      titleInContent
      endTogether
      sideLabel={t("profile.visibility.title")}
      side={
        <>
          <VisibilityCard
            title={t("profile.visibility.title")}
            rows={[
              { label: t("profile.visibility.rows.profile"), audience: privacyLabel, shared: data.privacyLevel !== "ONLY_ME" },
              ...KINDS.map(({ kind, consent }) => ({
                label: t(`profile.visibility.rows.${kind}`),
                audience: shared[consent] ? privacyLabel : t("settings.privacy.levels.ONLY_ME"),
                shared: shared[consent] && data.privacyLevel !== "ONLY_ME",
              })),
              { label: t("profile.visibility.rows.searches"), audience: t("profile.visibility.never"), shared: false },
            ]}
            link={{ href: settingsHref(locale, "privacy"), label: t("profile.visibility.link") }}
          />
          <ViewAsPreview
            className="md:flex-1"
            title={t("profile.preview.title")}
            value={viewer}
            onChange={setChosen}
            note={viewer === "me" ? t("profile.preview.noteMe") : t("profile.preview.note")}
            options={viewers.map((value) => ({ value, label: t(`profile.preview.options.${value}`) }))}
          />
        </>
      }
    >
      <Header locale={locale} t={t} data={data} initials={initials} privacyLabel={privacyLabel} viewer={viewer} copied={link.copied} onCopy={link.copy} />
      {viewer === "me" ? <ProfileLists locale={locale} t={t} pendingRequests={data.pendingRequests} {...(data.username ? { onCopy: () => link.copy(data.username ?? "") } : {})} /> : <PreviewNote locale={locale} t={t} privacy={data.privacyLevel} viewer={viewer} consents={shared} />}
    </PageTemplate>
  );
}

function Header({ locale, t, data, initials, privacyLabel, viewer, copied, onCopy }: { locale: Locale; t: Translator; data: MyProfileData; initials: string; privacyLabel: string; viewer: Viewer; copied: string | null; onCopy: (username: string) => void }) {
  const since = t("profile.memberSince", { since: formatSince(new Date(data.memberSince), locale) });
  const count = (value: number, key: keyof MyProfileData["counts"]) => ({ value: formatNumber(value, locale), label: t(`profile.counts.${key}`, { count: value }) });
  const avatar = { initials, src: imageUrl(data.avatarSha256) };

  if (!data.username) {
    return (
      <ProfileHeader
        avatar={avatar}
        title={t("profile.noUsername")}
        since={since}
        actions={
          viewer === "me" ? (
            <Link href={settingsHref(locale, "profile")} className={buttonClasses("primary")}>
              {t("profile.chooseUsername")}
            </Link>
          ) : undefined
        }
      />
    );
  }

  const username = data.username;
  // A previewing viewer sees only what is shared: the follower count, plus what the consents open.
  const counts =
    viewer === "me"
      ? [count(data.counts.followers, "followers"), count(data.counts.following, "following"), count(data.counts.tracking, "tracking"), count(data.counts.verifiedShares, "verifiedShares")]
      : [count(data.counts.followers, "followers")];

  return (
    <div className="flex flex-col gap-3">
      <ProfileHeader
        avatar={avatar}
        title={["@", username].join("")}
        {...(data.badges.dealHunter ? { badge: t("profile.badge") } : {})}
        privacy={privacyLabel}
        counts={counts}
        since={since}
        actions={
          viewer === "me" ? (
            <>
              <Link href={settingsHref(locale, "profile")} className={buttonClasses("secondary", "w-full md:w-auto")}>
                {t("profile.edit")}
              </Link>
              <Button variant="secondary" className="w-full md:w-auto" onClick={() => onCopy(username)}>
                {t("profile.copyLink")}
              </Button>
            </>
          ) : undefined
        }
      />
      {copied && viewer === "me" && <StatusBanner tone="info">{t("profile.copied", { link: copied })}</StatusBanner>}
    </div>
  );
}

/** The preview: what the chosen person sees instead of the lists (design Me v2.1, MeStates 7). */
function PreviewNote({ locale, t, privacy, viewer, consents }: { locale: Locale; t: Translator; privacy: PrivacyLevel; viewer: Exclude<Viewer, "me">; consents: CommunityConsents }) {
  if (!profileVisibleTo(privacy, viewer)) {
    return (
      <StatusBanner tone="info" title={t(`profile.preview.hidden.${viewer}`)}>
        {t("profile.preview.hiddenText")}
      </StatusBanner>
    );
  }
  const unshared = KINDS.filter(({ consent }) => !consents[consent]).map(({ kind }) => t(`profile.preview.kinds.${kind}`));
  const list = new Intl.ListFormat(locale, { type: "conjunction" }).format(unshared);
  return (
    <StatusBanner tone="info" title={t(`profile.preview.visible.${viewer}`)}>
      {unshared.length > 0 ? t("profile.preview.privateKinds", { list: list.charAt(0).toLocaleUpperCase(locale) + list.slice(1) }) : null}
    </StatusBanner>
  );
}

/** Loading: the header, tabs and side column in the same layout (design MeStates 9). */
function ProfileLoading({ t }: { t: Translator }) {
  return (
    <PageTemplate
      kind="list"
      title={t("profile.title")}
      titleInContent
      side={
        <>
          <SkeletonBlock shape="card" />
          <SkeletonBlock shape="card" />
        </>
      }
    >
      <span role="status" className="sr-only">
        {t("profile.states.loading")}
      </span>
      <SkeletonBlock shape="card" />
      <SkeletonBlock shape="title" width="1/2" />
      {[0, 1, 2].map((index) => (
        <SkeletonBlock key={index} shape="line" />
      ))}
    </PageTemplate>
  );
}
