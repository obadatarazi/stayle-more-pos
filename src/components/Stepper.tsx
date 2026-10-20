import Icon from "@/components/Icon";
import { useI18n } from "@/i18n/useI18n";

export default function Stepper({
  value,
  min = 1,
  max,
  onChange,
}: {
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const { t } = useI18n();

  return (
    <div dir="ltr" className="inline-flex w-full min-w-0 max-w-full items-center overflow-hidden rounded-2xl border-2 border-navy/20 bg-white shadow-sm">
      <button
        type="button"
        className="grid size-11 shrink-0 place-items-center border-r-2 border-navy/10 bg-slate-50 text-slate-700 transition active:bg-brand disabled:opacity-35 sm:size-12"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label={t("common.decreaseQty")}
      >
        <Icon name="minus" className="size-5" />
      </button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        className="min-w-0 flex-1 border-0 bg-transparent px-1 py-2.5 text-center text-base font-bold tabular-nums text-slate-900 outline-none focus:bg-brand/40 sm:py-3 sm:text-lg"
        value={String(value)}
        aria-label={t("common.quantity")}
        onChange={(event) => {
          const digits = event.target.value.replace(/\D/g, "");
          if (digits === "") {
            onChange(min);
            return;
          }
          const next = Number(digits);
          if (Number.isNaN(next)) return;
          onChange(Math.min(max, Math.max(min, next)));
        }}
      />
      <button
        type="button"
        className="grid size-11 shrink-0 place-items-center border-l-2 border-navy/10 bg-navy text-white transition active:bg-navy-light disabled:opacity-35 sm:size-12"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label={t("common.increaseQty")}
      >
        <Icon name="plus" className="size-5" />
      </button>
    </div>
  );
}
