import { useState } from "react";
import Icon from "@/components/Icon";
import { storageKeys } from "@/config/site";
import { useI18n } from "@/i18n/useI18n";
import { promptInstall, useInstallState } from "@/lib/pwa";

const HIDE_FOR_MS = 7 * 24 * 60 * 60 * 1000;

function dismissedRecently() {
  try {
    const at = Number(localStorage.getItem(storageKeys.installDismissedAt));
    return at > 0 && Date.now() - at < HIDE_FOR_MS;
  } catch {
    return false;
  }
}

/** One-tap "Add to home screen" while the app is not installed. */
export default function InstallPill() {
  const { t } = useI18n();
  const install = useInstallState();
  const [hidden, setHidden] = useState(dismissedRecently);
  const [showIosSteps, setShowIosSteps] = useState(false);

  if (hidden || (install !== "available" && install !== "ios")) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(storageKeys.installDismissedAt, String(Date.now()));
    } catch {
      // ignore
    }
    setHidden(true);
  };

  return (
    <div className="mb-4 md:mb-6">
      <div className="flex items-center gap-2 rounded-full border border-coral-border bg-white py-1.5 ps-1.5 pe-2 shadow-sm">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-soft-blue text-navy">
          <Icon name="download" className="size-4" />
        </span>
        <p className="min-w-0 flex-1 truncate text-xs font-bold text-slate-700">{t("pwa.addToHome")}</p>
        <button
          type="button"
          onClick={() => (install === "available" ? void promptInstall() : setShowIosSteps((open) => !open))}
          className="shrink-0 rounded-full bg-navy px-3.5 py-1.5 text-xs font-bold text-white active:scale-95"
        >
          {install === "available" ? t("pwa.install") : t("pwa.howTo")}
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t("common.close")}
          className="grid size-7 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-slate-100"
        >
          <Icon name="close" className="size-4" />
        </button>
      </div>
      {showIosSteps && (
        <p className="mt-2 rounded-2xl bg-white px-4 py-3 text-xs leading-5 text-slate-600 shadow-sm">{t("pwa.installIos")}</p>
      )}
    </div>
  );
}
