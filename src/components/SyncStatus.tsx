import Icon from "@/components/Icon";
import type { SyncStatus } from "@/hooks/useCloudSync";
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

const badgeClass: Record<SyncStatus, string> = {
  online: "bg-emerald-100 text-emerald-700",
  saving: "bg-amber-50 text-amber-700",
  loading: "bg-amber-50 text-amber-700",
  pending: "bg-amber-100 text-amber-800",
  offline: "bg-slate-800 text-white",
  error: "bg-coral-pale text-coral-dark",
  local: "bg-slate-100 text-slate-500",
};

/** States the cashier must notice; these stay visible on phones too. */
const needsAttention = (status: SyncStatus) => status === "offline" || status === "pending" || status === "error";

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

export function SyncBadge({
  status,
  pending,
  onSyncNow,
}: {
  status: SyncStatus;
  pending: number;
  onSyncNow: () => void;
}) {
  const { short, long } = useSyncLabels(status, pending);
  const actionable = status === "pending" || status === "error";
  return (
    <button
      type="button"
      onClick={actionable ? onSyncNow : undefined}
      title={long}
      aria-label={long}
      aria-live="polite"
      className={`shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${badgeClass[status]} ${needsAttention(status) ? "inline-flex" : "hidden sm:inline-flex"} ${actionable ? "cursor-pointer" : "cursor-default"}`}
    >
      {status === "offline" && <span className="size-1.5 rounded-full bg-amber-300" />}
      {short}
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
