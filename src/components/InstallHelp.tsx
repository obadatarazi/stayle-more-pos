import { useEffect, useState } from "react";
import Button from "@/components/Button";
import Icon from "@/components/Icon";
import { useI18n } from "@/i18n/useI18n";
import { detectPhoneBrand, type PhoneBrand } from "@/lib/deviceBrand";
import { canPromptInstall, clearInstallFailed, promptInstall } from "@/lib/pwa";

const BRANDS: Exclude<PhoneBrand, "other">[] = ["xiaomi", "samsung", "oppo", "realme", "vivo", "huawei"];

/** Shown when adding to the home screen didn't work: why, and how to allow it on this phone. */
export default function InstallHelp() {
  const { t } = useI18n();
  const [brand, setBrand] = useState<PhoneBrand>("other");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    void detectPhoneBrand().then(setBrand);
  }, []);

  const others = BRANDS.filter((item) => item !== brand);
  const canRetry = canPromptInstall();

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900" role="alert">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-700">
          <Icon name="warning" className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold">{t("pwa.help.title")}</p>
          <p className="mt-1 text-xs leading-5">{t("pwa.help.why")}</p>
        </div>
      </div>

      {brand !== "other" && (
        <div className="mt-3 rounded-xl bg-white p-3 text-xs leading-5 text-slate-700">
          <p className="font-bold text-slate-900">{t(`pwa.help.brands.${brand}.name`)}</p>
          <p className="mt-1">{t(`pwa.help.brands.${brand}.steps`)}</p>
        </div>
      )}

      {(brand === "other" || showAll) && (
        <ul className="mt-3 space-y-2 rounded-xl bg-white p-3 text-xs leading-5 text-slate-700">
          {others.map((item) => (
            <li key={item}>
              <span className="font-bold text-slate-900">{t(`pwa.help.brands.${item}.name`)}: </span>
              {t(`pwa.help.brands.${item}.steps`)}
            </li>
          ))}
        </ul>
      )}
      {brand !== "other" && !showAll && (
        <button type="button" className="mt-2 text-xs font-bold underline" onClick={() => setShowAll(true)}>
          {t("pwa.help.otherBrands")}
        </button>
      )}

      <p className="mt-3 text-xs leading-5">{t("pwa.help.updateChrome")}</p>
      {!canRetry && <p className="mt-1 text-xs leading-5">{t("pwa.help.menuRetry")}</p>}

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button type="button" variant="secondary" className="min-h-10" onClick={clearInstallFailed}>
          {t("common.close")}
        </Button>
        <Button
          type="button"
          className="min-h-10"
          disabled={!canRetry}
          onClick={() => void promptInstall()}
        >
          <Icon name="refresh" className="size-4" />
          {t("pwa.help.retry")}
        </Button>
      </div>
    </div>
  );
}
