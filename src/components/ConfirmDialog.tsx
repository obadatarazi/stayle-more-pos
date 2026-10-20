import Button from "@/components/Button";
import Icon from "@/components/Icon";
import { useI18n } from "@/i18n/useI18n";
import type { IconName } from "@/types/store";

export default function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  confirmIcon = "trash",
  danger = true,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmIcon?: IconName;
  danger?: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm md:items-center md:p-4">
      <button className="absolute inset-0" onClick={onCancel} aria-label={t("common.close")} />
      <div className="sheet-enter relative z-10 w-full max-w-md rounded-t-3xl border border-coral-border bg-white p-5 shadow-2xl safe-bottom md:rounded-3xl md:p-6">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200 md:hidden" />
        <div className="flex items-start gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-coral-soft text-coral-dark">
            <Icon name="warning" className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{message}</p>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-2">
          <Button type="button" variant="secondary" className="min-h-12" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            className={`min-h-12 ${danger ? "bg-coral-dark hover:bg-[#744650]" : ""}`}
            onClick={onConfirm}
          >
            <Icon name={confirmIcon} className="size-4" />
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
