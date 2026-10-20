import { useState } from "react";
import FieldLabel, { inputClass } from "@/components/FieldLabel";
import Icon from "@/components/Icon";
import { useI18n } from "@/i18n/useI18n";
import { money } from "@/lib/format";

export default function ChangeCalculator({ total }: { total: number }) {
  const { t } = useI18n();
  const [paid, setPaid] = useState("");
  const [open, setOpen] = useState(false);
  const paidAmount = Number(paid);
  const hasPaid = paid.trim() !== "" && !Number.isNaN(paidAmount);
  const change = hasPaid ? paidAmount - total : null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between gap-2 rounded-2xl border border-coral-border bg-brand/50 px-3.5 py-3 text-right"
      >
        <span className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-xl bg-navy text-white">
            <Icon name="cash" className="size-4" />
          </span>
          <span>
            <span className="block text-sm font-bold text-slate-900">{t("changeCalc.title")}</span>
            <span className="block text-[11px] text-slate-500">{t("changeCalc.hintClosed")}</span>
          </span>
        </span>
        <Icon name="chevron" className="size-4 text-slate-400" />
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-coral-border bg-brand/50 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-xl bg-navy text-white">
            <Icon name="cash" className="size-4" />
          </span>
          <div>
            <p className="text-sm font-bold text-slate-900">{t("changeCalc.title")}</p>
            <p className="text-[11px] text-slate-500">{t("changeCalc.hintOpen")}</p>
          </div>
        </div>
        <button type="button" className="text-xs font-bold text-slate-500" onClick={() => setOpen(false)}>
          {t("common.hide")}
        </button>
      </div>
      <label className="block">
        <FieldLabel>{t("changeCalc.received")}</FieldLabel>
        <input
          type="text"
          inputMode="decimal"
          className={inputClass}
          placeholder={t("changeCalc.placeholder")}
          value={paid}
          onChange={(event) => setPaid(event.target.value.replace(/[^\d.]/g, ""))}
        />
      </label>
      {hasPaid && (
        <div className={`mt-3 rounded-xl px-3.5 py-3 ${change !== null && change >= 0 ? "bg-emerald-100" : "bg-coral-pale"}`}>
          <p className="text-xs font-semibold text-slate-600">
            {change !== null && change >= 0 ? t("changeCalc.changeDue") : t("changeCalc.shortfall")}
          </p>
          <p className={`mt-1 text-2xl font-bold tabular-nums ${change !== null && change >= 0 ? "text-emerald-700" : "text-coral-dark"}`}>
            {money(Math.abs(change || 0))}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            {t("changeCalc.summary", { total: money(total), paid: money(paidAmount) })}
          </p>
        </div>
      )}
    </div>
  );
}
