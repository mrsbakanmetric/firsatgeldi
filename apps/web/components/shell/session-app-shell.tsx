"use client";

// AppShell bound to the session (GET /me through useSession). Until the session
// is read the account area stays an empty placeholder, so a signed-in user never
// sees "Giriş yap" flash. No notification count until the Notifications step
// brings its endpoint: the bell is the icon only.
import type { Locale } from "@firsatgeldi/i18n";
import type { ReactNode } from "react";
import { useSession } from "../../lib/api/hooks";
import { AppShell } from "./app-shell";
import type { ShellViewer } from "./parts";

/** "Sena B." → "SB"; at most two letters, in the user's language rules; empty without a name (Avatar shows its icon). */
export function initialsOf(name: string | null, locale: Locale): string {
  return (name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toLocaleUpperCase(locale))
    .join("");
}

export function SessionAppShell({ locale, children }: { locale: Locale; children: ReactNode }) {
  const session = useSession();
  const viewer: ShellViewer =
    session.status === "loading"
      ? { kind: "loading" }
      : session.status === "ready" && session.me
        ? { kind: "user", initials: initialsOf(session.me.displayName ?? session.me.username, locale), unreadCount: null, unreadDeal: false }
        : // A failed session read shows the guest controls: signing in still works.
          { kind: "guest" };
  return (
    <AppShell locale={locale} viewer={viewer}>
      {children}
    </AppShell>
  );
}
