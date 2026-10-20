import { useEffect, useState } from "react";
import Button from "@/components/Button";
import ConfirmDialog from "@/components/ConfirmDialog";
import FieldLabel, { inputClass } from "@/components/FieldLabel";
import PageIntro from "@/components/PageIntro";
import { useI18n } from "@/i18n/useI18n";
import type { Product, StoreSettings } from "@/types/store";

export default function SettingsPage({
  settings,
  products,
  onChangeUsdRate,
}: {
  settings: StoreSettings;
  products: Product[];
  onChangeUsdRate: (usdRate: number) => void;
}) {
  const { t } = useI18n();
  const [rate, setRate] = useState(settings.usdRate ? String(settings.usdRate) : "");
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    setRate(settings.usdRate ? String(settings.usdRate) : "");
  }, [settings.usdRate]);

  const parsed = Number(rate);
  const usdProducts = products.filter((product) => product.costUsd > 0);
  const valid = parsed > 0 && parsed !== settings.usdRate;

  return (
    <>
      <PageIntro eyebrow={t("settings.eyebrow")} title={t("settings.title")} description={t("settings.description")} />
      <form
        className="max-w-lg rounded-2xl border border-slate-200 bg-white p-4 md:p-6"
        onSubmit={(event) => {
          event.preventDefault();
          if (valid) setConfirming(true);
        }}
      >
        <label className="block">
          <FieldLabel>{t("settings.usdRate")}</FieldLabel>
          <input
            type="number"
            min="0"
            step="0.01"
            dir="ltr"
            inputMode="decimal"
            className={inputClass}
            value={rate}
            onChange={(event) => setRate(event.target.value)}
            required
          />
        </label>
        <p className="mt-2 text-xs text-slate-500">
          {t("settings.current")}:{" "}
          <strong className="text-slate-700" dir="ltr">
            {settings.usdRate || t("common.unknown")}
          </strong>
          {" · "}
          {t("settings.usdProductsCount", { count: usdProducts.length })}
        </p>
        <Button type="submit" className="mt-4 w-full min-h-12" disabled={!valid}>
          {t("settings.saveRate")}
        </Button>
      </form>
      {confirming && (
        <ConfirmDialog
          title={t("settings.confirmTitle")}
          message={t("settings.confirmMessage", { rate: parsed, count: usdProducts.length })}
          confirmLabel={t("settings.confirmYes")}
          cancelLabel={t("common.cancel")}
          confirmIcon="check"
          danger={false}
          onConfirm={() => {
            setConfirming(false);
            onChangeUsdRate(parsed);
          }}
          onCancel={() => setConfirming(false)}
        />
      )}
    </>
  );
}
