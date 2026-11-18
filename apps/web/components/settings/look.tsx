"use client";

// Dil ve görünüm (design "9 Ayarlar" v2.1): language and theme as radio cards; each choice
// saves at once ("Kaydedildi"). The theme applies instantly in this browser and is saved to
// the account; a language change is saved, remembered for the next visit and opens the same
// section in that language.
import { LOCALES, type Locale, type Translator } from "@firsatgeldi/i18n";
import { ChoiceCards } from "@firsatgeldi/ui";
import { useRouter } from "next/navigation";
import { useApiMutation, useSession } from "../../lib/api/hooks";
import { writeLocalePreference } from "../../lib/i18n/locale-preference";
import { settingsHref } from "../../lib/settings/sections";
import { useThemePreference } from "../../lib/theme/use-theme-preference";
import { useSetMe } from "./profile";
import { SettingsCard, useMarkSaved } from "./settings";

const THEMES = ["light", "dark", "system"] as const;

export function LookSection({ locale, t }: { locale: Locale; t: Translator }) {
  const session = useSession();
  const router = useRouter();
  const markSaved = useMarkSaved();
  const setMe = useSetMe();
  const save = useApiMutation("updateMe");
  const [theme, setTheme] = useThemePreference();
  const me = session.status === "ready" ? session.me : null;
  if (!me) return null;

  return (
    <div className="flex flex-col gap-4">
      <SettingsCard title={t("settings.look.language")}>
        <div className="p-5">
          <ChoiceCards
            label={t("settings.look.language")}
            options={LOCALES.map((value) => ({ value, title: t(`settings.look.languages.${value}`) }))}
            value={locale}
            onValueChange={(value) => {
              const next = value as Locale;
              if (next === locale) return;
              save.mutate(
                { body: { locale: next } },
                {
                  onSuccess: ({ data }) => {
                    setMe(data);
                    writeLocalePreference(next);
                    router.push(settingsHref(next, "look"));
                  },
                },
              );
            }}
          />
        </div>
      </SettingsCard>
      <SettingsCard title={t("settings.look.theme")}>
        <div className="p-5">
          <ChoiceCards
            label={t("settings.look.theme")}
            options={THEMES.map((value) => ({ value, title: t(`settings.look.themes.${value}`) }))}
            value={theme}
            onValueChange={(value) => {
              const next = value as (typeof THEMES)[number];
              setTheme(next);
              save.mutate({ body: { theme: next } }, { onSuccess: ({ data }) => (setMe(data), markSaved()) });
            }}
          />
        </div>
      </SettingsCard>
    </div>
  );
}
