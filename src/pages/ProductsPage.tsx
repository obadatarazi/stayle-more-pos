import { useEffect, useMemo, useState } from "react";
import Button from "@/components/Button";
import PriceAdjustModal from "@/components/PriceAdjustModal";
import Icon from "@/components/Icon";
import PageIntro from "@/components/PageIntro";
import { allCategories } from "@/data/demo";
import { useI18n } from "@/i18n/useI18n";
import { money, usd } from "@/lib/format";
import type { Product, ProductSort, StockFilter } from "@/types/store";

export default function ProductsPage({
  products,
  soldBySku,
  onSale,
  onAdd,
  onEdit,
  onToggleQuickSale,
  onBulkUpdate,
  usdRate,
  initialSearch = "",
}: {
  products: Product[];
  soldBySku: Record<string, number>;
  onSale: (sku: string) => void;
  onAdd: () => void;
  onEdit: (product: Product) => void;
  onToggleQuickSale: (sku: string) => void;
  onBulkUpdate: (updated: Product[]) => void;
  usdRate: number;
  initialSearch?: string;
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState(initialSearch);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [sortBy, setSortBy] = useState<ProductSort>("newest");
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [priceModalOpen, setPriceModalOpen] = useState(false);
  const categories = useMemo(() => allCategories(products), [products]);
  const productIndex = useMemo(
    () => new Map(products.map((product, index) => [product.sku, index])),
    [products],
  );

  const stockFilterOptions = useMemo(
    (): { id: StockFilter; label: string; hint: string }[] => [
      { id: "all", label: t("products.stock.all"), hint: t("products.stock.allHint") },
      { id: "available", label: t("products.stock.available"), hint: t("products.stock.availableHint") },
      { id: "low", label: t("products.stock.low"), hint: t("products.stock.lowHint") },
      { id: "out", label: t("products.stock.out"), hint: t("products.stock.outHint") },
      { id: "quick", label: t("products.stock.quick"), hint: t("products.stock.quickHint") },
    ],
    [t],
  );

  const productSortOptions = useMemo(
    (): { id: ProductSort; label: string; hint: string }[] => [
      { id: "newest", label: t("products.sort.newest"), hint: t("products.sort.newestHint") },
      { id: "oldest", label: t("products.sort.oldest"), hint: t("products.sort.oldestHint") },
      { id: "name", label: t("products.sort.name"), hint: t("products.sort.nameHint") },
      { id: "priceHigh", label: t("products.sort.priceHigh"), hint: t("products.sort.priceHighHint") },
      { id: "priceLow", label: t("products.sort.priceLow"), hint: t("products.sort.priceLowHint") },
      { id: "stockLow", label: t("products.sort.stockLow"), hint: t("products.sort.stockLowHint") },
    ],
    [t],
  );

  const tableHeaders = useMemo(
    () => [
      t("export.itemName"),
      t("export.costUsdCol"),
      t("export.cost"),
      t("export.price"),
      t("export.unitProfit"),
      t("export.initialStock"),
      t("export.soldQty"),
      t("export.currentStock"),
      t("export.status"),
      t("export.quickSale"),
      t("products.actions"),
    ],
    [t],
  );

  useEffect(() => {
    setQuery(initialSearch);
  }, [initialSearch]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = products.filter((product) => {
      if (categoryFilter !== "all" && product.category !== categoryFilter) return false;
      if (
        q &&
        ![product.nameAr, product.name, product.category, product.sku]
          .join(" ")
          .toLowerCase()
          .includes(q)
      ) {
        return false;
      }
      const remaining = product.initialStock - (soldBySku[product.sku] || 0);
      if (stockFilter === "available" && remaining < 1) return false;
      if (stockFilter === "low" && remaining > product.reorderLevel) return false;
      if (stockFilter === "out" && remaining > 0) return false;
      if (stockFilter === "quick" && !product.quickSale) return false;
      return true;
    });

    const remainingOf = (product: Product) => product.initialStock - (soldBySku[product.sku] || 0);
    const indexOf = (sku: string) => productIndex.get(sku) ?? 0;

    return [...list].sort((a, b) => {
      if (sortBy === "newest") return indexOf(b.sku) - indexOf(a.sku);
      if (sortBy === "oldest") return indexOf(a.sku) - indexOf(b.sku);
      if (sortBy === "name") return a.nameAr.localeCompare(b.nameAr, "ar");
      if (sortBy === "priceHigh") return b.price - a.price;
      if (sortBy === "priceLow") return a.price - b.price;
      return remainingOf(a) - remainingOf(b);
    });
  }, [products, query, categoryFilter, stockFilter, sortBy, soldBySku, productIndex]);

  const activeFilterCount =
    (categoryFilter !== "all" ? 1 : 0) +
    (stockFilter !== "all" ? 1 : 0) +
    (sortBy !== "newest" ? 1 : 0);

  const stockFilterLabel = stockFilterOptions.find((item) => item.id === stockFilter)?.label || t("products.stock.all");
  const sortLabel = productSortOptions.find((item) => item.id === sortBy)?.label || t("products.sort.newest");

  const resetFilters = () => {
    setCategoryFilter("all");
    setStockFilter("all");
    setSortBy("newest");
  };

  const allShownSelected = filtered.length > 0 && filtered.every((product) => selected.has(product.sku));

  const toggleSelected = (sku: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(sku)) next.delete(sku);
      else next.add(sku);
      return next;
    });
  };

  const toggleAllShown = () => {
    setSelected((current) => {
      const next = new Set(current);
      for (const product of filtered) {
        if (allShownSelected) next.delete(product.sku);
        else next.add(product.sku);
      }
      return next;
    });
  };

  return (
    <>
      <PageIntro
        eyebrow={t("products.eyebrow")}
        title={t("products.title")}
        description={t("products.description")}
        action={
          <>
            <Button className="flex-1 sm:flex-none" onClick={onAdd}><Icon name="plus" className="size-4" /> {t("products.add")}</Button>
            <Button className="flex-1 sm:flex-none" variant="secondary" onClick={() => setPriceModalOpen(true)}><Icon name="edit" className="size-4" /> {t("products.adjustPrices")}</Button>
            <Button className="flex-1 sm:flex-none" variant="secondary" onClick={() => products[0] && onSale(products[0].sku)}>{t("common.sell")}</Button>
          </>
        }
      />
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-3 md:flex-row md:flex-wrap md:items-center md:justify-between md:p-4">
          <div className="relative w-full md:w-auto">
            <Icon name="search" className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-3 pr-10 text-base outline-none focus:border-navy focus:bg-white focus:ring-4 focus:ring-[#fddfe0] md:w-72 md:py-2.5 md:text-sm"
              placeholder={t("products.searchPlaceholder")}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="hidden gap-2 md:flex md:flex-wrap">
            <select
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-navy focus:bg-white"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              aria-label={t("products.filterCategory")}
            >
              <option value="all">{t("products.allCategories")}</option>
              {categories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
            <select
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-navy focus:bg-white"
              value={stockFilter}
              onChange={(event) => setStockFilter(event.target.value as StockFilter)}
              aria-label={t("products.filterStatus")}
            >
              {stockFilterOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
            <select
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-navy focus:bg-white"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as ProductSort)}
              aria-label={t("products.sortProducts")}
            >
              {productSortOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => setFilterSheetOpen(true)}
            className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-right md:hidden"
          >
            <span className="flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-lg bg-white text-navy shadow-sm">
                <Icon name="filter" className="size-4" />
              </span>
              <span>
                <span className="block text-sm font-bold text-slate-800">{t("products.filterSort")}</span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  {stockFilterLabel} · {sortLabel}
                  {categoryFilter !== "all" ? ` · ${categoryFilter}` : ""}
                </span>
              </span>
            </span>
            {activeFilterCount > 0 ? (
              <span className="grid size-7 place-items-center rounded-full bg-navy text-xs font-bold text-white">{activeFilterCount}</span>
            ) : (
              <Icon name="chevron" className="size-5 rotate-180 text-slate-400" />
            )}
          </button>
          <div className="flex items-center justify-between gap-3 md:mr-auto">
            <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-slate-600">
              <input type="checkbox" className="size-4 accent-navy" checked={allShownSelected} onChange={toggleAllShown} disabled={!filtered.length} />
              {t("products.selectVisible")}
            </label>
            <p className="text-sm text-slate-500">
              <strong className="text-slate-800">{filtered.length}</strong> {t("products.itemsLabel")}
            </p>
          </div>
        </div>
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-brand/40 px-3 py-2.5 md:px-4">
            {categoryFilter !== "all" && (
              <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-navy">{categoryFilter}</span>
            )}
            {stockFilter !== "all" && (
              <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-navy">{stockFilterLabel}</span>
            )}
            {sortBy !== "newest" && (
              <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-navy">{sortLabel}</span>
            )}
            <button type="button" onClick={resetFilters} className="mr-auto text-xs font-bold text-navy underline-offset-2 hover:underline">
              {t("products.clearAll")}
            </button>
          </div>
        )}

        {selected.size > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-coral-border bg-coral-soft px-3 py-2.5 md:px-4">
            <p className="text-sm font-semibold text-navy">{t("products.selectedCount", { count: selected.size })}</p>
            <div className="flex gap-2">
              <Button variant="ghost" className="min-h-10 px-3 text-xs" onClick={() => setSelected(new Set())}>{t("products.clearSelection")}</Button>
              <Button className="min-h-10 px-3 text-xs" onClick={() => setPriceModalOpen(true)}>{t("products.adjustSelectedPrices")}</Button>
            </div>
          </div>
        )}

        <div className="space-y-3 p-3 md:hidden">
          {filtered.length ? filtered.map((product) => {
            const sold = soldBySku[product.sku] || 0;
            const remaining = product.initialStock - sold;
            const needsReorder = remaining <= product.reorderLevel;
            return (
              <div key={product.sku} className={`rounded-2xl border p-3.5 ${needsReorder ? "border-coral-border bg-coral-soft" : "border-slate-200 bg-white"}`}>
                <div className="flex items-start justify-between gap-3">
                  <label className="flex min-w-0 cursor-pointer items-start gap-2.5">
                    <input
                      type="checkbox"
                      className="mt-0.5 size-5 shrink-0 accent-navy"
                      checked={selected.has(product.sku)}
                      onChange={() => toggleSelected(product.sku)}
                      aria-label={t("products.selectItem", { name: product.nameAr })}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-slate-900">{product.nameAr}</span>
                      <span className="mt-1 block text-xs text-slate-500">{product.category}</span>
                    </span>
                  </label>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${needsReorder ? "bg-coral-pale text-coral-dark" : "bg-emerald-100 text-emerald-700"}`}>
                      {needsReorder ? t("products.reorderBadge") : t("common.available")}
                    </span>
                    {product.quickSale && (
                      <span className="rounded-full bg-navy px-2.5 py-1 text-[11px] font-bold text-white">{t("common.quickSale")}</span>
                    )}
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-slate-50 p-2">
                    <p className="text-[10px] text-slate-400">{t("export.price")}</p>
                    <p className="text-sm font-bold text-slate-800">{money(product.price)}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-2">
                    <p className="text-[10px] text-slate-400">{t("products.remainingLabel")}</p>
                    <p className={`text-sm font-bold ${needsReorder ? "text-coral-dark" : "text-slate-800"}`}>{remaining}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-2">
                    <p className="text-[10px] text-slate-400">{t("sales.profit")}</p>
                    <p className="text-sm font-bold text-emerald-700">{money(product.price - product.cost)}</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <Button
                    variant={product.quickSale ? "primary" : "secondary"}
                    className="min-h-12 px-2 text-xs"
                    onClick={() => onToggleQuickSale(product.sku)}
                  >
                    {product.quickSale ? t("products.quickActive") : t("common.quickSale")}
                  </Button>
                  <Button variant="secondary" className="min-h-12" onClick={() => onEdit(product)}><Icon name="edit" className="size-4" /> {t("common.edit")}</Button>
                  <Button className="min-h-12" onClick={() => onSale(product.sku)} disabled={remaining < 1}><Icon name="plus" className="size-4" /> {remaining < 1 ? t("common.outOfStock") : t("common.sell")}</Button>
                </div>
              </div>
            );
          }) : (
            <p className="py-10 text-center text-sm text-slate-500">{t("products.noMatch")}</p>
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[1140px] text-left">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="w-10 px-4 py-3.5">
                  <input type="checkbox" className="size-4 accent-navy" checked={allShownSelected} onChange={toggleAllShown} disabled={!filtered.length} aria-label={t("products.selectAll")} />
                </th>
                {tableHeaders.map((header) => (
                  <th key={header} className="px-4 py-3.5">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length ? filtered.map((product) => {
                const sold = soldBySku[product.sku] || 0;
                const remaining = product.initialStock - sold;
                const needsReorder = remaining <= product.reorderLevel;
                return (
                  <tr key={product.sku} className={`${needsReorder ? "bg-coral-soft/60" : "hover:bg-slate-50/70"} transition`}>
                    <td className="px-4 py-4">
                      <input type="checkbox" className="size-4 accent-navy" checked={selected.has(product.sku)} onChange={() => toggleSelected(product.sku)} aria-label={t("products.selectItem", { name: product.nameAr })} />
                    </td>
                    <td className="px-4 py-4">
                      <button onClick={() => onSale(product.sku)} className="text-right">
                        <p className="whitespace-nowrap text-sm font-bold text-slate-800 hover:text-navy">{product.nameAr}</p>
                        <p className="mt-1 text-xs text-slate-400">{product.category}</p>
                      </button>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600" dir="ltr">{product.costUsd > 0 ? usd(product.costUsd) : "—"}</td>
                    <td className="px-4 py-4 text-sm text-slate-600">{money(product.cost)}</td>
                    <td className="px-4 py-4 text-sm font-semibold text-slate-800">{money(product.price)}</td>
                    <td className="px-4 py-4 text-sm font-bold text-emerald-700">{money(product.price - product.cost)}</td>
                    <td className="px-4 py-4 text-sm text-slate-600">{product.initialStock}</td>
                    <td className="px-4 py-4 text-sm text-slate-600">{sold}</td>
                    <td className={`px-4 py-4 text-sm font-bold ${needsReorder ? "text-coral-dark" : "text-slate-800"}`}>{remaining}</td>
                    <td className="px-4 py-4">
                      {needsReorder ? (
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-coral-pale px-3 py-1.5 text-xs font-bold text-coral-dark"><Icon name="warning" className="size-3.5" /> {t("export.needsReorder")}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-700"><span className="size-1.5 rounded-full bg-emerald-500" /> {t("export.inStock")}</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <button
                        type="button"
                        onClick={() => onToggleQuickSale(product.sku)}
                        className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                          product.quickSale
                            ? "bg-navy text-white"
                            : "border border-slate-200 bg-white text-slate-600 hover:border-navy hover:text-navy"
                        }`}
                        title={product.quickSale ? t("products.removeQuickSale") : t("products.addQuickSale")}
                      >
                        <Icon name="sparkles" className="size-3.5" />
                        {product.quickSale ? t("products.quickEnabled") : t("products.quickEnable")}
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1">
                        <button className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50" onClick={() => onEdit(product)} aria-label={t("products.editItem", { name: product.nameAr })} title={t("common.edit")}>
                          <Icon name="edit" className="size-4" />
                        </button>
                        <button className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-brand hover:text-navy disabled:cursor-not-allowed disabled:opacity-40" onClick={() => onSale(product.sku)} disabled={remaining < 1} aria-label={t("products.sellItem", { name: product.nameAr })} title={remaining < 1 ? t("products.stockDepleted") : t("common.sell")}>
                          <Icon name="receipt" className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={12} className="px-4 py-12 text-center text-sm text-slate-500">{t("products.noMatchSearch")}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {priceModalOpen && (
        <PriceAdjustModal
          products={products}
          selectedSkus={selected}
          categories={categories}
          defaultCategory={categoryFilter}
          onClose={() => setPriceModalOpen(false)}
          onApply={(updated) => {
            onBulkUpdate(updated);
            setPriceModalOpen(false);
            setSelected(new Set());
          }}
        />
      )}

      <button
        type="button"
        onClick={() => setFilterSheetOpen(true)}
        className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] left-4 z-30 flex items-center gap-2 rounded-full bg-navy px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-navy/35 active:scale-95 md:hidden"
        aria-label={t("products.filterProducts")}
      >
        <Icon name="filter" className="size-5" />
        {t("products.filter")}
        {activeFilterCount > 0 && (
          <span className="grid size-6 place-items-center rounded-full bg-white text-xs font-bold text-navy">
            {activeFilterCount}
          </span>
        )}
      </button>

      {filterSheetOpen && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm md:hidden">
          <button type="button" className="absolute inset-0" onClick={() => setFilterSheetOpen(false)} aria-label={t("common.close")} />
          <div className="sheet-enter relative z-10 flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl safe-bottom">
            <div className="shrink-0 px-5 pt-3 pb-2">
              <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-200" />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{t("products.filterSheetTitle")}</h2>
                  <p className="mt-1 text-sm text-slate-500">{t("products.filterSheetHint")}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFilterSheetOpen(false)}
                  className="grid size-10 place-items-center rounded-xl border border-slate-200 text-slate-500"
                  aria-label={t("common.close")}
                >
                  <Icon name="close" className="size-5" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 pb-4">
              <section>
                <h3 className="mb-2 text-sm font-bold text-slate-800">{t("export.status")}</h3>
                <div className="grid grid-cols-2 gap-2">
                  {stockFilterOptions.map((option) => {
                    const active = stockFilter === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setStockFilter(option.id)}
                        className={`rounded-2xl border p-3 text-right transition ${
                          active ? "border-navy bg-soft-blue text-navy" : "border-slate-200 bg-white text-slate-700"
                        }`}
                      >
                        <span className="block text-sm font-bold">{option.label}</span>
                        <span className={`mt-1 block text-[11px] ${active ? "text-navy/70" : "text-slate-400"}`}>{option.hint}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section>
                <h3 className="mb-2 text-sm font-bold text-slate-800">{t("export.rank")}</h3>
                <div className="grid grid-cols-2 gap-2">
                  {productSortOptions.map((option) => {
                    const active = sortBy === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setSortBy(option.id)}
                        className={`rounded-2xl border p-3 text-right transition ${
                          active ? "border-navy bg-soft-blue text-navy" : "border-slate-200 bg-white text-slate-700"
                        }`}
                      >
                        <span className="block text-sm font-bold">{option.label}</span>
                        <span className={`mt-1 block text-[11px] ${active ? "text-navy/70" : "text-slate-400"}`}>{option.hint}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section>
                <h3 className="mb-2 text-sm font-bold text-slate-800">{t("export.category")}</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setCategoryFilter("all")}
                    className={`rounded-full px-3.5 py-2.5 text-sm font-bold ${
                      categoryFilter === "all" ? "bg-navy text-white" : "border border-slate-200 bg-white text-slate-600"
                    }`}
                  >
                    {t("common.all")}
                  </button>
                  {categories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setCategoryFilter(category)}
                      className={`rounded-full px-3.5 py-2.5 text-sm font-bold ${
                        categoryFilter === category ? "bg-navy text-white" : "border border-slate-200 bg-white text-slate-600"
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </section>
            </div>

            <div className="shrink-0 grid grid-cols-2 gap-2 border-t border-slate-100 bg-white p-4">
              <Button type="button" variant="secondary" className="min-h-12" onClick={resetFilters}>
                {t("products.clearAll")}
              </Button>
              <Button type="button" className="min-h-12" onClick={() => setFilterSheetOpen(false)}>
                <Icon name="check" className="size-4" /> {t("products.showResults", { count: filtered.length })}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
