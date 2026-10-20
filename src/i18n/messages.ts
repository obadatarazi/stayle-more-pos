import ar from "@/locales/ar.json";
import en from "@/locales/en.json";
import type { Lang } from "./config";

export type Messages = typeof ar;

const catalogs: Record<Lang, Messages> = { ar, en };

export function getMessages(lang: Lang): Messages {
  return catalogs[lang] ?? catalogs.ar;
}

function getByPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

export function translate(messages: Messages, key: string, vars?: Record<string, string | number>): string {
  const value = getByPath(messages, key);
  let text = typeof value === "string" ? value : key;
  if (vars) {
    for (const [name, replacement] of Object.entries(vars)) {
      text = text.split(`{${name}}`).join(String(replacement));
    }
  }
  return text;
}

export function translateMap(messages: Messages, key: string): Record<string, string> | undefined {
  const value = getByPath(messages, key);
  if (!value || typeof value !== "object") return undefined;
  return value as Record<string, string>;
}
