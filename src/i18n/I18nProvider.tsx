import { ReactNode, useMemo, useState } from "react";
import { LANG_LOCKED, applyDocumentLang, storeLang, type Lang } from "./config";
import { I18nContext } from "./context";
import { getMessages, translate, translateMap } from "./messages";

export default function I18nProvider({
  initialLang,
  children,
}: {
  initialLang: Lang;
  children: ReactNode;
}) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const messages = getMessages(lang);

  const value = useMemo(
    () => ({
      lang,
      setLang: (next: Lang) => {
        if (LANG_LOCKED) return;
        setLangState(next);
        storeLang(next);
        applyDocumentLang(next);
      },
      t: (key: string, vars?: Record<string, string | number>) => translate(messages, key, vars),
      tm: (key: string) => translateMap(messages, key),
      messages,
    }),
    [lang, messages],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
