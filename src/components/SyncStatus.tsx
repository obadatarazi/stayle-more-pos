import Icon from "@/components/Icon";
import type { SyncStatus } from "@/hooks/useCloudSync";
import type { IconName } from "@/types/store";
import { localeFor } from "@/i18n/config";
import { useI18n } from "@/i18n/useI18n";

const dotClass: Record<SyncStatus, string> = {
  online: "bg-emerald-400 ring-emerald-400/15",
  saving: "bg-amber-300 ring-amber-300/20",
  loading: "bg-amber-300 ring-amber-300/20",
  pending: "bg-amber-300 ring-amber-300/20",
  offline: "bg-slate-400 ring-slate-400/20",
  error: "bg-coral ring-coral/20",
  local: "bg-slate-300 ring-slate-300/20",
};

/** Header button look per state: calm when all is well, loud when the cashier must notice. */
const buttonClass: Record<SyncStatus, string> = {
  online: "border-slate-200 bg-white text-slate-600",
  saving: "border-slate-200 bg-white text-slate-600",
  loading: "border-slate-200 bg-white text-slate-600",
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  offline: "border-slate-800 bg-slate-800 text-white",
  error: "border-coral-border bg-coral-pale text-coral-dark",
  local: "border-slate-200 bg-white text-slate-400",
};

export const statusIcon = (status: SyncStatus): IconName =>
  status === "offline" ? "cloudOff" : status === "error" ? "warning" : "cloud";

export function useSyncLabels(status: SyncStatus, pending: number) {
  const { t } = useI18n();
  const long = t(`sync.${status}`, { count: pending });
  const short = t(`sync.${status}Short`, { count: pending });
  return { long, short };
}

export function SyncDot({ status }: { status: SyncStatus }) {
  return (
    <span className={`size-2 shrink-0 rounded-full ring-4 ${dotClass[status]} ${status === "saving" ? "animate-pulse" : ""}`} />
  );
}

/** Header button: icon + state dot + pending count; label from `sm` up. Opens the status sheet. */
export function SyncButton({
  status,
  pending,
  onOpen,
}: {
  status: SyncStatus;
  pending: number;
  onOpen: () => void;
}) {
  const { t } = useI18n();
  const { short, long } = useSyncLabels(status, pending);
  const busy = status === "saving" || status === "loading";
  return (
    <button
      type="button"
      data-sync-button
      onClick={onOpen}
      title={long}
      aria-label={`${t("sync.panelTitle")}: ${long}`}
      aria-haspopup="dialog"
      className={`relative inline-flex size-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border transition active:scale-95 sm:size-auto sm:min-h-11 sm:px-3 ${buttonClass[status]}`}
    >
      <Icon name={statusIcon(status)} className={`size-5 ${busy ? "animate-pulse" : ""}`} />
      <span className="hidden text-xs font-bold sm:inline">{short}</span>
      {pending > 0 ? (
        <span
          aria-hidden="true"
          className="absolute -top-1.5 -end-1.5 grid h-5 min-w-5 place-items-center sm:hidden rounded-full bg-coral-dark px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white"
          dir="ltr"
        >
          {pending > 99 ? "99+" : pending}
        </span>
      ) : (
        status !== "local" && (
          <span
            aria-hidden="true"
            className={`absolute -top-0.5 -end-0.5 size-2.5 rounded-full ring-2 ring-white ${dotClass[status].split(" ")[0]} ${busy ? "animate-pulse" : ""}`}
          />
        )
      )}
      <span className="sr-only" aria-live="polite">
        {long}
      </span>
    </button>
  );
}

/** Time of the last successful sync, or "not synced yet". */
export function useLastSyncTime(lastSyncedAt: number | null) {
  const { t, lang } = useI18n();
  if (!lastSyncedAt) return t("sync.neverSynced");
  const date = new Date(lastSyncedAt);
  const sameDay = new Date().toDateString() === date.toDateString();
  return new Intl.DateTimeFormat(localeFor(lang), {
    hour: "numeric",
    minute: "2-digit",
    ...(sameDay ? {} : { day: "numeric", month: "short" }),
  }).format(date);
}

/** Sidebar card. */
export function SyncSidebarCard({
  status,
  pending,
  lastSyncedAt,
  cloudEnabled,
  onSyncNow,
}: {
  status: SyncStatus;
  pending: number;
  lastSyncedAt: number | null;
  cloudEnabled: boolean;
  onSyncNow: () => void;
}) {
  const { t } = useI18n();
  const { long } = useSyncLabels(status, pending);
  const lastSyncTime = useLastSyncTime(lastSyncedAt);
  const lastSync = lastSyncedAt ? t("sync.lastSync", { time: lastSyncTime }) : lastSyncTime;
  const hint = !cloudEnabled
    ? t("sync.envHint")
    : status === "offline" || status === "pending"
      ? t("sync.offlineHint")
      : status === "error"
        ? t("sync.errorHint")
        : t("sync.sharedHint");
  return (
    <div className="mt-auto rounded-2xl border border-white/10 bg-white/8 p-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <SyncDot status={status} />
        {long}
      </div>
      <p className="mt-2 text-xs leading-5 text-brand">{hint}</p>
      {cloudEnabled && (
        <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-brand/80">
          <span>{lastSync}</span>
          {status !== "offline" && status !== "saving" && status !== "loading" && (
            <button
              type="button"
              onClick={onSyncNow}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold text-white hover:bg-white/10"
            >
              <Icon name="exchange" className="size-3.5" />
              {t("sync.syncNow")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
