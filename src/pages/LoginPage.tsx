import { FormEvent, useState } from "react";
import BrandLogo from "@/components/BrandLogo";
import Button from "@/components/Button";
import FieldLabel, { inputClass } from "@/components/FieldLabel";
import Icon from "@/components/Icon";
import { site, storageKeys } from "@/config/site";
import { accounts } from "@/data/demo";
import { useI18n } from "@/i18n/useI18n";
import { NetworkError, apiLogin, isCloudEnabled, setApiToken } from "@/lib/api";
import type { AuthUser } from "@/types/store";

export default function LoginPage({
  message = "",
  onSuccess,
}: {
  /** Why the user landed here, e.g. the session expired while edits were waiting. */
  message?: string;
  onSuccess: (user: AuthUser) => void;
}) {
  const { t } = useI18n();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isCloudEnabled && !import.meta.env.DEV) {
      setError(t("login.serverMissing"));
      return;
    }

    setLoading(true);
    setError("");
    try {
      let profile: { username: string; displayName: string; shortName: string } | undefined;
      if (isCloudEnabled) {
        try {
          profile = await apiLogin(username.trim(), password);
        } catch (err) {
          if (err instanceof Error && /credentials|required/i.test(err.message)) {
            setError(t("login.invalid"));
            return;
          }
          throw err;
        }
      } else {
        setApiToken(null);
        profile = accounts.find((item) => item.username === username.trim());
        if (!profile) {
          setError(t("login.invalid"));
          return;
        }
      }

      const user: AuthUser = {
        username: profile.username,
        displayName: profile.displayName,
        shortName: profile.shortName,
        at: Date.now(),
      };
      localStorage.setItem(storageKeys.auth, JSON.stringify(user));
      sessionStorage.removeItem(storageKeys.auth);
      onSuccess(user);
    } catch (err) {
      console.error(err);
      setError(err instanceof NetworkError ? t("login.offline") : t("login.connectionError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-brand px-4" dir="rtl" lang="ar">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,#ffffff_0%,transparent_45%),radial-gradient(circle_at_80%_80%,#f6e8ea_0%,transparent_40%)]" />
      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <BrandLogo className="mx-auto mb-4 h-28 w-auto rounded-3xl object-contain shadow-xl shadow-[#8b5560]/15" />
          <h1 className="text-2xl font-bold tracking-tight text-navy">{t("brand.name")}</h1>
          <p className="mt-2 text-sm text-slate-500">{t("login.subtitle")}</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-3xl border border-coral-border bg-white p-6 shadow-xl shadow-[#8b5560]/10 md:p-8">
          <div className="mb-6 flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-brand text-navy">
              <Icon name="lock" />
            </span>
            <div>
              <h2 className="font-bold text-slate-900">{t("login.formTitle")}</h2>
              <p className="text-xs text-slate-500">{t("login.formHint")}</p>
            </div>
          </div>

          {message && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm font-medium text-amber-800">
              <Icon name="warning" className="mt-0.5 size-4 shrink-0" />
              {message}
            </div>
          )}

          <div className="space-y-4">
            <label className="block">
              <FieldLabel>{t("login.username")}</FieldLabel>
              <div className="relative">
                <Icon name="user" className="absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  className={`${inputClass} pr-10`}
                  value={username}
                  onChange={(event) => {
                    setUsername(event.target.value);
                    setError("");
                  }}
                  placeholder={t("login.usernamePlaceholder")}
                  autoComplete="username"
                  required
                />
              </div>
            </label>
            <label className="block">
              <FieldLabel>{t("login.password")}</FieldLabel>
              <div className="relative">
                <Icon name="lock" className="absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  className={`${inputClass} pr-10 pl-16`}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError("");
                  }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-navy"
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? t("common.hide") : t("common.show")}
                </button>
              </div>
            </label>
          </div>

          {error && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-coral-border bg-coral-soft px-3.5 py-3 text-sm font-medium text-coral-dark">
              <Icon name="warning" className="size-4 shrink-0" />
              {error}
            </div>
          )}

          <Button type="submit" className="mt-6 w-full" disabled={loading}>
            <Icon name="lock" className="size-4" />
            {loading ? t("login.checking") : t("login.submit")}
          </Button>
        </form>
      </div>
    </div>
  );
}
