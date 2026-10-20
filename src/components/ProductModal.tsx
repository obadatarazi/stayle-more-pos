import { FormEvent, useState } from "react";
import Button from "@/components/Button";
import FieldLabel, { inputClass } from "@/components/FieldLabel";
import Icon from "@/components/Icon";
import { DEFAULT_REORDER_LEVEL } from "@/config/site";
import { useI18n } from "@/i18n/useI18n";
import { costFromUsd, money, usd } from "@/lib/format";
import type { Product } from "@/types/store";

export default function ProductModal({
  mode,
  product,
  categories,
  onClose,
  onSave,
  usdRate,
}: {
  mode: "add" | "edit";
  product: Product | null;
  categories: string[];
  onClose: () => void;
  onSave: (product: Product, mode: "add" | "edit") => void;
  usdRate: number;
}) {
  const { t } = useI18n();
  const [nameAr, setNameAr] = useState(product?.nameAr || "");
  const [category, setCategory] = useState(product?.category || categories[0] || t("common.other"));
  const [cost, setCost] = useState(String(product?.cost ?? ""));
  const [price, setPrice] = useState(String(product?.price ?? ""));
  const [costUsd, setCostUsd] = useState(product?.costUsd ? String(product.costUsd) : "");
  const [rate, setRate] = useState(String(product?.usdRate || usdRate || ""));
  const usdCosted = Number(costUsd) > 0;
  const derivedCost = costFromUsd(Number(costUsd), Number(rate) || 0);
  const [initialStock, setInitialStock] = useState(String(product?.initialStock ?? ""));
  const [quickSale, setQuickSale] = useState(Boolean(product?.quickSale));

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const parsedCost = Number(cost);
    const parsedPrice = Number(price);
    const parsedCostUsd = Number(costUsd || 0);
    const parsedRate = Number(rate || 0);
    if (parsedCostUsd > 0 && !(parsedRate > 0)) return;
    const parsedStock = Number(initialStock);
    if (!nameAr.trim() || (!usdCosted && Number.isNaN(parsedCost)) || Number.isNaN(parsedPrice) || Number.isNaN(parsedCostUsd) || Number.isNaN(parsedStock)) return;
    const sku = product?.sku || `SM-${Date.now().toString().slice(-6)}`;
    onSave(
      {
        sku,
        name: nameAr.trim(),
        nameAr: nameAr.trim(),
        category,
        cost: parsedCostUsd > 0 ? costFromUsd(parsedCostUsd, parsedRate) : parsedCost,
        price: parsedPrice,
        costUsd: parsedCostUsd,
        usdRate: parsedCostUsd > 0 ? parsedRate : 0,
        initialStock: parsedStock,
        reorderLevel: product?.reorderLevel ?? DEFAULT_REORDER_LEVEL,
        quickSale,
      },
      mode,
    );
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/45 backdrop-blur-sm md:items-center md:p-4">
      <button className="absolute inset-0" onClick={onClose} aria-label={t("common.close")} />
      <form onSubmit={handleSubmit} className="sheet-enter relative z-10 max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl border border-slate-200 bg-white p-5 shadow-2xl safe-bottom md:max-h-[90vh] md:max-w-lg md:rounded-3xl md:p-6">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200 md:hidden" />
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-brand text-navy">
              <Icon name={mode === "add" ? "plus" : "edit"} />
            </span>
            <div>
              <h2 className="font-bold text-slate-900">{mode === "add" ? t("productModal.addTitle") : t("productModal.editTitle")}</h2>
              <p className="text-xs text-slate-500">{mode === "add" ? t("productModal.addSubtitle") : product?.nameAr}</p>
            </div>
          </div>
          <button type="button" className="grid size-11 place-items-center rounded-xl text-slate-500 hover:bg-slate-100" onClick={onClose} aria-label={t("common.close")}>
            <Icon name="close" />
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <FieldLabel>{t("productModal.itemName")}</FieldLabel>
            <input className={inputClass} value={nameAr} onChange={(event) => setNameAr(event.target.value)} required />
          </label>
          <label>
            <FieldLabel>{t("productModal.category")}</FieldLabel>
            <select className={inputClass} value={category} onChange={(event) => setCategory(event.target.value)}>
              {categories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label>
            <FieldLabel>{t("productModal.openingStock")}</FieldLabel>
            <input type="number" min="0" className={inputClass} value={initialStock} onChange={(event) => setInitialStock(event.target.value)} required />
          </label>
          <label>
            <FieldLabel>{t("productModal.costUsd")}</FieldLabel>
            <input type="number" min="0" step="0.01" dir="ltr" className={inputClass} value={costUsd} onChange={(event) => setCostUsd(event.target.value)} placeholder={t("productModal.optional")} />
          </label>
          {usdCosted && (
            <label>
              <FieldLabel>{t("productModal.exchangeRate")}</FieldLabel>
              <input type="number" min="0" step="0.01" dir="ltr" className={inputClass} value={rate} onChange={(event) => setRate(event.target.value)} required />
            </label>
          )}
          <label>
            <FieldLabel>{t("productModal.cost")}</FieldLabel>
            {usdCosted ? (
              <div className="flex min-h-12 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-sm">
                <span className="font-bold text-slate-900">{money(derivedCost)}</span>
                <span className="text-xs text-slate-500" dir="ltr">{usd(Number(costUsd))} × {Number(rate) || 0}</span>
              </div>
            ) : (
              <input type="number" min="0" step="0.01" className={inputClass} value={cost} onChange={(event) => setCost(event.target.value)} required />
            )}
          </label>
          <label>
            <FieldLabel>{t("productModal.salePrice")}</FieldLabel>
            <input type="number" min="0" step="0.01" className={inputClass} value={price} onChange={(event) => setPrice(event.target.value)} required />
          </label>
          <button
            type="button"
            onClick={() => setQuickSale((current) => !current)}
            className={`sm:col-span-2 flex min-h-12 items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-right transition ${
              quickSale ? "border-navy bg-soft-blue" : "border-slate-200 bg-white"
            }`}
          >
            <span>
              <span className="block text-sm font-bold text-slate-900">{t("common.quickSale")}</span>
              <span className="mt-0.5 block text-xs text-slate-500">{t("productModal.quickSaleHint")}</span>
            </span>
            <span className={`grid size-10 place-items-center rounded-xl ${quickSale ? "bg-navy text-white" : "bg-slate-100 text-slate-500"}`}>
              <Icon name={quickSale ? "check" : "sparkles"} className="size-4" />
            </span>
          </button>
        </div>
        <div className="mt-6 flex gap-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>{t("common.cancel")}</Button>
          <Button type="submit" className="flex-1">{mode === "add" ? t("productModal.saveProduct") : t("productModal.saveEdits")}</Button>
        </div>
      </form>
    </div>
  );
}
