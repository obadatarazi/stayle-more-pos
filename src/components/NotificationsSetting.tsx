import { useI18n } from "@/i18n/useI18n";
import {
  disableNotifications,
  enableNotifications,
  showSystemNotification,
  useNotificationState,
} from "@/lib/notifications";

/** Title, explanation and on/off switch for system notifications. */
export default function NotificationsSetting({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  const state = useNotificationState();
  const on = state === "on";
  const toggle = async () => {
    if (on) {
      disableNotifications();
      return;
    }
    if (await enableNotifications()) {
      void showSystemNotification({
        title: t("sync.notify.enabledTitle"),
        body: t("sync.notify.enabledBody"),
        tag: "notify-test",
      });
    }
  };
  const hint =
    state === "unsupported"
      ? t("settings.notifyUnsupported")
      : state === "denied"
        ? t("settings.notifyDenied")
        : t("settings.notifyHint");
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h2 className={`font-bold text-slate-900 ${compact ? "text-sm" : "text-base"}`}>{t("settings.notifyTitle")}</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">{hint}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={t("settings.notifyTitle")}
        disabled={state === "unsupported" || state === "denied"}
        onClick={() => void toggle()}
        className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-40 ${on ? "bg-navy" : "bg-slate-300"}`}
      >
        <span
          className={`absolute top-1 size-5 rounded-full bg-white shadow transition-all ${on ? "start-6" : "start-1"}`}
        />
      </button>
    </div>
  );
}
