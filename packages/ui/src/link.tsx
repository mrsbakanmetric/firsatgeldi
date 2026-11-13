"use client";

// Components that render links (menus, navigation) use the app's link
// component (Next.js Link on the web) through this context; the default is a
// plain anchor, so the components stay framework-free.
import { createContext, forwardRef, useContext, type AnchorHTMLAttributes, type ComponentType, type ReactNode, type Ref } from "react";

export type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; ref?: Ref<HTMLAnchorElement> };

const PlainLink = forwardRef<HTMLAnchorElement, LinkProps>(function PlainLink(props, ref) {
  return <a ref={ref} {...props} />;
});

const LinkContext = createContext<ComponentType<LinkProps>>(PlainLink);

export function LinkProvider({ component, children }: { component: ComponentType<LinkProps>; children: ReactNode }) {
  return <LinkContext.Provider value={component}>{children}</LinkContext.Provider>;
}

export function useLinkComponent(): ComponentType<LinkProps> {
  return useContext(LinkContext);
}
