import { FormEvent, useState } from "react";
import Button from "@/components/Button";
import FieldLabel, { inputClass } from "@/components/FieldLabel";
import Icon from "@/components/Icon";
import { useI18n } from "@/i18n/useI18n";
import { money } from "@/lib/format";
import type { PriceScope, Product } from "@/types/store";

export default function PriceAdjustModal({
  products,
  selectedSkus,
  categories,
  defaultCategory,
  onClose,
  onApply,
}: {
  products: Product[];
  selectedSkus: Set<string>;
  categories: string[];
  defaultCategory: string;
  onClose: () => void;
  onApply: (updated: Product[]) => void;
}) {
  const { t } = useI18n();
  const [scope, setScope] = useState<PriceScope>(
    selectedSkus.size ? "selected" : defaultCategory !== "all" ? "category" : "all",
  );
  const [category, setCategory] = useState(defaultCategory !== "all" ? defaultCategory : categories[0] || "");
  const [mode, setMode] = useState<"amount" | "percent">("percent");
  const [direction, setDirection] = useState<1 | -1>(1);
  const [value, setValue] = useState("");

  const amount = Number(value);
  const targets = products.filter((product) =>
    scope === "selected" ? selectedSkus.has(product.sku) : scope === "category" ? product.category === category : true,
  );

  const adjust = (base: number) => {
    const delta = mode === "percent" ? (base * amount) / 100 : amount;
    const next = Math.max(0, base + direction * delta);
    return Math.round(next);
  };
  const valid = targets.length > 0 && amount > 0 && !Number.isNaN(amount);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    onApply(targets.map((product) => ({ ...product, price: adjust(product.price) })));
  };

  const segment = (active: boolean) =>
    `min-h-11 rounded-xl px-3 text-sm font-semibold transition ${active ? "bg-navy text-white" : "border border-slate-200 bg-white text-slate-600 hover:border-navy"}`;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/45 backdrop-blur-sm md:items-center md:p-4">
      <button className="absolute inset-0" onClick={onClose} aria-label={t("common.close")} />
      <form onSubmit={handleSubmit} className="sheet-enter relative z-10 max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl border border-slate-200 bg-white p-5 shadow-2xl safe-bottom md:max-h-[90vh] md:max-w-lg md:rounded-3xl md:p-6">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200 md:hidden" />
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-brand text-navy">
              <Icon name="edit" />
            </span>
            <div>
              <h2 className="font-bold text-slate-900">{t("priceAdjust.title")}</h2>
              <p className="text-xs text-slate-500">{t("priceAdjust.subtitle")}</p>
            </div>
          </div>
          <button type="button" className="grid size-11 place-items-center rounded-xl text-slate-500 hover:bg-slate-100" onClick={onClose} aria-label={t("common.close")}>
            <Icon name="close" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <FieldLabel>{t("priceAdjust.productsLabel")}</FieldLabel>
            <div className="grid grid-cols-3 gap-2">
              <button type="button" className={segment(scope === "selected")} onClick={() => setScope("selected")} disabled={!selectedSkus.size}>
                {t("priceAdjust.selected", { count: selectedSkus.size })}
              </button>
              <button type="button" className={segment(scope === "category")} onClick={() => setScope("category")}>{t("priceAdjust.category")}</button>
              <button type="button" className={segment(scope === "all")} onClick={() => setScope("all")}>{t("common.all")}</button>
            </div>
            {scope === "category" && (
              <select className={`${inputClass} mt-2`} value={category} onChange={(event) => setCategory(event.target.value)}>
                {categories.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>{t("priceAdjust.operation")}</FieldLabel>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" className={segment(direction === 1)} onClick={() => setDirection(1)}>{t("priceAdjust.increase")}</button>
                <button type="button" className={segment(direction === -1)} onClick={() => setDirection(-1)}>{t("priceAdjust.decrease")}</button>
              </div>
            </div>
            <div>
              <FieldLabel>{t("priceAdjust.type")}</FieldLabel>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" className={segment(mode === "percent")} onClick={() => setMode("percent")}>%</button>
                <button type="button" className={segment(mode === "amount")} onClick={() => setMode("amount")}>{t("priceAdjust.amount")}</button>
              </div>
            </div>
          </div>

          <label className="block">
            <FieldLabel>{mode === "percent" ? t("priceAdjust.percentLabel") : t("priceAdjust.amountLabel")}</FieldLabel>
            <input type="number" min="0" step="0.01" inputMode="decimal" className={inputClass} value={value} onChange={(event) => setValue(event.target.value)} required />
          </label>

          <div className="rounded-2xl border border-slate-200">
            <p className="border-b border-slate-100 px-3.5 py-2.5 text-xs font-bold text-slate-500">
              {t("priceAdjust.preview", { count: targets.length })}
            </p>
            <div className="max-h-56 divide-y divide-slate-100 overflow-y-auto">
              {targets.length ? targets.map((product) => {
                const next = valid ? adjust(product.price) : product.price;
                const losing = next < product.cost;
                return (
                  <div key={product.sku} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm">
                    <span className="min-w-0 truncate font-semibold text-slate-700">{product.nameAr}</span>
                    <span className="shrink-0 tabular-nums" dir="ltr">
                      <span className="text-slate-400">{money(product.price)}</span>
                      {" → "}
                      <span className={`font-bold ${losing ? "text-coral-dark" : "text-slate-900"}`}>{money(next)}</span>
                    </span>
                  </div>
                );
              }) : (
                <p className="px-3.5 py-6 text-center text-sm text-slate-500">{t("priceAdjust.empty")}</p>
              )}
            </div>
          </div>
          {valid && targets.some((product) => adjust(product.price) < product.cost) && (
            <p className="flex items-center gap-2 text-xs font-semibold text-coral-dark">
              <Icon name="warning" className="size-4" /> {t("priceAdjust.belowCost")}
            </p>
          )}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2">
          <Button type="button" variant="secondary" className="min-h-12" onClick={onClose}>{t("common.cancel")}</Button>
          <Button type="submit" className="min-h-12" disabled={!valid}>{t("priceAdjust.apply", { count: targets.length })}</Button>
        </div>
      </form>
    </div>
  );
}
