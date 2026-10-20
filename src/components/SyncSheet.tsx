import { useEffect } from "react";
import Button from "@/components/Button";
import Icon from "@/components/Icon";
import NotificationsSetting from "@/components/NotificationsSetting";
import { statusIcon, useLastSyncTime, useSyncLabels } from "@/components/SyncStatus";
import type { SyncStatus } from "@/hooks/useCloudSync";
import { useI18n } from "@/i18n/useI18n";
import InstallHelp from "@/components/InstallHelp";
import { promptInstall, reportInstallFailed, useInstallState } from "@/lib/pwa";
import type { AuthUser } from "@/types/store";

const heroClass: Record<SyncStatus, string> = {
  online: "bg-emerald-50 text-emerald-800",
  saving: "bg-amber-50 text-amber-800",
  loading: "bg-amber-50 text-amber-800",
  pending: "bg-amber-50 text-amber-800",
  offline: "bg-slate-800 text-white",
  error: "bg-coral-soft text-coral-dark",
  local: "bg-slate-100 text-slate-600",
};

const heroIconClass: Record<SyncStatus, string> = {
  online: "bg-emerald-100 text-emerald-700",
  saving: "bg-amber-100 text-amber-700",
  loading: "bg-amber-100 text-amber-700",
  pending: "bg-amber-100 text-amber-700",
  offline: "bg-white/10 text-white",
  error: "bg-coral-pale text-coral-dark",
  local: "bg-white text-slate-500",
};

/** "App status" sheet: connection, sync queue, notifications and the signed-in account. */
export default function SyncSheet({
  status,
  pending,
  lastSyncedAt,
  cloudEnabled,
  user,
  onSyncNow,
  onClose,
}: {
  status: SyncStatus;
  pending: number;
  lastSyncedAt: number | null;
  cloudEnabled: boolean;
  user: AuthUser;
  onSyncNow: () => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const { long } = useSyncLabels(status, pending);
  const lastSync = useLastSyncTime(lastSyncedAt);
  const offline = status === "offline";
  const busy = status === "saving" || status === "loading";
  const install = useInstallState();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const hint = !cloudEnabled
    ? t("sync.envHint")
    : offline || status === "pending"
      ? t("sync.offlineHint")
      : status === "error"
        ? t("sync.errorHint")
        : busy
          ? t("sync.syncing")
          : t("sync.allSynced");

  return (
    <div className="fixed inset-0 z-[75] flex items-end justify-center bg-slate-950/50 backdrop-blur-sm md:items-center md:p-4">
      <button className="absolute inset-0" onClick={onClose} aria-label={t("common.close")} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sync-sheet-title"
        className="sheet-enter relative z-10 max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-coral-border bg-white p-5 shadow-2xl safe-bottom md:rounded-3xl md:p-6"
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200 md:hidden" />
        <div className="flex items-center justify-between gap-3">
          <h2 id="sync-sheet-title" className="text-lg font-bold text-slate-900">
            {t("sync.panelTitle")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-600"
          >
            <Icon name="close" className="size-5" />
          </button>
        </div>

        <div className={`mt-4 flex items-start gap-3 rounded-2xl p-4 ${heroClass[status]}`}>
          <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${heroIconClass[status]}`}>
            <Icon name={statusIcon(status)} className={`size-6 ${busy ? "animate-pulse" : ""}`} />
          </span>
          <div className="min-w-0">
            <p className="font-bold">{long}</p>
            <p className="mt-1 text-xs leading-5 opacity-80">{hint}</p>
          </div>
        </div>

        {cloudEnabled && (
          <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-slate-50 p-3">
              <dt className="text-[11px] text-slate-500">{t("sync.connection")}</dt>
              <dd className={`mt-1 text-sm font-bold ${offline ? "text-slate-800" : "text-emerald-700"}`}>
                {offline ? t("sync.disconnected") : t("sync.connected")}
              </dd>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <dt className="text-[11px] text-slate-500">{t("settings.pendingEdits")}</dt>
              <dd className={`mt-1 text-sm font-bold ${pending ? "text-amber-700" : "text-slate-800"}`} dir="ltr">
                {pending}
              </dd>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <dt className="text-[11px] text-slate-500">{t("settings.lastSyncLabel")}</dt>
              <dd className="mt-1 text-sm font-bold text-slate-800">{lastSync}</dd>
            </div>
          </dl>
        )}

        {cloudEnabled && (
          <Button
            type="button"
            className="mt-4 w-full min-h-12"
            disabled={offline || busy}
            onClick={onSyncNow}
          >
            <Icon name="refresh" className={`size-4 ${busy ? "animate-spin" : ""}`} />
            {busy ? t("sync.syncing") : t("sync.syncNow")}
          </Button>
        )}

        {install === "failed" && (
          <div className="mt-4">
            <InstallHelp />
          </div>
        )}
        {install !== "installed" && install !== "failed" && (
          <div className="mt-4 rounded-2xl border border-slate-200 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-900">{t("pwa.installTitle")}</h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {install === "installing"
                    ? t("pwa.installing")
                    : install === "available"
                    ? t("pwa.installHint")
                    : install === "ios"
                      ? t("pwa.installIos")
                      : t("pwa.installManual")}
                </p>
              </div>
              {install === "installing" && (
                <Button type="button" variant="ghost" className="shrink-0" onClick={reportInstallFailed}>
                  {t("pwa.didntWork")}
                </Button>
              )}
              {install === "unavailable" && (
                <Button type="button" variant="ghost" className="shrink-0" onClick={reportInstallFailed}>
                  {t("pwa.didntWork")}
                </Button>
              )}
              {install === "available" && (
                <Button type="button" variant="secondary" className="shrink-0" onClick={() => void promptInstall()}>
                  <Icon name="download" className="size-4" />
                  {t("pwa.install")}
                </Button>
              )}
            </div>
          </div>
        )}

        <div className="mt-4 rounded-2xl border border-slate-200 p-4">
          <NotificationsSetting compact />
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 p-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-navy text-xs font-bold text-white">
            {user.shortName}
          </span>
          <div className="min-w-0">
            <p className="text-[11px] text-slate-500">{t("sync.signedInAs")}</p>
            <p className="truncate text-sm font-bold text-slate-800">
              {user.displayName} <span className="font-normal text-slate-400">· {user.username}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
