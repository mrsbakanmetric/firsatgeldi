"use client";

// Profil (design "9 Ayarlar" v2.1 Main + Forms 4, 9; States 5): optional photo — whoever wants
// uploads one, else the initials [DECIDED 2026-11-18]; name and username with a live check
// ("Kullanılabilir" or "alınmış · öneri" with three suggestions; once in 30 days); "Kaydet".
import { type ApiError, type Me, type UsernameCheck } from "@firsatgeldi/contracts";
import { formatDate } from "@firsatgeldi/core";
import type { Locale, Translator } from "@firsatgeldi/i18n";
import { AvatarCrop, AvatarUpload, Button, chipClasses, Dialog, Icon, StatusBanner, TextField } from "@firsatgeldi/ui";
import { useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { errorMessage } from "../../lib/api/errors";
import { apiQueryKey, useApiMutation, useApiQuery, useSession } from "../../lib/api/hooks";
import { useApiClient } from "../../lib/api/provider";
import { cropToSquare, uploadAvatar, ZOOM } from "../../lib/settings/avatar";
import { imageUrl } from "../catalogue-search/catalogue-search-box";
import { megabytes, typeList } from "../search-add/format";
import { initialsOf } from "../shell/session-app-shell";
import { useMarkSaved } from "./settings";

const CHECK_DELAY_MS = 400;

/** Keeps `GET /me` in the cache in step with a saved change (the shell's name and photo follow). */
export function useSetMe() {
  const queryClient = useQueryClient();
  return (me: Me) => queryClient.setQueryData(apiQueryKey("getMe", {}), { data: me, meta: undefined });
}

export function ProfileSection({ locale, t }: { locale: Locale; t: Translator }) {
  const session = useSession();
  const me = session.status === "ready" ? session.me : null;
  if (!me) return null;
  return <ProfileForm key={me.id} locale={locale} t={t} me={me} />;
}

function ProfileForm({ locale, t, me }: { locale: Locale; t: Translator; me: Me }) {
  const markSaved = useMarkSaved();
  const setMe = useSetMe();
  const save = useApiMutation("updateMe");
  const [name, setName] = useState(me.displayName ?? "");
  const [username, setUsername] = useState(me.username ?? "");
  const [checked, setChecked] = useState(username);
  const [serverError, setServerError] = useState<{ field: "username" | "displayName"; text: string } | null>(null);

  // The username is checked after a short pause in typing.
  useEffect(() => {
    const timer = setTimeout(() => setChecked(username.trim().toLowerCase()), CHECK_DELAY_MS);
    return () => clearTimeout(timer);
  }, [username]);
  const changedUsername = checked !== (me.username ?? "") && checked.length > 0;
  const check = useApiQuery("checkUsername", { query: { u: checked } }, { enabled: changedUsername, retry: false });
  const usernameState: UsernameCheck | null = changedUsername ? (check.data?.data ?? null) : null;

  const nameMissing = name.trim().length === 0;
  const usernameProblem = usernameText(t, locale, usernameState);
  const problems = [nameMissing, Boolean(usernameProblem), Boolean(serverError)].filter(Boolean).length;
  const dirty = name.trim() !== (me.displayName ?? "") || username.trim().toLowerCase() !== (me.username ?? "");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!dirty || nameMissing || usernameProblem || save.isPending) return;
    const body = {
      ...(name.trim() !== (me.displayName ?? "") ? { displayName: name.trim() } : {}),
      ...(username.trim().toLowerCase() !== (me.username ?? "") ? { username: username.trim().toLowerCase() } : {}),
    };
    setServerError(null);
    save.mutate(
      { body },
      {
        onSuccess: ({ data }) => {
          setMe(data);
          markSaved();
        },
        onError: (error: ApiError) =>
          setServerError(error.body.code === "USERNAME_TAKEN" || error.body.code === "USERNAME_LOCKED" ? { field: "username", text: errorMessage(t, error) } : { field: "displayName", text: errorMessage(t, error) }),
      },
    );
  };

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5">
      <PhotoControl t={t} me={me} onSaved={(next) => (setMe(next), markSaved())} />
      <form noValidate onSubmit={submit} className="flex flex-col gap-4">
        {problems > 0 && (dirty || serverError) && (
          <StatusBanner tone="danger" title={t("settings.states.notSaved", { count: problems })}>
            {serverError?.text ?? usernameProblem ?? t("errors.validation")}
          </StatusBanner>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          <TextField label={t("settings.profile.name")} value={name} autoComplete="name" onChange={(event) => setName(event.target.value)} {...(nameMissing ? { error: t("errors.validation") } : {})} />
          <div className="flex flex-col gap-2">
            <TextField
              label={t("settings.profile.username")}
              value={username}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              onChange={(event) => {
                setUsername(event.target.value);
                setServerError(null);
              }}
              {...(usernameProblem || serverError?.field === "username" ? { error: serverError?.field === "username" ? serverError.text : (usernameProblem ?? "") } : {})}
            />
            {usernameState?.available && (
              <span className="flex items-center gap-1 text-caption font-semibold text-savings">
                <Icon icon={Check} size="sm" />
                {t("settings.profile.available")}
              </span>
            )}
            {usernameState?.reason === "TAKEN" && usernameState.suggestions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {usernameState.suggestions.map((suggestion) => (
                  <button key={suggestion} type="button" className={chipClasses()} aria-label={t("settings.profile.useSuggestion", { name: suggestion })} onClick={() => setUsername(suggestion)}>
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-end">
          <Button type="submit" loading={save.isPending} disabled={!dirty}>
            {t("settings.profile.save")}
          </Button>
        </div>
      </form>
    </div>
  );
}

function usernameText(t: Translator, locale: Locale, state: UsernameCheck | null): string | null {
  if (!state || state.available) return null;
  if (state.reason === "TOO_SOON" && state.changeableFrom) return t("settings.profile.tooSoon", { date: formatDate(new Date(state.changeableFrom), locale, { dateStyle: "long" }) });
  if (state.reason === "TAKEN") return t("settings.profile.taken");
  return t("settings.profile.invalid");
}

/** "Fotoğraf yükle" → crop dialog → upload → `PATCH /me`; "Kaldır" → initials again. */
function PhotoControl({ t, me, onSaved }: { t: Translator; me: Me; onSaved: (me: Me) => void }) {
  const client = useApiClient();
  const policy = useApiQuery("getUploadPolicy", { query: { purpose: "AVATAR" } }, { staleTime: Number.POSITIVE_INFINITY }).data?.data ?? null;
  const save = useApiMutation("updateMe");
  const [picked, setPicked] = useState<{ file: File; url: string } | null>(null);
  const [zoom, setZoom] = useState<number>(ZOOM.min);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const another = useRef<HTMLInputElement>(null);
  const accept = policy?.acceptedTypes ?? [];

  const pick = (file: File) => {
    setFailed(false);
    if (policy && (!accept.includes(file.type as (typeof accept)[number]) || file.size > policy.maxBytes)) {
      setFailed(true);
      return;
    }
    if (picked) URL.revokeObjectURL(picked.url);
    setZoom(ZOOM.min);
    setPicked({ file, url: URL.createObjectURL(file) });
  };
  const close = () => {
    if (picked) URL.revokeObjectURL(picked.url);
    setPicked(null);
  };
  const confirm = async () => {
    if (!picked) return;
    setBusy(true);
    setFailed(false);
    try {
      const uploadId = await uploadAvatar(client, await cropToSquare(picked.file, zoom));
      const { data } = await client.call("updateMe", { body: { avatarUploadId: uploadId } });
      onSaved(data);
      close();
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const hint = policy ? t("settings.profile.hint", { types: typeList(policy), size: megabytes(t, policy) }) : "";

  return (
    <>
      <AvatarUpload
        initials={initialsOf(me.displayName ?? me.username, t.locale)}
        src={imageUrl(me.avatarSha256)}
        uploadLabel={t("settings.profile.upload")}
        removeLabel={t("settings.profile.remove")}
        hint={hint}
        accept={accept}
        onPick={pick}
        onRemove={() => save.mutate({ body: { avatarUploadId: null } }, { onSuccess: ({ data }) => onSaved(data) })}
        removing={save.isPending}
      />
      {failed && !picked && <StatusBanner tone="danger">{t("settings.profile.photoFailed")}</StatusBanner>}
      <Dialog open={picked !== null} onClose={close} title={t("settings.profile.cropTitle")} closeLabel={t("common.close")} size="compact">
        {picked && (
          <div className="flex flex-col gap-4 p-5">
            <AvatarCrop src={picked.url} zoom={zoom} onZoomChange={setZoom} zoomLabel={t("settings.profile.zoom")} minZoom={ZOOM.min} maxZoom={ZOOM.max} step={ZOOM.step} />
            <span className="text-caption text-text-muted">{hint}</span>
            {failed && <StatusBanner tone="danger">{t("settings.profile.photoFailed")}</StatusBanner>}
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="secondary" onClick={() => another.current?.click()} disabled={busy}>
                {t("settings.profile.another")}
              </Button>
              <Button onClick={() => void confirm()} loading={busy}>
                {t("settings.profile.save")}
              </Button>
            </div>
            <input
              ref={another}
              type="file"
              accept={accept.join(",")}
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) pick(file);
                event.target.value = "";
              }}
            />
          </div>
        )}
      </Dialog>
    </>
  );
}
