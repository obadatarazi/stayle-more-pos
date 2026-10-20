import { useMemo } from "react";
import { useI18n } from "@/i18n/useI18n";
import { initialProducts } from "./demo";
import type { Product } from "@/types/store";

/** Localized display name for a product (AR-first; EN uses `name`). */
export function productLabel(product: Product, lang: "ar" | "en") {
  return lang === "ar" ? product.nameAr || product.name : product.name || product.nameAr;
}

/** Demo seed merged with locale-aware labels for UI lists. */
export function useDemo() {
  const { lang } = useI18n();

  const items = useMemo(
    () =>
      initialProducts.map((product) => ({
        ...product,
        label: productLabel(product, lang),
      })),
    [lang],
  );

  return { items, productLabel: (product: Product) => productLabel(product, lang) };
}
