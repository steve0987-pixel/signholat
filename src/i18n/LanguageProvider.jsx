import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { LOCALE_BY_LANGUAGE, STORAGE_LANGUAGE_KEY, SUPPORTED_LANGUAGES, translations } from "./translations";

const LanguageContext = createContext(null);
const CATEGORY_LABEL_OVERRIDES = {
  ru: {
    "School infrastructure": "Школьная инфраструктура",
    "Clinic infrastructure": "Инфраструктура клиник",
    "Drinking water supply": "Питьевое водоснабжение",
    "Internal roads": "Внутренние дороги",
    "Sanitation and waste": "Санитария и отходы",
    "Street lighting": "Уличное освещение",
    "Public safety": "Общественная безопасность"
  }
};

const STATUS_LABEL_OVERRIDES = {
  ru: {
    Submitted: "Принято",
    "In Progress": "В работе"
  }
};

function normalizeLanguageCode(value) {
  const baseCode = String(value || "")
    .trim()
    .toLowerCase()
    .split(/[-_]/)[0];

  return SUPPORTED_LANGUAGES.some((item) => item.code === baseCode) ? baseCode : "en";
}

function getNestedValue(record, path) {
  return path.split(".").reduce((current, segment) => current?.[segment], record);
}

function applyVariables(template, variables = {}) {
  return String(template).replace(/\{(\w+)\}/g, (_, key) => {
    return variables[key] ?? `{${key}}`;
  });
}

function detectInitialLanguage() {
  if (typeof window === "undefined") return "en";

  const stored = window.localStorage.getItem(STORAGE_LANGUAGE_KEY);
  if (stored) return normalizeLanguageCode(stored);

  const telegramLanguage = window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code;
  const browserLanguage = window.navigator?.language;

  return normalizeLanguageCode(telegramLanguage || browserLanguage || "en");
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(detectInitialLanguage);

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(STORAGE_LANGUAGE_KEY, language);
    document.documentElement.lang = LOCALE_BY_LANGUAGE[language] || "en-US";
  }, [language]);

  const value = useMemo(() => {
    const currentTranslations = translations[language] || translations.en;
    const fallbackTranslations = translations.en;

    const t = (path, variables) => {
      const template = getNestedValue(currentTranslations, path) ?? getNestedValue(fallbackTranslations, path) ?? path;
      return applyVariables(template, variables);
    };

    const getMappedLabel = (section, valueToTranslate) => {
      return currentTranslations?.[section]?.[valueToTranslate] ?? fallbackTranslations?.[section]?.[valueToTranslate] ?? valueToTranslate;
    };

    return {
      language,
      locale: LOCALE_BY_LANGUAGE[language] || "en-US",
      languages: SUPPORTED_LANGUAGES,
      setLanguage: (nextLanguage) => setLanguage(normalizeLanguageCode(nextLanguage)),
      t,
      getCategoryLabel: (category) => CATEGORY_LABEL_OVERRIDES[language]?.[category] || getMappedLabel("categories", category),
      getStatusLabel: (status) => STATUS_LABEL_OVERRIDES[language]?.[status] || getMappedLabel("statuses", status),
      getSourceLabel: (source) => getMappedLabel("sources", source),
      getRankLabel: (rankId) => getMappedLabel("ranks", rankId),
      getBadgeLabel: (badgeId) => getMappedLabel("badges", badgeId)
    };
  }, [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useI18n() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useI18n must be used within LanguageProvider");
  }

  return context;
}
