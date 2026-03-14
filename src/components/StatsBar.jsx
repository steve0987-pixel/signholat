import React from "react";

export default function StatsBar({ reports }) {
  const total = reports.length;
  const verified = reports.filter((r) => r.status === "Verified").length;
  const resolved = reports.filter((r) => r.status === "Resolved").length;
  const urgent = reports.filter((r) => ["Safety issue", "Construction issue"].includes(r.category)).length;

  return (
    <section className="stats-wrap" aria-label="Public statistics">
      <div className="stat-card">
        <span className="stat-label">Total</span>
        <strong>{total}</strong>
      </div>
      <div className="stat-card">
        <span className="stat-label">Verified</span>
        <strong>{verified}</strong>
      </div>
      <div className="stat-card">
        <span className="stat-label">Resolved</span>
        <strong>{resolved}</strong>
      </div>
      <div className="stat-card">
        <span className="stat-label">Urgent</span>
        <strong>{urgent}</strong>
      </div>
    </section>
  );
}
