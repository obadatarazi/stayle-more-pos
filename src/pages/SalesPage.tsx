import { FormEvent, useMemo } from "react";
import Button from "@/components/Button";
import ChangeCalculator from "@/components/ChangeCalculator";
import SalesList from "@/components/SalesList";
import FieldLabel, { inputClass } from "@/components/FieldLabel";
import Icon from "@/components/Icon";
import PageIntro from "@/components/PageIntro";
import Stepper from "@/components/Stepper";
import { accounts } from "@/data/demo";
import { useI18n } from "@/i18n/useI18n";
import { money, saleCost, salePrice } from "@/lib/format";
import type { Product, Sale } from "@/types/store";

export default function SalesPage({
  sales,
  products,
  selectedSku,
  setSelectedSku,
  quantity,
  setQuantity,
  unitPrice,
  setUnitPrice,
  saleDate,
  setSaleDate,
  selectedProduct,
  selectedRemaining,
  onSubmit,
  onDeleteSale,
  onQuickSale,
  sellerFilter,
  setSellerFilter,
  onExport,
}: {
  sales: Sale[];
  products: Product[];
  selectedSku: string;
  setSelectedSku: (sku: string) => void;
  quantity: number;
  setQuantity: (quantity: number) => void;
  unitPrice: number;
  setUnitPrice: (price: number) => void;
  saleDate: string;
  setSaleDate: (date: string) => void;
  selectedProduct: Product;
  selectedRemaining: number;
  onSubmit: (event: FormEvent) => void;
  onDeleteSale: (id: number) => void;
  onQuickSale: () => void;
  sellerFilter: string;
  setSellerFilter: (value: string) => void;
  onExport: () => void;
}) {
  const { t } = useI18n();
  const total = quantity * unitPrice;
  const profit = quantity * (unitPrice - selectedProduct.cost);
  const priceChanged = unitPrice !== selectedProduct.price;

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
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
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
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr] md:gap-5">
        <form onSubmit={onSubmit} className="rounded-2xl border border-slate-200 bg-white p-4 md:p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-brand text-navy"><Icon name="receipt" /></span>
            <div><h2 className="font-bold text-slate-900">{t("sales.newSale")}</h2><p className="text-xs text-slate-500">{t("sales.orUsePlus")}</p></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 md:gap-5">
            <label>
              <FieldLabel>{t("sales.date")}</FieldLabel>
              <input type="date" className={inputClass} value={saleDate} onChange={(event) => setSaleDate(event.target.value)} required />
            </label>
            <label>
              <FieldLabel>{t("export.itemName")}</FieldLabel>
              <select className={inputClass} value={selectedSku} onChange={(event) => setSelectedSku(event.target.value)}>
                {products.map((product) => (
                  <option key={product.sku} value={product.sku}>{product.nameAr}</option>
                ))}
              </select>
            </label>
            <div>
              <FieldLabel>{t("export.soldQty")}</FieldLabel>
              <Stepper value={quantity} min={1} max={Math.max(1, selectedRemaining)} onChange={setQuantity} />
              <span className="mt-2 block text-xs text-slate-400">{t("sales.availableHint", { count: selectedRemaining })}</span>
            </div>
            <label>
              <FieldLabel>{t("export.unitPrice")}</FieldLabel>
              <input type="number" min="0" step="0.01" className={inputClass} value={unitPrice} onChange={(event) => setUnitPrice(Number(event.target.value))} required />
              <span className="mt-2 flex items-center justify-between gap-2 text-xs text-slate-400">
                <span>{t("sales.defaultPrice", { price: money(selectedProduct.price) })}</span>
                {priceChanged && (
                  <button type="button" className="font-bold text-navy" onClick={() => setUnitPrice(selectedProduct.price)}>{t("sales.restore")}</button>
                )}
              </span>
            </label>
          </div>
          <div className="my-5 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4">
            <div>
              <p className="text-xs font-semibold text-slate-500">{t("sales.income")}</p>
              <p className="mt-1 text-xl font-bold text-slate-950">{money(total)}</p>
            </div>
            <div className="border-r border-slate-200 pr-4">
              <p className="text-xs font-semibold text-slate-500">{t("sales.profit")}</p>
              <p className="mt-1 text-xl font-bold text-emerald-700">{money(profit)}</p>
            </div>
          </div>
          <div className="mb-4">
            <ChangeCalculator total={total} />
          </div>
          <Button className="w-full min-h-12" type="submit" disabled={selectedRemaining < 1 || quantity > selectedRemaining || unitPrice < 0}>
            <Icon name="plus" className="size-4" /> {t("sales.confirmSale")}
          </Button>
        </form>

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
      </div>
    </>
  );
}
