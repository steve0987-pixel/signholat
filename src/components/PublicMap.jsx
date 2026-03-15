import React, { useEffect, useMemo, useState } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import { resolveGeoAsrLatLng } from "../services/geoasr";
import { parseReportLatLng } from "../utils/enrichReport";
import { shortText } from "../utils/reportUtils";

const SOURCE_LABELS = {
  reports: "Reports",
  maktab44: "Schools",
  bogcha: "Preschools",
  ssv: "Health"
};

const SEVERITY_STYLES = {
  critical: { color: "#E24B4A", radius: 10 },
  high: { color: "#f59e0b", radius: 9 },
  medium: { color: "#eab308", radius: 8 },
  low: { color: "#22c55e", radius: 7 },
  default: { color: "#6b7280", radius: 7 }
};

function getTileConfig() {
  const key = import.meta.env.VITE_MAP_API_KEY || "";
  const template = import.meta.env.VITE_MAP_TILE_URL_TEMPLATE || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
  const attribution =
    import.meta.env.VITE_MAP_ATTRIBUTION ||
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  return {
    url: template.replace("{key}", key),
    attribution,
    usesExternalKey: template.includes("{key}")
  };
}

function MapBridge({ onReady }) {
  const map = useMap();

  useEffect(() => {
    onReady(map);
  }, [map, onReady]);

  return null;
}

function getSeverityStyle(severity) {
  return SEVERITY_STYLES[severity] || SEVERITY_STYLES.default;
}

function getReportTimestamp(report) {
  return new Date(report.createdAt || report.submittedAt || 0).getTime();
}

function formatRelativeTime(dateValue) {
  const timestamp = new Date(dateValue || 0).getTime();
  if (!timestamp) return "";

  const diffMs = timestamp - Date.now();
  const diffMinutes = Math.round(diffMs / (1000 * 60));
  const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (Math.abs(diffMinutes) < 60) return relative.format(diffMinutes, "minute");

  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  if (Math.abs(diffHours) < 24) return relative.format(diffHours, "hour");

  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (Math.abs(diffDays) < 7) return relative.format(diffDays, "day");

  const diffWeeks = Math.round(diffMs / (1000 * 60 * 60 * 24 * 7));
  return relative.format(diffWeeks, "week");
}

function getHotspotSummary(report) {
  return shortText(report.summary || report.description || "No description", 45);
}

function getPopupSummary(report) {
  return shortText(report.summary || report.description || "No description", 60);
}

function getImpactValue(report) {
  const parsed = Number(report?.impact_score);
  return Number.isFinite(parsed) ? parsed : null;
}

function getReportMetaLine(report) {
  const location = report.location || "Location unavailable";
  const relativeTime = formatRelativeTime(report.createdAt || report.submittedAt);

  return relativeTime ? `${location} - ${relativeTime}` : location;
}

function sortByHotspotPriority(left, right) {
  const leftImpact = getImpactValue(left);
  const rightImpact = getImpactValue(right);

  if (leftImpact !== null || rightImpact !== null) {
    if (leftImpact === null) return 1;
    if (rightImpact === null) return -1;
    if (rightImpact !== leftImpact) return rightImpact - leftImpact;
  }

  return getReportTimestamp(right) - getReportTimestamp(left);
}

function getNearbyObjectPopupName(item) {
  return item.obekt_nomi || item.name || "GEOASR object";
}

