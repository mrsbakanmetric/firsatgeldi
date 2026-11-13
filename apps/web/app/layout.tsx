import type { ReactNode } from "react";
import { themeInitScript } from "../lib/theme/theme-dom";
import "./globals.css";

// The language attribute and metadata come from the i18n step (implementation_plan.md, step 7).
// suppressHydrationWarning: the inline theme script may set data-theme on <html> before React hydrates.
export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="bg-background font-base text-body text-text antialiased">{children}</body>
    </html>
  );
}
