import React from "react";

export default function GeoAsrPanel({ loading, geoAsr }) {
  if (loading) {
    return (
      <section className="panel geoasr-panel">
        <h3>GEOASR Registry</h3>
        <p className="map-hint">Loading organizer datasets...</p>
      </section>
    );
  }

  if (!geoAsr?.enabled) {
    return (
      <section className="panel geoasr-panel">
        <h3>GEOASR Registry</h3>
        <p className="map-hint">Add VITE_GEOASR_BEARER_TOKEN in .env to enable organizer data.</p>
      </section>
    );
  }

  return (
    <section className="panel geoasr-panel">
      <div className="map-header-row">
        <h3>GEOASR Registry</h3>
        <span>{geoAsr.items.length} records</span>
      </div>
      <p className="geoasr-key-line">
        API key: {geoAsr?.apiKeyInfo?.configured ? `connected (${geoAsr.apiKeyInfo.masked})` : "not configured"}
      </p>
      <div className="geoasr-grid">
        {geoAsr.sources.map((s) => (
          <article key={s.source} className={`geoasr-chip ${s.ok ? "ok" : "fail"}`}>
            <strong>{s.count}</strong>
            <span>
              {s.source} {s.ok ? "(OK)" : `(ERR ${s.status || "N/A"})`}
            </span>
          </article>
        ))}
      </div>
      {geoAsr.error ? <p className="error-text">{geoAsr.error}</p> : null}
    </section>
  );
}
