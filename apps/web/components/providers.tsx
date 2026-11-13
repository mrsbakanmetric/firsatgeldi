"use client";

// Client-side providers for the whole app. UI components render links through
// Next.js Link (client-side navigation, prefetch).
import { LinkProvider, type LinkProps } from "@firsatgeldi/ui";
import NextLink from "next/link";
import type { ComponentProps, ReactNode } from "react";

function AppLink(props: LinkProps) {
  // Same anchor attributes; Next's types only reject explicit `undefined` handlers.
  return <NextLink {...(props as ComponentProps<typeof NextLink>)} />;
}

export function Providers({ children }: { children: ReactNode }) {
  return <LinkProvider component={AppLink}>{children}</LinkProvider>;
}
