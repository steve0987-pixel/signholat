import React from "react";
import { useI18n } from "../i18n/LanguageProvider";

export default function StatsBar({ reports }) {
  const { t } = useI18n();
  const total = reports.length;
  const verified = reports.filter((r) => r.status === "Verified").length;
  const resolved = reports.filter((r) => r.status === "Resolved").length;
  const urgent = reports.filter((r) => ["Safety issue", "Construction issue"].includes(r.category)).length;

  return (
    <section className="stats-wrap" aria-label={t("stats.ariaLabel")}>
      <div className="stat-card">
        <span className="stat-label">{t("stats.total")}</span>
        <strong>{total}</strong>
      </div>
      <div className="stat-card">
        <span className="stat-label">{t("stats.verified")}</span>
        <strong>{verified}</strong>
      </div>
      <div className="stat-card">
        <span className="stat-label">{t("stats.resolved")}</span>
        <strong>{resolved}</strong>
      </div>
      <div className="stat-card">
        <span className="stat-label">{t("stats.urgent")}</span>
        <strong>{urgent}</strong>
      </div>
    </section>
  );
}
