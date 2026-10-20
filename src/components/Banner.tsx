import Button from "@/components/Button";
import Icon from "@/components/Icon";
import type { IconName } from "@/types/store";

export default function Banner({
  icon,
  message,
  actionLabel,
  onAction,
  dismissLabel,
  onDismiss,
}: {
  icon: IconName;
  message: string;
  actionLabel: string;
  onAction: () => void;
  dismissLabel?: string;
  onDismiss?: () => void;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-coral-border bg-white p-3.5 shadow-sm sm:flex-row sm:items-center md:mb-6">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-soft-blue text-navy">
          <Icon name={icon} className="size-5" />
        </span>
        <p className="text-sm font-medium text-slate-700">{message}</p>
      </div>
      <div className="flex shrink-0 gap-2">
        {onDismiss && dismissLabel && (
          <Button type="button" variant="ghost" className="flex-1 sm:flex-none" onClick={onDismiss}>
            {dismissLabel}
          </Button>
        )}
        <Button type="button" className="flex-1 sm:flex-none" onClick={onAction}>
          {actionLabel}
        </Button>
      </div>
    </div>
  );
}
