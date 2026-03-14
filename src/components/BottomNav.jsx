import React from "react";

const tabs = [
  { key: "submission", label: "Submission", icon: "+" },
  { key: "dashboard", label: "Dashboard", icon: "#" },
  { key: "profile", label: "Profile", icon: "o" }
];

export default function BottomNav({ activeTab, onChange }) {
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
            <span className="nav-label">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
