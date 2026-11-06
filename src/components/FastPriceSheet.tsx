import { useEffect, useMemo, useState } from "react";
import Button from "@/components/Button";
import { inputClass } from "@/components/FieldLabel";
import Icon from "@/components/Icon";
import { useI18n } from "@/i18n/useI18n";
import { money } from "@/lib/format";
import type { Product } from "@/types/store";

export default function FastPriceSheet({
  products,
  initialSku,
  onClose,
  onSave,
}: {
  products: Product[];
  initialSku?: string;
  onClose: () => void;
  onSave: (product: Product) => void;
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [focusSku, setFocusSku] = useState(initialSku || "");

  useEffect(() => {
    if (!initialSku) return;
    const product = products.find((item) => item.sku === initialSku);
    if (!product) return;
    setFocusSku(initialSku);
    setDrafts((current) => ({
      ...current,
      [initialSku]: String(Math.round(product.price) || 0),
    }));
  }, [initialSku, products]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? products.filter((product) =>
          [product.nameAr, product.name, product.category, product.sku]
            .join(" ")
            .toLowerCase()
            .includes(q),
        )
      : focusSku
        ? products.filter((product) => product.sku === focusSku || product.quickSale)
        : products.filter((product) => product.quickSale);
    const sorted = [...list].sort((a, b) => {
      if (a.sku === focusSku) return -1;
      if (b.sku === focusSku) return 1;
      return Number(b.quickSale) - Number(a.quickSale) || a.nameAr.localeCompare(b.nameAr, "ar");
    });
    return sorted.slice(0, q ? 40 : 30);
  }, [products, query, focusSku]);

  const draftValue = (product: Product) =>
    drafts[product.sku] ?? String(Math.round(product.price) || 0);

  const parsedPrice = (product: Product) => {
    const raw = draftValue(product).replace(/[^\d.]/g, "");
    if (raw === "" || raw === ".") return product.price;
    const next = Number(raw);
    return Number.isFinite(next) ? Math.max(0, next) : product.price;
  };

  const isChanged = (product: Product) =>
    Math.round(parsedPrice(product)) !== Math.round(product.price);

  const saveOne = (product: Product) => {
    const price = Math.round(parsedPrice(product));
    if (price === Math.round(product.price)) return;
    onSave({ ...product, price });
    setDrafts((current) => {
      const next = { ...current };
      delete next[product.sku];
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center overflow-hidden bg-slate-950/50 backdrop-blur-sm md:items-center md:p-4">
      <button className="absolute inset-0" onClick={onClose} aria-label={t("common.close")} />
      <div className="sheet-enter relative z-10 flex h-[min(92dvh,100%)] max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl safe-bottom md:h-auto md:max-h-[90vh] md:rounded-3xl">
        <div className="shrink-0 border-b border-slate-100 px-4 pb-3 pt-2.5 sm:px-5">
          <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-200 md:hidden" />
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand text-navy">
                <Icon name="cash" />
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-base font-bold text-slate-900">{t("fastPrice.title")}</h2>
                <p className="truncate text-xs text-slate-500">{t("fastPrice.subtitle")}</p>
              </div>
            </div>
            <button
              type="button"
              className="grid size-11 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600"
              onClick={onClose}
              aria-label={t("common.close")}
            >
              <Icon name="close" />
            </button>
          </div>
          <div className="relative mt-3">
            <Icon name="search" className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus={!initialSku}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-3 pr-10 text-base outline-none focus:border-navy focus:bg-white focus:ring-4 focus:ring-[#fddfe0]"
              placeholder={t("fastPrice.searchPlaceholder")}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain px-3 py-3 sm:px-4">
          {filtered.length ? (
            filtered.map((product) => {
              const nextPrice = parsedPrice(product);
              const changed = isChanged(product);
              const profit = nextPrice - product.cost;
              return (
                <div
                  key={product.sku}
                  className={`rounded-2xl border p-3 ${
                    product.sku === focusSku || changed
                      ? "border-navy/30 bg-soft-blue"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">{product.nameAr}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {product.category} · {t("fastPrice.cost", { amount: money(product.cost) })}
                      </p>
                    </div>
                    {product.quickSale && (
                      <span className="shrink-0 rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-navy">
                        {t("common.quickSale")}
                      </span>
                    )}
                  </div>
                  <div className="flex items-end gap-2">
                    <label className="min-w-0 flex-1">
                      <span className="mb-1 block text-[11px] font-bold text-slate-500">
                        {t("fastPrice.sellingPrice")}
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
                        autoFocus={product.sku === initialSku}
                        className={`${inputClass} min-h-12 px-3 py-2 text-center text-lg font-bold tabular-nums`}
                        value={draftValue(product)}
                        onFocus={() => {
                          setFocusSku(product.sku);
                          setDrafts((current) => ({
                            ...current,
                            [product.sku]: String(Math.round(product.price) || 0),
                          }));
                        }}
                        onChange={(event) => {
                          const raw = event.target.value.replace(/[^\d.]/g, "");
                          setDrafts((current) => ({ ...current, [product.sku]: raw }));
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            saveOne(product);
                          }
                        }}
                        aria-label={t("fastPrice.sellingPrice")}
                      />
                    </label>
                    <Button
                      type="button"
                      className="min-h-12 shrink-0 px-4"
                      disabled={!changed}
                      onClick={() => saveOne(product)}
                    >
                      <Icon name="check" className="size-4" /> {t("fastPrice.save")}
                    </Button>
                  </div>
                  <p className={`mt-2 text-[11px] font-semibold ${profit >= 0 ? "text-emerald-700" : "text-coral-dark"}`}>
                    {changed
                      ? t("fastPrice.profitPreview", {
                          old: money(product.price),
                          next: money(nextPrice),
                          profit: money(profit),
                        })
                      : t("fastPrice.currentProfit", { profit: money(profit) })}
                  </p>
                </div>
              );
            })
          ) : (
            <p className="py-10 text-center text-sm text-slate-500">
              {query.trim() ? t("fastPrice.noResults") : t("fastPrice.emptyHint")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
