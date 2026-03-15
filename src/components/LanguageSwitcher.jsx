import React from "react";
import { useI18n } from "../i18n/LanguageProvider";

export default function LanguageSwitcher() {
  const { language, languages, setLanguage, t } = useI18n();

  return (
    <div className="language-switcher" aria-label={t("languageSwitcher.ariaLabel")}>
      <span className="language-switcher-label">{t("languageSwitcher.label")}</span>
      <div className="language-chip-row">
        {languages.map((item) => (
          <button
            key={item.code}
            type="button"
            className={`language-chip ${language === item.code ? "is-active" : ""}`}
            onClick={() => setLanguage(item.code)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
