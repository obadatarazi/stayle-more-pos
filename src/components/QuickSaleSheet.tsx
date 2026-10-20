import { useMemo, useState } from "react";
import Button from "@/components/Button";
import ChangeCalculator from "@/components/ChangeCalculator";
import { inputClass } from "@/components/FieldLabel";
import Icon from "@/components/Icon";
import Stepper from "@/components/Stepper";
import { useI18n } from "@/i18n/useI18n";
import { money } from "@/lib/format";
import type { CartLine, Product } from "@/types/store";

export default function QuickSaleSheet({
  products,
  soldBySku,
  initialSku,
  onClose,
  onCheckout,
}: {
  products: Product[];
  soldBySku: Record<string, number>;
  initialSku?: string;
  onClose: () => void;
  onCheckout: (lines: CartLine[]) => void;
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [draftPrices, setDraftPrices] = useState<Record<string, string>>({});
  const [draftTotals, setDraftTotals] = useState<Record<string, string>>({});
  const [draftCartTotal, setDraftCartTotal] = useState<string | null>(null);
  const [cart, setCart] = useState<CartLine[]>(() => {
    const product = products.find((item) => item.sku === initialSku) || products.find((item) => item.quickSale) || products[0];
    if (!product) return [];
    const remaining = product.initialStock - (soldBySku[product.sku] || 0);
    if (remaining < 1) return [];
    return [{ sku: product.sku, quantity: 1, unitPrice: product.price }];
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? products.filter((product) =>
          [product.nameAr, product.category].join(" ").toLowerCase().includes(q),
        )
      : products.filter((product) => product.quickSale);
    return [...list].sort((a, b) => Number(b.quickSale) - Number(a.quickSale));
  }, [products, query]);

  const cartQtyBySku = useMemo(
    () =>
      cart.reduce<Record<string, number>>((acc, line) => {
        acc[line.sku] = (acc[line.sku] || 0) + line.quantity;
        return acc;
      }, {}),
    [cart],
  );

  const total = cart.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  const itemCount = cart.reduce((sum, line) => sum + line.quantity, 0);

  const addToCart = (sku: string) => {
    const product = products.find((item) => item.sku === sku);
    if (!product) return;
    const remaining = product.initialStock - (soldBySku[sku] || 0);
    const inCart = cartQtyBySku[sku] || 0;
    if (inCart >= remaining) return;

    setCart((current) => {
      const existing = current.find((line) => line.sku === sku);
      if (existing) {
        return current.map((line) =>
          line.sku === sku ? { ...line, quantity: line.quantity + 1 } : line,
        );
      }
      return [...current, { sku, quantity: 1, unitPrice: product.price }];
    });
  };

  const updateLineQty = (sku: string, quantity: number) => {
    const product = products.find((item) => item.sku === sku);
    if (!product) return;
    const max = product.initialStock - (soldBySku[sku] || 0);
    const nextQty = Math.min(max, Math.max(0, quantity));
    setCart((current) => {
      if (nextQty < 1) return current.filter((line) => line.sku !== sku);
      return current.map((line) => (line.sku === sku ? { ...line, quantity: nextQty } : line));
    });
    setDraftTotals((current) => {
      if (!(sku in current)) return current;
      const next = { ...current };
      delete next[sku];
      return next;
    });
    setDraftCartTotal(null);
  };

  const updateLinePrice = (sku: string, unitPrice: number) => {
    setCart((current) =>
      current.map((line) => (line.sku === sku ? { ...line, unitPrice: Math.max(0, unitPrice) } : line)),
    );
    setDraftPrices((current) => {
      if (!(sku in current)) return current;
      const next = { ...current };
      delete next[sku];
      return next;
    });
    setDraftTotals((current) => {
      if (!(sku in current)) return current;
      const next = { ...current };
      delete next[sku];
      return next;
    });
    setDraftCartTotal(null);
  };

  const updateLineTotal = (sku: string, lineTotal: number) => {
    setCart((current) =>
      current.map((line) => {
        if (line.sku !== sku) return line;
        const qty = Math.max(1, line.quantity);
        return { ...line, unitPrice: Math.max(0, Number(lineTotal) / qty) };
      }),
    );
    setDraftPrices((current) => {
      if (!(sku in current)) return current;
      const next = { ...current };
      delete next[sku];
      return next;
    });
    setDraftTotals((current) => {
      if (!(sku in current)) return current;
      const next = { ...current };
      delete next[sku];
      return next;
    });
    setDraftCartTotal(null);
  };

  const updateCartTotal = (nextTotal: number) => {
    setCart((current) => {
      if (!current.length) return current;
      const currentTotal = current.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
      if (currentTotal <= 0) {
        const first = current[0];
        return current.map((line, index) =>
          index === 0
            ? { ...line, unitPrice: Math.max(0, nextTotal) / Math.max(1, first.quantity) }
            : line,
        );
      }
      const factor = Math.max(0, nextTotal) / currentTotal;
      return current.map((line) => ({
        ...line,
        unitPrice: Math.max(0, line.unitPrice * factor),
      }));
    });
    setDraftPrices({});
    setDraftTotals({});
    setDraftCartTotal(null);
  };

  const removeLine = (sku: string) => {
    setCart((current) => current.filter((line) => line.sku !== sku));
    setDraftPrices((current) => {
      if (!(sku in current)) return current;
      const next = { ...current };
      delete next[sku];
      return next;
    });
    setDraftTotals((current) => {
      if (!(sku in current)) return current;
      const next = { ...current };
      delete next[sku];
      return next;
    });
    setDraftCartTotal(null);
  };

  const parseMoneyInput = (raw: string) => {
    const cleaned = raw.replace(/[^\d.]/g, "");
    if (cleaned === "" || cleaned === ".") return 0;
    const next = Number(cleaned);
    return Number.isFinite(next) ? Math.max(0, next) : 0;
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center overflow-hidden bg-slate-950/50 backdrop-blur-sm">
      <button className="absolute inset-0" onClick={onClose} aria-label={t("common.close")} />
      <div className="sheet-enter relative z-10 flex h-[min(94dvh,100%)] max-h-[94dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl safe-bottom">
        <div className="shrink-0">
          <div className="mx-auto mt-2.5 h-1.5 w-12 rounded-full bg-slate-200" />
          <div className="flex items-center justify-between gap-2 px-3 py-2.5 sm:px-4 sm:py-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand text-navy sm:size-11">
                <Icon name="cart" />
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-base font-bold text-slate-900 sm:text-lg">{t("quickSale.title")}</h2>
                <p className="truncate text-[11px] text-slate-500 sm:text-xs">{t("quickSale.subtitle")}</p>
              </div>
            </div>
            <button className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600 sm:size-11" onClick={onClose} aria-label={t("common.close")}>
              <Icon name="close" />
            </button>
          </div>

          <div className="px-3 sm:px-4">
            <div className="relative">
              <Icon name="search" className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-3 pr-10 text-base outline-none focus:border-navy focus:bg-white focus:ring-4 focus:ring-[#fddfe0]"
                placeholder={t("quickSale.searchPlaceholder")}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="mt-2.5 min-h-0 flex-1 space-y-3 overflow-x-hidden overflow-y-auto overscroll-contain px-3 pb-3 sm:mt-3 sm:space-y-4 sm:px-4">
          <section>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="min-w-0 truncate text-xs font-bold text-slate-500">{t("quickSale.tapToAdd")}</p>
              {itemCount > 0 && (
                <span className="shrink-0 rounded-full bg-navy px-2.5 py-1 text-[11px] font-bold text-white">
                  {t("quickSale.cartBadge", { count: itemCount })}
                </span>
              )}
            </div>
            <div className="space-y-2">
              {filtered.length ? filtered.map((product) => {
                const stockLeft = product.initialStock - (soldBySku[product.sku] || 0);
                const inCart = cartQtyBySku[product.sku] || 0;
                const selected = inCart > 0;
                const canAdd = inCart < stockLeft;
                return (
                  <button
                    key={product.sku}
                    type="button"
                    disabled={!canAdd}
                    onClick={() => addToCart(product.sku)}
                    aria-pressed={selected}
                    className={`flex w-full min-w-0 items-center gap-3 rounded-2xl border p-3.5 text-right transition active:scale-[0.99] disabled:opacity-40 ${
                      selected
                        ? "border-navy bg-soft-blue ring-2 ring-navy/20 shadow-sm shadow-navy/10"
                        : "border-slate-200 bg-white hover:border-navy/30 hover:bg-brand/30"
                    }`}
                  >
                    <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${selected ? "bg-navy text-white" : "bg-brand text-navy"}`}>
                      <Icon name={selected ? "check" : "plus"} className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="block min-w-0 truncate text-sm font-bold text-slate-900">{product.nameAr}</span>
                        {selected && (
                          <span className="shrink-0 rounded-full bg-navy px-2 py-0.5 text-[10px] font-bold text-white">
                            {t("quickSale.selectedBadge", { count: inCart })}
                          </span>
                        )}
                        {!selected && product.quickSale && (
                          <span className="shrink-0 rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-navy">{t("common.quickSale")}</span>
                        )}
                      </span>
                      <span className={`block truncate text-xs ${selected ? "font-semibold text-navy" : "text-slate-500"}`}>
                        {selected
                          ? t("quickSale.remainingCart", { stock: stockLeft, cart: inCart })
                          : t("quickSale.remainingOnly", { stock: stockLeft })}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-bold tabular-nums text-navy">{money(product.price)}</span>
                  </button>
                );
              }) : (
                <div className="rounded-2xl bg-slate-50 px-4 py-8 text-center">
                  <p className="text-sm font-semibold text-slate-700">
                    {query.trim() ? t("quickSale.noResults") : t("quickSale.noQuickProducts")}
                  </p>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Icon name="cart" className="size-4 text-navy" />
                <h3 className="text-sm font-bold text-slate-900">{t("quickSale.cartTitle")}</h3>
              </div>
              {itemCount > 0 && (
                <span className="text-[11px] font-semibold text-slate-500">{t("quickSale.cartLineTypes", { count: cart.length })}</span>
              )}
            </div>
            {cart.length ? (
              <div className="space-y-3">
                {cart.map((line) => {
                  const product = products.find((item) => item.sku === line.sku);
                  if (!product) return null;
                  const max = product.initialStock - (soldBySku[line.sku] || 0);
                  const lineTotal = line.quantity * line.unitPrice;
                  return (
                    <div key={line.sku} className="min-w-0 rounded-2xl border border-navy/25 bg-soft-blue p-3 ring-1 ring-navy/10">
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900">{product.nameAr}</p>
                          <p className="text-[11px] text-slate-500">{t("quickSale.inCart")}</p>
                        </div>
                        <button
                          type="button"
                          className="grid size-9 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500"
                          onClick={() => removeLine(line.sku)}
                          aria-label={t("quickSale.removeFromCart")}
                        >
                          <Icon name="trash" className="size-4" />
                        </button>
                      </div>
                      <div className="mb-2">
                        <p className="mb-1 text-[11px] font-bold text-slate-500">{t("common.quantity")}</p>
                        <Stepper
                          value={line.quantity}
                          min={1}
                          max={Math.max(1, max)}
                          onChange={(value) => updateLineQty(line.sku, value)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="min-w-0 block">
                          <span className="mb-1 block text-[11px] font-bold text-slate-500">{t("quickSale.unitPrice")}</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            className={`${inputClass} min-h-11 px-2 py-2 text-center text-base font-bold`}
                            value={draftPrices[line.sku] ?? String(Math.round(line.unitPrice) || 0)}
                            onFocus={() =>
                              setDraftPrices((current) => ({
                                ...current,
                                [line.sku]: String(Math.round(line.unitPrice) || 0),
                              }))
                            }
                            onChange={(event) => {
                              const raw = event.target.value.replace(/[^\d.]/g, "");
                              setDraftPrices((current) => ({ ...current, [line.sku]: raw }));
                            }}
                            onBlur={(event) => {
                              updateLinePrice(line.sku, parseMoneyInput(event.target.value));
                            }}
                            aria-label={t("quickSale.unitPrice")}
                          />
                        </label>
                        <label className="min-w-0 block">
                          <span className="mb-1 block text-[11px] font-bold text-navy">{t("quickSale.finalPrice")}</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            className={`${inputClass} min-h-11 border-navy/40 bg-white px-2 py-2 text-center text-base font-bold text-navy ring-1 ring-navy/15`}
                            value={draftTotals[line.sku] ?? String(Math.round(lineTotal) || 0)}
                            onFocus={() =>
                              setDraftTotals((current) => ({
                                ...current,
                                [line.sku]: String(Math.round(lineTotal) || 0),
                              }))
                            }
                            onChange={(event) => {
                              const raw = event.target.value.replace(/[^\d.]/g, "");
                              setDraftTotals((current) => ({ ...current, [line.sku]: raw }));
                            }}
                            onBlur={(event) => {
                              updateLineTotal(line.sku, parseMoneyInput(event.target.value));
                            }}
                            aria-label={t("quickSale.finalPriceAria")}
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-slate-500">{t("quickSale.cartEmpty")}</p>
            )}
          </section>

          {cart.length > 0 && <ChangeCalculator total={total} />}
        </div>

        <div className="shrink-0 border-t border-slate-100 bg-white px-3 pb-3 pt-2.5 sm:px-4 sm:py-3">
          <div className="mb-2 flex items-end gap-2">
            <label className="min-w-0 flex-1">
              <span className="mb-1 block text-[11px] font-bold text-slate-500">{t("quickSale.invoiceTotal")}</span>
              <input
                type="text"
                inputMode="decimal"
                className={`${inputClass} min-h-11 px-2 py-2 text-center text-base font-bold text-navy sm:text-lg`}
                value={draftCartTotal ?? String(Math.round(total) || 0)}
                onFocus={() => setDraftCartTotal(String(Math.round(total) || 0))}
                onChange={(event) => setDraftCartTotal(event.target.value.replace(/[^\d.]/g, ""))}
                onBlur={(event) => updateCartTotal(parseMoneyInput(event.target.value))}
                aria-label={t("quickSale.invoiceTotal")}
              />
            </label>
            <p className="mb-2.5 shrink-0 text-[11px] tabular-nums text-slate-500">
              {t("quickSale.pieceCount", { count: itemCount })}
            </p>
          </div>
          <Button
            className="w-full min-h-11 text-sm sm:min-h-12 sm:text-base"
            onClick={() => onCheckout(cart)}
            disabled={!cart.length}
          >
            <Icon name="check" className="size-5" /> {t("quickSale.checkout")} · {money(total)}
          </Button>
        </div>
      </div>
    </div>
  );
}
