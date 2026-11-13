import type { ReactNode } from "react";

// Skeleton only. The language attribute, metadata and theme come from the
// i18n and theme steps (implementation_plan.md, steps 6 and 7).
export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
