import React from "react";
import { useI18n } from "../i18n/LanguageProvider";

const tabs = [
  { key: "submission", labelKey: "nav.submission", icon: "S" },
  { key: "dashboard", labelKey: "nav.dashboard", icon: "M" },
  { key: "profile", labelKey: "nav.profile", icon: "P" }
];

export default function BottomNav({ activeTab, onChange }) {
  const { t } = useI18n();

  return (
    <nav className="bottom-nav">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            className={`bottom-nav-item ${isActive ? "is-active" : ""}`}
            onClick={() => onChange(tab.key)}
          >
            <span className="nav-icon" aria-hidden="true">
              {tab.icon}
            </span>
            <span className="nav-label">{t(tab.labelKey)}</span>
          </button>
        );
      })}
    </nav>
  );
}
