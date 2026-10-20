import { FormEvent, useMemo, useState } from "react";
import Button from "@/components/Button";
import ConfirmDialog from "@/components/ConfirmDialog";
import FieldLabel, { inputClass } from "@/components/FieldLabel";
import Icon from "@/components/Icon";
import PageIntro from "@/components/PageIntro";
import { useI18n } from "@/i18n/useI18n";
import { formatMonthLabel, money, monthKey, shortDate, todayISO, usd } from "@/lib/format";
import type { Exchange } from "@/types/store";

export default function ExchangePage({
  exchanges,
  defaultUsdRate,
  onAdd,
  onDelete,
}: {
  exchanges: Exchange[];
  defaultUsdRate: number;
  onAdd: (exchange: Omit<Exchange, "id" | "doneBy" | "doneByName">) => void;
  onDelete: (id: number) => void;
}) {
  const { t } = useI18n();
  const [direction, setDirection] = useState<Exchange["direction"]>("sypToUsd");
  const [given, setGiven] = useState("");
  const [received, setReceived] = useState("");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [month, setMonth] = useState("all");
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const sypToUsd = direction === "sypToUsd";
  const sypAmount = Number(sypToUsd ? given : received);
  const usdAmount = Number(sypToUsd ? received : given);
  const rate = sypAmount > 0 && usdAmount > 0 ? sypAmount / usdAmount : 0;
  const rateLabel = (value: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);

  const months = useMemo(
    () => [...new Set(exchanges.map((item) => monthKey(item.date)).filter((key) => key.length === 7))].sort((a, b) => b.localeCompare(a)),
    [exchanges],
  );
  const shown = useMemo(
    () =>
      exchanges
        .filter((item) => month === "all" || monthKey(item.date) === month)
        .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id),
    [exchanges, month],
  );
  const bought = shown.filter((item) => item.direction === "sypToUsd");
  const sold = shown.filter((item) => item.direction === "usdToSyp");
  const sum = (list: Exchange[], key: "sypAmount" | "usdAmount") => list.reduce((total, item) => total + item[key], 0);
  const boughtUsd = sum(bought, "usdAmount");
  const boughtSyp = sum(bought, "sypAmount");
  const soldUsd = sum(sold, "usdAmount");
  const soldSyp = sum(sold, "sypAmount");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!(sypAmount > 0) || !(usdAmount > 0) || !date) return;
    onAdd({ date, direction, sypAmount, usdAmount, note: note.trim() || undefined });
    setGiven("");
    setReceived("");
    setNote("");
  };

  const suggest = () => {
    if (!(defaultUsdRate > 0) || !(Number(given) > 0)) return;
    const value = sypToUsd ? Number(given) / defaultUsdRate : Number(given) * defaultUsdRate;
    setReceived(String(sypToUsd ? Math.round(value * 100) / 100 : Math.round(value)));
  };

  const segment = (active: boolean) =>
    `min-h-11 rounded-xl px-3 text-sm font-semibold transition ${active ? "bg-navy text-white" : "border border-slate-200 bg-white text-slate-600 hover:border-navy"}`;
  const currency = (isUsd: boolean) => (isUsd ? "$" : "ل.س");
  const confirmTarget = exchanges.find((item) => item.id === confirmId);

  return (
    <>
      <PageIntro eyebrow={t("exchange.eyebrow")} title={t("exchange.title")} description={t("exchange.description")} />
      <div className="grid gap-4 xl:grid-cols-[0.75fr_1.25fr] md:gap-5">
        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-4 md:p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-brand text-navy"><Icon name="exchange" /></span>
            <div>
              <h2 className="font-bold">{t("exchange.newTitle")}</h2>
              <p className="text-xs text-slate-500">{t("exchange.newHint")}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className={segment(sypToUsd)} onClick={() => setDirection("sypToUsd")}>
                {t("exchange.sypToUsd")}
              </button>
              <button type="button" className={segment(!sypToUsd)} onClick={() => setDirection("usdToSyp")}>
                {t("exchange.usdToSyp")}
              </button>
            </div>
            <label className="block">
              <FieldLabel>
                {t("exchange.paidAmount")} ({sypToUsd ? t("exchange.currencySyp") : t("exchange.currencyUsd")})
              </FieldLabel>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">{currency(!sypToUsd)}</span>
                <input type="number" min="0" step="0.01" inputMode="decimal" dir="ltr" className={`${inputClass} pl-12`} placeholder="0" value={given} onChange={(event) => setGiven(event.target.value)} required />
              </div>
            </label>
            <label className="block">
              <FieldLabel>
                {t("exchange.receivedAmount")} ({sypToUsd ? t("exchange.currencyUsd") : t("exchange.currencySyp")})
              </FieldLabel>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">{currency(sypToUsd)}</span>
                <input type="number" min="0" step="0.01" inputMode="decimal" dir="ltr" className={`${inputClass} pl-12`} placeholder="0" value={received} onChange={(event) => setReceived(event.target.value)} required />
              </div>
              {defaultUsdRate > 0 && Number(given) > 0 && (
                <button type="button" className="mt-1.5 text-xs font-bold text-navy" onClick={suggest}>
                  {t("exchange.suggestRate", { rate: rateLabel(defaultUsdRate) })}
                </button>
              )}
            </label>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-3 text-sm">
              <span className="text-slate-500">{t("exchange.effectiveRate")}</span>
              <span className="font-bold tabular-nums text-slate-900" dir="ltr">
                {rate ? t("exchange.rateValue", { rate: rateLabel(rate) }) : "—"}
              </span>
            </div>
            <label className="block">
              <FieldLabel>{t("export.date")}</FieldLabel>
              <input type="date" className={inputClass} value={date} onChange={(event) => setDate(event.target.value)} required />
            </label>
            <label className="block">
              <FieldLabel>{t("export.note")}</FieldLabel>
              <input className={inputClass} value={note} onChange={(event) => setNote(event.target.value)} placeholder={t("exchange.noteOptional")} maxLength={255} />
            </label>
            <Button type="submit" className="w-full min-h-12" disabled={!rate}>
              <Icon name="plus" className="size-4" /> {t("exchange.submit")}
            </Button>
          </div>
        </form>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 md:p-4">
              <p className="text-[11px] font-semibold text-slate-500 sm:text-xs">{t("exchange.boughtUsd")}</p>
              <p className="mt-2 text-base font-bold tabular-nums text-slate-950 sm:text-lg" dir="ltr">{usd(boughtUsd)}</p>
              <p className="mt-1 truncate text-[11px] text-slate-400">
                {t("exchange.forAmount", { amount: money(boughtSyp) })}
                {boughtUsd > 0 && ` · ${t("exchange.avgRate", { rate: rateLabel(boughtSyp / boughtUsd) })}`}
              </p>
            </div>
            <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 md:p-4">
              <p className="text-[11px] font-semibold text-slate-500 sm:text-xs">{t("exchange.soldUsd")}</p>
              <p className="mt-2 text-base font-bold tabular-nums text-slate-950 sm:text-lg" dir="ltr">{usd(soldUsd)}</p>
              <p className="mt-1 truncate text-[11px] text-slate-400">
                {t("exchange.forAmount", { amount: money(soldSyp) })}
                {soldUsd > 0 && ` · ${t("exchange.avgRate", { rate: rateLabel(soldSyp / soldUsd) })}`}
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6">
              <div>
                <h2 className="font-bold">{t("exchange.logTitle")}</h2>
                <p className="mt-1 text-xs text-slate-500">{t("exchange.opsCount", { count: shown.length })}</p>
              </div>
              <select className={`${inputClass} sm:w-48`} value={month} onChange={(event) => setMonth(event.target.value)} aria-label={t("export.month")}>
                <option value="all">{t("exchange.allMonths")}</option>
                {months.map((item) => <option key={item} value={item}>{formatMonthLabel(item)}</option>)}
              </select>
            </div>
            <div className="divide-y divide-slate-100">
              {shown.length ? shown.map((item) => {
                const toUsd = item.direction === "sypToUsd";
                return (
                  <div key={item.id} className="flex items-center gap-3 px-3 py-3.5 md:gap-4 md:px-6 md:py-4">
                    <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${toUsd ? "bg-emerald-50 text-emerald-700" : "bg-brand text-navy"}`}>
                      <Icon name="exchange" className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold tabular-nums text-slate-800" dir="ltr">
                        {toUsd ? `${money(item.sypAmount)} → ${usd(item.usdAmount)}` : `${usd(item.usdAmount)} → ${money(item.sypAmount)}`}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-400">
                        {shortDate(item.date)} · {t("exchange.rateValue", { rate: rateLabel(item.sypAmount / item.usdAmount) })} · {item.doneByName || item.doneBy || t("common.unknown")}
                        {item.note && ` · ${item.note}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="grid size-10 shrink-0 place-items-center rounded-xl text-slate-400 hover:bg-coral-soft hover:text-coral-dark"
                      onClick={() => setConfirmId(item.id)}
                      aria-label={t("common.delete")}
                    >
                      <Icon name="trash" className="size-4" />
                    </button>
                  </div>
                );
              }) : (
                <p className="py-10 text-center text-sm text-slate-500">{t("exchange.empty")}</p>
              )}
            </div>
          </div>
        </div>
      </div>
      {confirmTarget && (
        <ConfirmDialog
          title={t("common.confirmDelete")}
          message={t("exchange.confirmDeleteMessage", {
            usd: usd(confirmTarget.usdAmount),
            syp: money(confirmTarget.sypAmount),
            date: shortDate(confirmTarget.date),
          })}
          confirmLabel={t("common.yesDelete")}
          cancelLabel={t("common.cancel")}
          onConfirm={() => {
            onDelete(confirmTarget.id);
            setConfirmId(null);
          }}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </>
  );
}
