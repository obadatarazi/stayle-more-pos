import Button from "@/components/Button";
import Icon from "@/components/Icon";
import SalesList from "@/components/SalesList";
import { useI18n } from "@/i18n/useI18n";
import { money } from "@/lib/format";
import type { IconName, Product, Sale } from "@/types/store";

export default function DashboardPage({
  metrics,
  sales,
  soldBySku,
  onNewSale,
  onAddProduct,
  onProducts,
  onSales,
  onExpenses,
  onReports,
  onSale,
  onDeleteSale,
  products,
  onExport,
  onImport,
}: {
  metrics: { revenue: number; grossProfit: number; fixedExpenses: number; netProfit: number };
  sales: Sale[];
  soldBySku: Record<string, number>;
  onNewSale: () => void;
  onAddProduct: () => void;
  onProducts: () => void;
  onSales: () => void;
  onExpenses: () => void;
  onReports: () => void;
  onSale: (sku: string) => void;
  onDeleteSale: (id: number) => void;
  products: Product[];
  onExport: () => void;
  onImport: () => void;
}) {
  const { t } = useI18n();

  const lowStock = products
    .map((product) => ({ ...product, remaining: product.initialStock - (soldBySku[product.sku] || 0) }))
    .filter((product) => product.remaining <= product.reorderLevel);

  const quickProducts = products
    .map((product) => ({ ...product, remaining: product.initialStock - (soldBySku[product.sku] || 0) }))
    .filter((product) => product.quickSale && product.remaining > 0);

  const shortcuts = [
    { label: t("dashboard.shortcutNewSale"), hint: t("dashboard.shortcutNewSaleHint"), icon: "plus" as IconName, onClick: onNewSale, primary: true },
    { label: t("dashboard.shortcutNewProduct"), hint: t("dashboard.shortcutNewProductHint"), icon: "box" as IconName, onClick: onAddProduct, primary: false },
    { label: t("dashboard.shortcutReports"), hint: t("dashboard.shortcutReportsHint"), icon: "chart" as IconName, onClick: onReports, primary: false },
    { label: t("dashboard.shortcutExpense"), hint: t("dashboard.shortcutExpenseHint"), icon: "wallet" as IconName, onClick: onExpenses, primary: false },
  ];

  const metricCards = [
    { label: t("dashboard.metricSales"), value: metrics.revenue, tone: "blue" as const, icon: "wallet" as IconName },
    { label: t("dashboard.metricGross"), value: metrics.grossProfit, tone: "indigo" as const, icon: "profit" as IconName },
    { label: t("dashboard.metricExpenses"), value: metrics.fixedExpenses, tone: "orange" as const, icon: "receipt" as IconName },
    { label: t("dashboard.metricNet"), value: metrics.netProfit, tone: "green" as const, icon: "arrowUp" as IconName },
  ];

  return (
    <>
      <div className="mb-4 md:mb-6">
        <p className="text-xs font-semibold text-navy">{t("dashboard.welcome")}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">{t("dashboard.ask")}</h1>
      </div>

      <button
        onClick={onNewSale}
        className="mb-4 flex w-full items-center gap-4 rounded-3xl bg-navy p-4 text-right text-white shadow-xl shadow-navy/25 active:scale-[0.99] md:mb-5 md:p-5"
      >
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white/15">
          <Icon name="plus" className="size-8" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-bold md:text-xl">{t("dashboard.addSale")}</span>
          <span className="mt-1 block text-sm text-brand">{t("dashboard.addSaleHint")}</span>
        </span>
        <Icon name="chevron" className="size-6 rotate-180 opacity-70" />
      </button>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {shortcuts.map((item) => (
          <button
            key={item.label}
            onClick={item.onClick}
            className={`rounded-2xl border p-4 text-right active:scale-[0.98] ${item.primary ? "border-navy bg-navy text-white" : "border-coral-border bg-white text-slate-800"}`}
          >
            <span className={`grid size-11 place-items-center rounded-xl ${item.primary ? "bg-white/15 text-white" : "bg-brand text-navy"}`}>
              <Icon name={item.icon} />
            </span>
            <span className="mt-3 block text-sm font-bold">{item.label}</span>
            <span className={`mt-1 block text-xs ${item.primary ? "text-brand" : "text-slate-400"}`}>{item.hint}</span>
          </button>
        ))}
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4 md:mt-5 md:gap-4">
        {metricCards.map((card) => (
          <div key={card.label} className={`metric-card rounded-2xl border p-3.5 md:p-4 ${card.tone === "green" ? "border-emerald-200 bg-emerald-50/80" : "border-slate-200 bg-white"}`}>
            <div className="flex items-center gap-2">
              <span className={`grid size-9 place-items-center rounded-xl icon-${card.tone}`}>
                <Icon name={card.icon} className="size-4" />
              </span>
              <p className="text-xs font-semibold text-slate-500">{card.label}</p>
            </div>
            <p className="mt-2 text-lg font-bold tracking-tight text-slate-950 md:text-xl">{money(card.value)}</p>
          </div>
        ))}
      </section>

      <section className="mt-4 rounded-2xl border border-coral-border bg-white p-4 md:mt-5 md:p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900">{t("dashboard.quickTitle")}</h2>
            <p className="mt-1 text-xs text-slate-500">{t("dashboard.quickHint")}</p>
          </div>
          <button onClick={onProducts} className="min-h-10 shrink-0 rounded-xl px-3 text-xs font-bold text-navy">
            {t("dashboard.allProducts")}
          </button>
        </div>
        {quickProducts.length ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {quickProducts.map((product) => (
              <button
                key={product.sku}
                onClick={() => onSale(product.sku)}
                className="rounded-2xl border border-slate-200 bg-brand/40 p-3 text-right active:scale-[0.98] active:border-navy"
              >
                <p className="truncate text-sm font-bold text-slate-900">{product.nameAr}</p>
                <p className="mt-1 text-[11px] text-slate-500">{product.category}</p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-navy">{money(product.price)}</span>
                  <span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-slate-600">
                    {t("common.remaining", { count: product.remaining })}
                  </span>
                </div>
                <span className="mt-2 flex items-center justify-center gap-1 rounded-xl bg-navy py-2 text-xs font-bold text-white">
                  <Icon name="plus" className="size-3.5" /> {t("common.sell")}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-brand/50 px-4 py-8 text-center">
            <p className="text-sm font-semibold text-slate-700">{t("dashboard.quickEmpty")}</p>
            <p className="mt-1 text-xs text-slate-500">{t("dashboard.quickEmptyHint")}</p>
            <Button className="mt-3" onClick={onProducts}>
              <Icon name="box" className="size-4" /> {t("dashboard.manageProducts")}
            </Button>
          </div>
        )}
      </section>

      <section className="mt-4 grid gap-3 sm:grid-cols-2 md:mt-5 md:gap-4">
        <button onClick={onAddProduct} className="flex items-center gap-3 rounded-2xl border border-dashed border-navy/30 bg-brand/50 p-4 text-right active:scale-[0.99]">
          <span className="grid size-12 place-items-center rounded-2xl bg-navy text-white">
            <Icon name="box" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-slate-900">{t("dashboard.addProduct")}</span>
            <span className="mt-1 block text-xs text-slate-500">{t("dashboard.addProductHint")}</span>
          </span>
          <Icon name="chevron" className="size-5 rotate-180 text-navy" />
        </button>
        <button onClick={onExpenses} className="flex items-center gap-3 rounded-2xl border border-dashed border-navy/30 bg-white p-4 text-right active:scale-[0.99]">
          <span className="grid size-12 place-items-center rounded-2xl bg-brand text-navy">
            <Icon name="wallet" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-slate-900">{t("dashboard.addExpense")}</span>
            <span className="mt-1 block text-xs text-slate-500">{t("dashboard.addExpenseHint")}</span>
          </span>
          <Icon name="chevron" className="size-5 rotate-180 text-navy" />
        </button>
      </section>

      <div className="mt-4 flex gap-2 md:mt-5">
        <Button variant="secondary" className="flex-1" onClick={onExport}>
          <Icon name="receipt" className="size-4" /> {t("dashboard.downloadExcel")}
        </Button>
        <Button variant="secondary" className="flex-1" onClick={onImport}>
          <Icon name="box" className="size-4" /> {t("dashboard.importExcel")}
        </Button>
      </div>

      {lowStock.length > 0 && (
        <section className="mt-4 rounded-2xl border border-coral-border bg-coral-soft p-4 md:mt-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-coral-dark">{t("dashboard.lowStockTitle")}</h2>
              <p className="mt-1 text-xs text-coral-dark/80">{t("dashboard.lowStockHint")}</p>
            </div>
            <button onClick={onProducts} className="min-h-10 px-2 text-xs font-bold text-coral-dark">
              {t("dashboard.view")}
            </button>
          </div>
          <div className="space-y-2">
            {lowStock.slice(0, 4).map((product) => (
              <button
                key={product.sku}
                onClick={() => onSale(product.sku)}
                disabled={product.remaining < 1}
                className="flex w-full items-center gap-3 rounded-xl bg-white p-3 text-right active:scale-[0.99] disabled:cursor-not-allowed"
              >
                <span className="grid size-10 place-items-center rounded-lg bg-coral-pale text-coral-dark">
                  <Icon name="warning" className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-slate-800">{product.nameAr}</span>
                  <span className="block text-xs text-slate-500">{t("common.remaining", { count: product.remaining })}</span>
                </span>
                <span className={`rounded-xl px-3 py-2 text-xs font-bold ${product.remaining < 1 ? "bg-coral-pale text-coral-dark" : "bg-navy text-white"}`}>
                  {product.remaining < 1 ? t("common.outOfStock") : t("common.sell")}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="mt-4 rounded-2xl border border-slate-200 bg-white md:mt-5">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5 md:px-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">{t("dashboard.recentSales")}</h2>
            <p className="mt-1 text-xs text-slate-500">{t("dashboard.recentSalesHint")}</p>
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" className="min-h-10 px-2" onClick={onSales}>
              {t("common.all")}
            </Button>
            <Button className="min-h-10 px-3" onClick={onNewSale}>
              <Icon name="plus" className="size-4" /> {t("common.sell")}
            </Button>
          </div>
        </div>
        <SalesList sales={sales.slice(0, 5)} products={products} onDelete={onDeleteSale} />
      </section>
    </>
  );
}
