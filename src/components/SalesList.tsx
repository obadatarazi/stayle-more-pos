import Icon from "@/components/Icon";
import { useI18n } from "@/i18n/useI18n";
import { money, saleCost, salePrice, shortDate } from "@/lib/format";
import type { Product, Sale } from "@/types/store";

export default function SalesList({
  sales,
  products,
  onDelete,
}: {
  sales: Sale[];
  products: Product[];
  onDelete?: (id: number) => void;
}) {
  const { t } = useI18n();

  if (!sales.length) {
    return <p className="px-5 py-10 text-center text-sm text-slate-500">{t("salesList.empty")}</p>;
  }

  return (
    <div className="divide-y divide-slate-100">
      {sales.map((sale) => {
        const product = products.find((item) => item.sku === sale.sku);
        if (!product) return null;
        const price = salePrice(sale, product);
        return (
          <div key={sale.id} className="flex items-center gap-2.5 px-3 py-3.5 md:gap-3 md:px-6 md:py-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand text-navy">
              <Icon name="receipt" className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-slate-800">{product.nameAr}</p>
              <p className="mt-0.5 text-xs text-slate-400">
                {shortDate(sale.date)} · ×{sale.quantity}
                {" · "}
                {sale.soldByName || sale.soldBy || t("common.unknown")}
              </p>
            </div>
            <div className="shrink-0 text-left">
              <p className="text-sm font-bold text-slate-900">{money(price * sale.quantity)}</p>
              <p className="mt-0.5 text-xs font-semibold text-emerald-600">
                +{money((price - saleCost(sale, product)) * sale.quantity)}
              </p>
            </div>
            {onDelete && (
              <button
                className="grid size-11 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-500 active:bg-coral-soft active:text-coral-dark"
                onClick={() => onDelete(sale.id)}
                aria-label={t("salesList.deleteSale")}
                title={t("common.delete")}
              >
                <Icon name="trash" className="size-4" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
