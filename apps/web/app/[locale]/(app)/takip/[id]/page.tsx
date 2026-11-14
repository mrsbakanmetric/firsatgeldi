import { createTranslator, isLocale, localizedPath } from "@firsatgeldi/i18n";
import { buttonClasses, EmptyState, PageTemplate } from "@firsatgeldi/ui";
import { Hourglass } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

// Product Detail — not built yet: Tracked Items comes first (user decision 2026-11-14,
// docs/implementation_plan.md). Rows already link here; until the screen step this
// page says "coming soon" and leads back to the list.
export default async function ProductDetailPage({ params }: PageProps<"/[locale]/takip/[id]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = createTranslator(locale);
  return (
    <PageTemplate kind="detail" title={t("productDetail.title")}>
      <EmptyState
        icon={Hourglass}
        title={t("productDetail.soonTitle")}
        description={t("productDetail.soonText")}
        action={
          <Link href={localizedPath("/takip", locale)} className={buttonClasses("secondary")}>
            {t("productDetail.back")}
          </Link>
        }
      />
    </PageTemplate>
  );
}