export default function PublicMap({ reports, geoAsrItems = [], geoAsrData, onReportEnriched, fullHeight = false }) {
  const [mapInstance, setMapInstance] = useState(null);

  const reportMarkers = useMemo(() => {
    return (reports || [])
      .map((report) => {
        const coords = parseReportLatLng(report.location);
        if (!coords) return null;

        return {
          id: report.id,
          latLng: [coords.lat, coords.lng],
          report
        };
      })
      .filter(Boolean);
  }, [reports]);

  const geoAsrMarkers = useMemo(() => {
    return (geoAsrItems || [])
      .map((item, index) => {
        const resolved = resolveGeoAsrLatLng(item);
        if (!resolved) return null;

        return {
          id: `geoasr-${item.__source || "src"}-${item.id || index}`,
          latLng: resolved.latLng,
          approximate: resolved.approximate,
          item
        };
      })
      .filter(Boolean);
  }, [geoAsrItems]);

  const markers = useMemo(() => [...reportMarkers, ...geoAsrMarkers], [geoAsrMarkers, reportMarkers]);

  const hotspots = useMemo(() => {
    return [...reportMarkers]
      .map((marker) => marker.report)
      .sort(sortByHotspotPriority)
      .slice(0, 3);
  }, [reportMarkers]);

  const tileConfig = getTileConfig();

  if (tileConfig.usesExternalKey && !import.meta.env.VITE_MAP_API_KEY) {
    return (
      <section className="panel map-panel">
        <h3>Public Map</h3>
        <p className="map-hint">Add VITE_MAP_API_KEY to .env and restart the app.</p>
      </section>
    );
  }

  const [firstLat, firstLng] = markers.length ? markers[0].latLng : [41.3111, 69.2797];

  return (
    <section className="panel map-panel">
      {hotspots.length ? (
        <div
          style={{
            display: "grid",
            gap: "8px",
            marginBottom: "12px"
          }}
        >
          <div style={{ fontSize: "13px", fontWeight: 700, color: "#132238" }}>Hotspots</div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "8px"
            }}
          >
            {hotspots.map((report) => {
              const coords = parseReportLatLng(report.location);
              const severityStyle = getSeverityStyle(report.severity);
              const impactValue = getImpactValue(report);

              return (
                <button
                  key={report.id}
                  type="button"
                  onClick={() => {
                    if (!coords || !mapInstance) return;
                    mapInstance.flyTo([coords.lat, coords.lng], 15, { duration: 0.8 });
                  }}
                  style={{
                    appearance: "none",
                    border: "1px solid #dbe5f2",
                    borderLeft: `4px solid ${severityStyle.color}`,
                    borderRadius: "12px",
                    background: "#f8fbff",
                    padding: "10px",
                    textAlign: "left",
                    cursor: coords && mapInstance ? "pointer" : "default",
                    display: "grid",
                    gap: "6px"
                  }}
                >
                  <strong style={{ fontSize: "13px", lineHeight: 1.3 }}>{getHotspotSummary(report)}</strong>
                  <span style={{ fontSize: "12px", color: "#355070" }}>
                    {impactValue !== null ? `Impact ${impactValue.toFixed(1)} / 10` : "No impact score"} -{" "}
                    {shortText(report.location || "No address", 26)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="map-header-row">
        <h3>Public Map</h3>
        <span>{markers.length} points</span>
      </div>

      <MapContainer
        center={[firstLat, firstLng]}
        zoom={markers.length ? 13 : 6}
        scrollWheelZoom={false}
        className={`report-map ${fullHeight ? "report-map-large" : ""}`}
      >
        <MapBridge onReady={setMapInstance} />
        <TileLayer attribution={tileConfig.attribution} url={tileConfig.url} />

        {reportMarkers.map((marker) => {
          const severityStyle = getSeverityStyle(marker.report.severity);
          const impactValue = getImpactValue(marker.report);

          return (
            <CircleMarker
              key={marker.id}
              center={marker.latLng}
              pathOptions={{
                color: "white",
                weight: 2,
                fillColor: severityStyle.color,
                fillOpacity: 0.9
              }}
              radius={severityStyle.radius}
            >
              <Popup minWidth={260}>
                <div style={{ display: "grid", gap: "10px" }}>
                  <div style={{ display: "grid", gap: "4px" }}>
                    <strong style={{ fontSize: "14px", lineHeight: 1.35 }}>{getPopupSummary(marker.report)}</strong>
                    <span style={{ fontSize: "12px", color: "#607084" }}>{getReportMetaLine(marker.report)}</span>
                  </div>

                  {marker.report.context ? (
                    <div
                      style={{
                        borderLeft: "4px solid #2563eb",
                        background: "#eff6ff",
                        color: "#1e3a8a",
                        padding: "8px 10px",
                        fontSize: "12px",
                        lineHeight: 1.45
                      }}
                    >
                      {marker.report.context}
                    </div>
                  ) : null}

                  {impactValue !== null ? (
                    <span
                      style={{
                        display: "inline-flex",
                        width: "fit-content",
                        alignItems: "center",
                        borderRadius: "999px",
                        background: `${severityStyle.color}22`,
                        color: severityStyle.color,
                        fontSize: "12px",
                        fontWeight: 700,
                        padding: "6px 10px"
                      }}
                    >
                      {`Impact ${impactValue.toFixed(1)} / 10`}
                    </span>
                  ) : null}

                  {marker.report.severity === "critical" ? (
                    <div style={{ color: "#E24B4A", fontSize: "12px", fontWeight: 700 }}>
                      Requires urgent attention
                    </div>
                  ) : null}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {geoAsrMarkers.map((marker) => (
          <CircleMarker
            key={marker.id}
            center={marker.latLng}
            pathOptions={{
              color: "white",
              weight: 2,
              fillColor: "#6b7280",
              fillOpacity: 0.9
            }}
            radius={7}
          >
            <Popup minWidth={220}>
              <div style={{ display: "grid", gap: "6px" }}>
                <strong style={{ fontSize: "14px", lineHeight: 1.35 }}>{getNearbyObjectPopupName(marker.item)}</strong>
                <span style={{ fontSize: "12px", color: "#607084" }}>
                  {marker.item.viloyat || ""} {marker.item.tuman ? `, ${marker.item.tuman}` : ""}
                </span>
                <span style={{ fontSize: "12px", color: "#355070" }}>
                  Source: {SOURCE_LABELS[marker.item.__source] || marker.item.__source || "GEOASR"}
                </span>
                {marker.approximate ? (
                  <span style={{ fontSize: "12px", color: "#d97706" }}>Approximate coordinates</span>
                ) : null}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      {!markers.length ? <p className="map-hint">No filtered points with coordinates yet.</p> : null}
    </section>
  );
}
