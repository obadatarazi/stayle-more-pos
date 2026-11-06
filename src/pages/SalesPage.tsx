import { useMemo } from "react";
import Button from "@/components/Button";
import SalesList from "@/components/SalesList";
import FieldLabel, { inputClass } from "@/components/FieldLabel";
import Icon from "@/components/Icon";
import PageIntro from "@/components/PageIntro";
import { accounts } from "@/data/demo";
import { useI18n } from "@/i18n/useI18n";
import { formatMargin, money, saleCost, salePrice } from "@/lib/format";
import type { Product, Sale } from "@/types/store";

export default function SalesPage({
  sales,
  products,
  onDeleteSale,
  onQuickSale,
  sellerFilter,
  setSellerFilter,
  onExport,
}: {
  sales: Sale[];
  products: Product[];
  onDeleteSale: (id: number) => void;
  onQuickSale: () => void;
  sellerFilter: string;
  setSellerFilter: (value: string) => void;
  onExport: () => void;
}) {
  const { t } = useI18n();

  const filteredSales = useMemo(() => {
    if (sellerFilter === "all") return sales;
    if (sellerFilter === "unknown") return sales.filter((sale) => !sale.soldBy);
    return sales.filter((sale) => sale.soldBy === sellerFilter);
  }, [sales, sellerFilter]);

  const sellerStats = useMemo(() => {
    const revenue = filteredSales.reduce((sum, sale) => {
      const product = products.find((item) => item.sku === sale.sku);
      return sum + salePrice(sale, product) * sale.quantity;
    }, 0);
    const net = filteredSales.reduce((sum, sale) => {
      const product = products.find((item) => item.sku === sale.sku);
      return sum + (salePrice(sale, product) - saleCost(sale, product)) * sale.quantity;
    }, 0);
    const qty = filteredSales.reduce((sum, sale) => sum + sale.quantity, 0);
    return { revenue, net, qty, count: filteredSales.length };
  }, [filteredSales, products]);

  const hasUnknown = sales.some((sale) => !sale.soldBy);

  const sellerLogLabel =
    sellerFilter === "all"
      ? t("sales.allSellers")
      : sellerFilter === "unknown"
        ? t("common.unknown")
        : accounts.find((account) => account.username === sellerFilter)?.displayName || sellerFilter;

  return (
    <>
      <PageIntro
        eyebrow={t("sales.eyebrow")}
        title={t("sales.title")}
        description={t("sales.description")}
        action={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button className="w-full sm:w-auto" variant="secondary" onClick={onExport}>
              <Icon name="receipt" className="size-4" /> {t("sales.exportExcel")}
            </Button>
            <Button className="w-full sm:w-auto" onClick={onQuickSale}>
              <Icon name="plus" className="size-4" /> {t("common.quickSale")}
            </Button>
          </div>
        }
      />

      <section className="mb-4 rounded-2xl border border-coral-border bg-white p-4 md:mb-5 md:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">{t("sales.sellerReport")}</h2>
            <p className="mt-1 text-xs text-slate-500">{t("sales.sellerReportHint")}</p>
          </div>
          <label className="w-full md:w-72">
            <FieldLabel>{t("sales.filterBySeller")}</FieldLabel>
            <select
              className={inputClass}
              value={sellerFilter}
              onChange={(event) => setSellerFilter(event.target.value)}
            >
              <option value="all">{t("sales.allSellers")}</option>
              {accounts.map((account) => (
                <option key={account.username} value={account.username}>
                  {account.displayName} ({account.username})
                </option>
              ))}
              {hasUnknown && <option value="unknown">{t("sales.unknownOld")}</option>}
            </select>
          </label>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-[11px] font-semibold text-slate-500">{t("sales.ops")}</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-slate-950">{sellerStats.count}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-[11px] font-semibold text-slate-500">{t("sales.pieces")}</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-slate-950">{sellerStats.qty}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-3">
            <p className="text-[11px] font-semibold text-slate-500">{t("sales.revenue")}</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-navy">{money(sellerStats.revenue)}</p>
          </div>
          <div className="rounded-2xl bg-emerald-50 p-3">
            <p className="text-[11px] font-semibold text-slate-500">{t("sales.netProfit")}</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-emerald-700">{money(sellerStats.net)}</p>
          </div>
          <div className="col-span-2 rounded-2xl bg-navy/5 p-3 md:col-span-1">
            <p className="text-[11px] font-semibold text-slate-500">{t("sales.margin")}</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-navy">
              {formatMargin(sellerStats.net, sellerStats.revenue)}
            </p>
          </div>
        </div>
      </section>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 md:px-6 md:py-5">
          <div>
            <h2 className="font-bold text-slate-900">{t("sales.logTitle")}</h2>
            <p className="mt-1 text-xs text-slate-500">
              {sellerLogLabel}
              {" · "}
              {t("sales.opsCount", { count: filteredSales.length })}
            </p>
          </div>
          <Button variant="ghost" className="min-h-10 px-2" onClick={onExport}>{t("sales.exportExcel")}</Button>
        </div>
        <SalesList sales={filteredSales} products={products} onDelete={onDeleteSale} />
      </div>
    </>
  );
}
