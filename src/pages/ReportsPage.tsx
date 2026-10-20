import { useMemo, useState } from "react";
import Button from "@/components/Button";
import FieldLabel, { inputClass } from "@/components/FieldLabel";
import Icon from "@/components/Icon";
import PageIntro from "@/components/PageIntro";
import { useI18n } from "@/i18n/useI18n";
import {
  currentMonthKey,
  formatMonthLabel,
  isRentExpense,
  isStockPurchase,
  money,
  monthKey,
  saleCost,
  salePrice,
  usd,
} from "@/lib/format";
import { accounts } from "@/data/demo";
import type { Expense, Product, Sale } from "@/types/store";

export default function ReportsPage({
  month,
  setMonth,
  sales,
  expenses,
  products,
  defaultUsdRate,
  onExport,
}: {
  month: string;
  setMonth: (month: string) => void;
  sales: Sale[];
  expenses: Expense[];
  products: Product[];
  defaultUsdRate: number;
  onExport: (usdRate?: number) => void;
}) {
  const { t } = useI18n();
  const [rateInput, setRateInput] = useState(defaultUsdRate ? String(defaultUsdRate) : "");
  const [usdView, setUsdView] = useState<number | null>(null);
  const fmt = (amount: number) => (usdView ? usd(amount / usdView) : money(amount));
  const parsedRate = Number(rateInput);

  const availableMonths = useMemo(() => {
    const keys = new Set<string>();
    sales.forEach((sale) => {
      const key = monthKey(sale.date);
      if (key.length === 7) keys.add(key);
    });
    expenses.forEach((expense) => {
      const key = monthKey(expense.dueDate);
      if (key.length === 7) keys.add(key);
    });
    keys.add(currentMonthKey());
    keys.add(month);
    return [...keys].sort((a, b) => b.localeCompare(a));
  }, [sales, expenses, month]);

  const monthSales = useMemo(
    () => sales.filter((sale) => monthKey(sale.date) === month),
    [sales, month],
  );
  const monthExpenses = useMemo(
    () => expenses.filter((expense) => monthKey(expense.dueDate) === month),
    [expenses, month],
  );

  const revenue = monthSales.reduce((sum, sale) => {
    const product = products.find((item) => item.sku === sale.sku);
    return sum + salePrice(sale, product) * sale.quantity;
  }, 0);
  const grossProfit = monthSales.reduce((sum, sale) => {
    const product = products.find((item) => item.sku === sale.sku);
    return sum + (salePrice(sale, product) - saleCost(sale, product)) * sale.quantity;
  }, 0);
  const expenseTotal = monthExpenses
    .filter((expense) => !isStockPurchase(expense))
    .reduce((sum, expense) => sum + expense.amount, 0);
  const stockTotal = monthExpenses.filter(isStockPurchase).reduce((sum, expense) => sum + expense.amount, 0);
  const rentTotal = monthExpenses.filter(isRentExpense).reduce((sum, expense) => sum + expense.amount, 0);
  const netProfit = grossProfit - expenseTotal;
  const pieces = monthSales.reduce((sum, sale) => sum + sale.quantity, 0);

  const sellerRanking = useMemo(() => {
    return accounts
      .map((account) => {
        const userSales = monthSales.filter((sale) => sale.soldBy === account.username);
        const userRevenue = userSales.reduce((sum, sale) => {
          const product = products.find((item) => item.sku === sale.sku);
          return sum + salePrice(sale, product) * sale.quantity;
        }, 0);
        const userProfit = userSales.reduce((sum, sale) => {
          const product = products.find((item) => item.sku === sale.sku);
          return sum + (salePrice(sale, product) - saleCost(sale, product)) * sale.quantity;
        }, 0);
        const qty = userSales.reduce((sum, sale) => sum + sale.quantity, 0);
        return {
          username: account.username,
          displayName: account.displayName,
          shortName: account.shortName,
          count: userSales.length,
          qty,
          revenue: userRevenue,
          profit: userProfit,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
  }, [monthSales, products]);

  const topSeller = sellerRanking.find((row) => row.revenue > 0) || sellerRanking[0];

  const topProducts = useMemo(() => {
    const map = new Map<string, { sku: string; nameAr: string; category: string; qty: number; revenue: number; profit: number }>();
    for (const sale of monthSales) {
      const product = products.find((item) => item.sku === sale.sku);
      const price = salePrice(sale, product);
      const current = map.get(sale.sku) || {
        sku: sale.sku,
        nameAr: product?.nameAr || sale.sku,
        category: product?.category || t("common.other"),
        qty: 0,
        revenue: 0,
        profit: 0,
      };
      current.qty += sale.quantity;
      current.revenue += price * sale.quantity;
      current.profit += (price - saleCost(sale, product)) * sale.quantity;
      map.set(sale.sku, current);
    }
    return [...map.values()].sort((a, b) => b.qty - a.qty || b.revenue - a.revenue).slice(0, 8);
  }, [monthSales, products, t]);

  const expenseBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    for (const expense of monthExpenses) {
      const label = expense.categoryAr || expense.category;
      map.set(label, (map.get(label) || 0) + expense.amount);
    }
    return [...map.entries()]
      .map(([label, amount]) => ({
        label,
        amount,
        isRent: /إيجار|ايجار|rent/i.test(label),
        isStock: isStockPurchase({ category: label, categoryAr: label }),
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [monthExpenses]);

  const maxProductQty = topProducts[0]?.qty || 1;
  const maxExpense = expenseBreakdown[0]?.amount || 1;
  const maxSellerRevenue = Math.max(...sellerRanking.map((row) => row.revenue), 1);

  const expenseCardHint =
    stockTotal > 0
      ? t("reports.expensesHintWithStock", {
          rent: fmt(rentTotal),
          stock: fmt(stockTotal),
        })
      : t("reports.rentLine", { amount: fmt(rentTotal) });

  const metricCards = [
    {
      key: "monthSales",
      label: t("reports.monthSales"),
      value: fmt(revenue),
      hint: t("quickSale.pieceCount", { count: pieces }),
      tone: "navy" as const,
    },
    {
      key: "grossProfit",
      label: t("reports.grossProfit"),
      value: fmt(grossProfit),
      hint: t("sales.opsCount", { count: monthSales.length }),
      tone: "blue" as const,
    },
    {
      key: "expenses",
      label: t("reports.expenses"),
      value: fmt(expenseTotal),
      hint: expenseCardHint,
      tone: "orange" as const,
    },
    {
      key: "netProfit",
      label: t("reports.netProfit"),
      value: fmt(netProfit),
      hint: netProfit >= 0 ? t("reports.positive") : t("reports.negative"),
      tone: "green" as const,
    },
  ];

  return (
    <>
      <PageIntro
        eyebrow={t("reports.eyebrow")}
        title={t("reports.title")}
        description={t("reports.description")}
        action={
          <Button className="w-full sm:w-auto" variant="secondary" onClick={() => onExport(usdView ?? undefined)}>
            <Icon name="receipt" className="size-4" /> {usdView ? t("reports.exportUsd") : t("reports.exportMonth")}
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-coral-border bg-white p-4 md:mb-5 md:flex-row md:items-end md:justify-between md:p-5">
        <div>
          <h2 className="text-base font-bold text-slate-900">{formatMonthLabel(month)}</h2>
          <p className="mt-1 text-xs text-slate-500">{t("reports.pickMonth")}</p>
        </div>
        <label className="w-full md:w-72">
          <FieldLabel>{t("export.month")}</FieldLabel>
          <select className={inputClass} value={month} onChange={(event) => setMonth(event.target.value)}>
            {availableMonths.map((item) => (
              <option key={item} value={item}>{formatMonthLabel(item)}</option>
            ))}
          </select>
        </label>
      </div>

      <form
        className={`mb-4 flex flex-col gap-3 rounded-2xl border p-4 md:mb-5 md:flex-row md:items-end md:justify-between md:p-5 ${usdView ? "border-emerald-200 bg-emerald-50/70" : "border-slate-200 bg-white"}`}
        onSubmit={(event) => {
          event.preventDefault();
          if (parsedRate > 0) setUsdView(parsedRate);
        }}
      >
        <div className="min-w-0">
          <h2 className="text-base font-bold text-slate-900">{t("reports.usdViewTitle")}</h2>
          <p className="mt-1 text-xs text-slate-500">
            {usdView ? t("reports.usdViewActive", { rate: usdView }) : t("reports.usdViewHint")}
          </p>
        </div>
        <div className="flex w-full items-end gap-2 md:w-auto">
          <label className="min-w-0 flex-1 md:w-44 md:flex-none">
            <FieldLabel>{t("settings.usdRate")}</FieldLabel>
            <input
              type="number"
              min="0"
              step="0.01"
              dir="ltr"
              inputMode="decimal"
              className={inputClass}
              value={rateInput}
              onChange={(event) => setRateInput(event.target.value)}
              placeholder={t("reports.ratePlaceholder")}
            />
          </label>
          <Button type="submit" className="min-h-12" disabled={!(parsedRate > 0) || parsedRate === usdView}>
            {usdView ? t("reports.updateRate") : t("reports.showUsd")}
          </Button>
          {usdView && (
            <Button type="button" variant="secondary" className="min-h-12" onClick={() => setUsdView(null)}>
              <Icon name="close" className="size-4" /> {t("reports.backToSyp")}
            </Button>
          )}
        </div>
      </form>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4 md:gap-4">
        {metricCards.map((card) => (
          <div key={card.key} className={`min-w-0 rounded-2xl border p-3 md:p-4 ${card.tone === "green" ? "border-emerald-200 bg-emerald-50/80" : card.tone === "orange" ? "border-coral-border bg-coral-soft/50" : "border-slate-200 bg-white"}`}>
            <p className="text-[11px] font-semibold text-slate-500 sm:text-xs">{card.label}</p>
            <p className="mt-2 break-words text-base font-bold tabular-nums text-slate-950 sm:text-lg md:text-xl">{card.value}</p>
            <p className="mt-1 truncate text-[11px] text-slate-400">{card.hint}</p>
          </div>
        ))}
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-2 md:mt-5">
        <div className="rounded-2xl border border-navy/15 bg-navy p-4 text-white md:p-5">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-white/15">
              <Icon name="user" className="size-6" />
            </span>
            <div>
              <p className="text-xs font-semibold text-brand">{t("reports.topSellerBadge")}</p>
              <h3 className="mt-1 text-xl font-bold">{topSeller?.displayName || t("reports.noData")}</h3>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-1.5 sm:gap-2">
            <div className="min-w-0 rounded-xl bg-white/10 p-2 sm:p-3">
              <p className="text-[10px] text-brand">{t("sales.revenue")}</p>
              <p className="mt-1 truncate text-xs font-bold tabular-nums sm:text-sm">{fmt(topSeller?.revenue || 0)}</p>
            </div>
            <div className="min-w-0 rounded-xl bg-white/10 p-2 sm:p-3">
              <p className="text-[10px] text-brand">{t("sales.pieces")}</p>
              <p className="mt-1 truncate text-xs font-bold tabular-nums sm:text-sm">{topSeller?.qty || 0}</p>
            </div>
            <div className="min-w-0 rounded-xl bg-white/10 p-2 sm:p-3">
              <p className="text-[10px] text-brand">{t("sales.profit")}</p>
              <p className="mt-1 truncate text-xs font-bold tabular-nums sm:text-sm">{fmt(topSeller?.profit || 0)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-coral-border bg-brand/40 p-4 md:p-5">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-2xl bg-navy text-white">
              <Icon name="wallet" className="size-6" />
            </span>
            <div>
              <p className="text-xs font-semibold text-slate-500">{t("reports.rentThisMonth")}</p>
              <h3 className="mt-1 text-xl font-bold text-slate-950">{fmt(rentTotal)}</h3>
              <p className="mt-1 text-xs text-slate-500">
                {rentTotal > 0
                  ? t("reports.rentShare", { percent: ((rentTotal / Math.max(expenseTotal, 1)) * 100).toFixed(0) })
                  : t("reports.noRentLogged")}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 md:mt-5 md:p-5">
        <div className="mb-4 flex min-w-0 items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-slate-900">{t("reports.topProductsTitle")}</h2>
            <p className="mt-1 text-xs text-slate-500">{t("reports.topProductsHint")}</p>
          </div>
          {topProducts[0] && (
            <span className="max-w-[45%] shrink-0 truncate rounded-full bg-navy px-2.5 py-1.5 text-[10px] font-bold text-white sm:max-w-none sm:px-3 sm:text-[11px]">
              {t("reports.firstPlace", { name: topProducts[0].nameAr })}
            </span>
          )}
        </div>
        {topProducts.length ? (
          <div className="space-y-3">
            {topProducts.map((product, index) => (
              <div key={product.sku} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                <div className="flex items-center gap-3">
                  <span className={`grid size-9 shrink-0 place-items-center rounded-xl text-xs font-bold ${index === 0 ? "bg-navy text-white" : "bg-white text-slate-600"}`}>
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-900">{product.nameAr}</p>
                    <p className="text-[11px] text-slate-500">
                      {product.category} · {t("quickSale.pieceCount", { count: product.qty })}
                    </p>
                  </div>
                  <div className="shrink-0 text-left">
                    <p className="text-sm font-bold tabular-nums text-navy">{fmt(product.revenue)}</p>
                    <p className="text-[11px] font-semibold text-emerald-600">+{fmt(product.profit)}</p>
                  </div>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-navy"
                    style={{ width: `${Math.max(8, (product.qty / maxProductQty) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-slate-500">{t("reports.noSalesThisMonth")}</p>
        )}
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-2 md:mt-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
          <h2 className="text-base font-bold text-slate-900">{t("reports.sellerRankingTitle")}</h2>
          <p className="mt-1 text-xs text-slate-500">{t("reports.sellerRankingHint")}</p>
          <div className="mt-4 space-y-3">
            {sellerRanking.map((seller, index) => (
              <div key={seller.username} className="rounded-2xl border border-slate-100 p-3">
                <div className="flex items-center gap-3">
                  <span className={`grid size-10 place-items-center rounded-xl text-xs font-bold ${index === 0 && seller.revenue > 0 ? "bg-navy text-white" : "bg-brand text-navy"}`}>
                    {seller.shortName}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900">{seller.displayName}</p>
                    <p className="text-[11px] text-slate-500">
                      {t("sales.opsCount", { count: seller.count })} · {t("quickSale.pieceCount", { count: seller.qty })}
                    </p>
                  </div>
                  <p className="text-sm font-bold tabular-nums text-navy">{fmt(seller.revenue)}</p>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-navy/80"
                    style={{ width: `${Math.max(seller.revenue > 0 ? 8 : 0, (seller.revenue / maxSellerRevenue) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
          <h2 className="text-base font-bold text-slate-900">{t("reports.expenseBreakdownTitle")}</h2>
          <p className="mt-1 text-xs text-slate-500">{t("reports.expenseBreakdownHint")}</p>
          {expenseBreakdown.length ? (
            <div className="mt-4 space-y-3">
              {expenseBreakdown.map((item) => (
                <div key={item.label} className={`rounded-2xl border p-3 ${item.isRent ? "border-coral-border bg-coral-soft/60" : "border-slate-100"}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">{item.label}</p>
                      {item.isRent && <p className="text-[11px] font-semibold text-coral-dark">{t("export.rent")}</p>}
                      {item.isStock && <p className="text-[11px] font-semibold text-slate-500">{t("export.stockBuy")}</p>}
                    </div>
                    <p className="shrink-0 text-sm font-bold tabular-nums text-slate-900">{fmt(item.amount)}</p>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
                    <div
                      className={`h-full rounded-full ${item.isRent ? "bg-coral-dark" : "bg-slate-400"}`}
                      style={{ width: `${Math.max(8, (item.amount / maxExpense) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-8 py-4 text-center text-sm text-slate-500">{t("reports.noExpensesThisMonth")}</p>
          )}
        </div>
      </section>
    </>
  );
}
