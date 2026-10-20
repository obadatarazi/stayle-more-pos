import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { applyDocumentLang, readStoredLang } from "./i18n/config";
import I18nProvider from "./i18n/I18nProvider";
import "./index.css";

const initialLang = readStoredLang();
applyDocumentLang(initialLang);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nProvider initialLang={initialLang}>
      <App />
    </I18nProvider>
  </StrictMode>,
);
