import { isLocale } from "@firsatgeldi/i18n";
import { notFound } from "next/navigation";
import { ProductDetail } from "../../../../../components/product-detail/product-detail";

// Product Detail — design "2 Ürün Detayı v2" (docs/screen_status.md), on the mock API in Phase 1.
// Bought mode in this step's PR 2; want-to-buy mode follows in PR 3 (implementation_plan.md step 11).
export default async function ProductDetailPage({ params }: PageProps<"/[locale]/takip/[id]">) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  return <ProductDetail locale={locale} id={id} />;
}
