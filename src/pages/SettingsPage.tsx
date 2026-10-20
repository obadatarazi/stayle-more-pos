import { useEffect, useState } from "react";
import Button from "@/components/Button";
import ConfirmDialog from "@/components/ConfirmDialog";
import FieldLabel, { inputClass } from "@/components/FieldLabel";
import Icon from "@/components/Icon";
import PageIntro from "@/components/PageIntro";
import { SyncDot, useLastSyncTime, useSyncLabels } from "@/components/SyncStatus";
import type { SyncStatus } from "@/hooks/useCloudSync";
import { useI18n } from "@/i18n/useI18n";
import {
  disableNotifications,
  enableNotifications,
  showSystemNotification,
  useNotificationState,
} from "@/lib/notifications";
import type { Product, StoreSettings } from "@/types/store";

type SyncInfo = {
  status: SyncStatus;
  pending: number;
  lastSyncedAt: number | null;
  cloudEnabled: boolean;
  onSyncNow: () => void;
};

function SyncCard({ sync }: { sync: SyncInfo }) {
  const { t } = useI18n();
  const { long } = useSyncLabels(sync.status, sync.pending);
  const lastSync = useLastSyncTime(sync.lastSyncedAt);
  const busy = sync.status === "saving" || sync.status === "loading";
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 md:p-6">
      <h2 className="text-base font-bold text-slate-900">{t("settings.syncTitle")}</h2>
      <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
        <SyncDot status={sync.status} />
        {long}
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-xl bg-slate-50 p-3">
          <dt className="text-slate-500">{t("settings.pendingEdits")}</dt>
          <dd className="mt-1 text-lg font-bold text-slate-900" dir="ltr">
            {sync.pending}
          </dd>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <dt className="text-slate-500">{t("settings.lastSyncLabel")}</dt>
          <dd className="mt-1 text-sm font-semibold text-slate-800">{lastSync}</dd>
        </div>
      </dl>
      <p className="mt-3 text-xs leading-5 text-slate-500">{t("sync.offlineHint")}</p>
      <Button
        type="button"
        variant="secondary"
        className="mt-4 w-full min-h-12"
        disabled={!sync.cloudEnabled || busy || sync.status === "offline"}
        onClick={sync.onSyncNow}
      >
        <Icon name="exchange" className="size-4" />
        {t("sync.syncNow")}
      </Button>
    </section>
  );
}

function NotificationsCard() {
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
    <section className="rounded-2xl border border-slate-200 bg-white p-4 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-slate-900">{t("settings.notifyTitle")}</h2>
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
    </section>
  );
}

export default function SettingsPage({
  settings,
  products,
  onChangeUsdRate,
  sync,
}: {
  settings: StoreSettings;
  products: Product[];
  onChangeUsdRate: (usdRate: number) => void;
  sync: SyncInfo;
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
      <div className="grid max-w-lg gap-4">
        <form
          className="rounded-2xl border border-slate-200 bg-white p-4 md:p-6"
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
        {sync.cloudEnabled && <SyncCard sync={sync} />}
        <NotificationsCard />
      </div>
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
