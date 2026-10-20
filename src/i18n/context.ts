import { createContext } from "react";
import type { Lang } from "./config";
import type { Messages } from "./messages";

export type I18nContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  tm: (key: string) => Record<string, string> | undefined;
  messages: Messages;
};

export const I18nContext = createContext<I18nContextValue | null>(null);
