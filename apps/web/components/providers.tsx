"use client";

// Client-side providers for the whole app: server state (typed API client +
// TanStack Query, live updates for a signed-in user) and Next.js links for UI
// components (client-side navigation, prefetch).
import type { Locale } from "@firsatgeldi/i18n";
import { LinkProvider, type LinkProps } from "@firsatgeldi/ui";
import NextLink from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { useSession } from "../lib/api/hooks";
import { useLiveUpdates } from "../lib/api/live-updates";
import { ApiProvider } from "../lib/api/provider";

function AppLink(props: LinkProps) {
  // Same anchor attributes; Next's types only reject explicit `undefined` handlers.
  return <NextLink {...(props as ComponentProps<typeof NextLink>)} />;
}

function LiveUpdates() {
  const session = useSession();
  useLiveUpdates(session.status === "ready" && session.me !== null);
  return null;
}

export function Providers({ locale, children }: { locale: Locale; children: ReactNode }) {
  return (
    <ApiProvider locale={locale}>
      <LiveUpdates />
      <LinkProvider component={AppLink}>{children}</LinkProvider>
    </ApiProvider>
  );
}
