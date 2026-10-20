import { useEffect, useState, type ReactNode } from "react";
import Button from "@/components/Button";
import Icon from "@/components/Icon";
import { useI18n } from "@/i18n/useI18n";
import { detectPhoneBrand, isSamsungInternet, samsungInternetUrl, type PhoneBrand } from "@/lib/deviceBrand";
import { canPromptInstall, clearInstallFailed, promptInstall } from "@/lib/pwa";

const BRANDS: Exclude<PhoneBrand, "other">[] = ["xiaomi", "samsung", "oppo", "realme", "vivo", "huawei"];

function Option({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return (
    <div className="mt-3 rounded-xl bg-white p-3 text-xs leading-5 text-slate-700">
      <p className="flex items-center gap-2 font-bold text-slate-900">
        <span className="grid size-5 shrink-0 place-items-center rounded-full bg-navy text-[10px] text-white">{number}</span>
        {title}
      </p>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

/**
 * Shown when adding to the home screen didn't work. Chrome's "Install" builds the app through
 * Google's servers and Play services, which can hang where those are blocked; the alternatives
 * below don't need Google at all.
 */
export default function InstallHelp() {
  const { t } = useI18n();
  const [brand, setBrand] = useState<PhoneBrand>("other");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    void detectPhoneBrand().then(setBrand);
  }, []);

  const inSamsungInternet = isSamsungInternet();
  const offerSamsungInternet = brand === "samsung" && !inSamsungInternet;
  const others = BRANDS.filter((item) => item !== brand);
  const canRetry = canPromptInstall();
  let step = 0;

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

      {offerSamsungInternet && (
        <Option number={++step} title={t("pwa.help.samsungInternetTitle")}>
          <p>{t("pwa.help.samsungInternetSteps")}</p>
          <a
            href={samsungInternetUrl()}
            className="mt-2 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-navy px-4 text-sm font-semibold text-white"
          >
            <Icon name="exchange" className="size-4" />
            {t("pwa.help.openSamsungInternet")}
          </a>
        </Option>
      )}

      {inSamsungInternet ? (
        <Option number={++step} title={t("pwa.help.samsungInternetTitle")}>
          <p>{t("pwa.help.samsungInternetSteps")}</p>
        </Option>
      ) : (
        <Option number={++step} title={t("pwa.help.shortcutTitle")}>
          <p>{t("pwa.help.shortcutSteps")}</p>
        </Option>
      )}

      <Option number={++step} title={t("pwa.help.permissionTitle")}>
        {brand !== "other" && (
          <p>
            <span className="font-bold text-slate-900">{t(`pwa.help.brands.${brand}.name`)}: </span>
            {t(`pwa.help.brands.${brand}.steps`)}
          </p>
        )}
        {(brand === "other" || showAll) && (
          <ul className="mt-1 space-y-1.5">
            {others.map((item) => (
              <li key={item}>
                <span className="font-bold text-slate-900">{t(`pwa.help.brands.${item}.name`)}: </span>
                {t(`pwa.help.brands.${item}.steps`)}
              </li>
            ))}
          </ul>
        )}
        {brand !== "other" && !showAll && (
          <button type="button" className="mt-1 font-bold text-navy underline" onClick={() => setShowAll(true)}>
            {t("pwa.help.otherBrands")}
          </button>
        )}
      </Option>

      <p className="mt-3 text-xs leading-5">{t("pwa.help.stuckChrome")}</p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button type="button" variant="secondary" className="min-h-10" onClick={clearInstallFailed}>
          {t("common.close")}
        </Button>
        <Button type="button" className="min-h-10" disabled={!canRetry} onClick={() => void promptInstall()}>
          <Icon name="refresh" className="size-4" />
          {t("pwa.help.retry")}
        </Button>
      </div>
    </div>
  );
}
