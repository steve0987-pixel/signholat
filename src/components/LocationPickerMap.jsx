import React, { useMemo } from "react";
import { CircleMarker, MapContainer, TileLayer, useMapEvents } from "react-leaflet";
import { parseReportLatLng } from "../utils/enrichReport";

function getTileConfig() {
  const key = import.meta.env.VITE_MAP_API_KEY || "";
  const template = import.meta.env.VITE_MAP_TILE_URL_TEMPLATE || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
  const attribution =
    import.meta.env.VITE_MAP_ATTRIBUTION ||
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  return {
    url: template.replace("{key}", key),
    attribution
  };
}

function LocationPinSelector({ onSelect }) {
  useMapEvents({
    click(event) {
      const lat = Number(event.latlng?.lat);
      const lng = Number(event.latlng?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      onSelect?.(lat, lng);
    }
  });

  return null;
}

export default function LocationPickerMap({ locationValue, onSelect, disabled = false }) {
  const tileConfig = getTileConfig();

  const selected = useMemo(() => {
    const parsed = parseReportLatLng(locationValue);
    if (!parsed) return null;
    return [parsed.lat, parsed.lng];
  }, [locationValue]);

  const center = selected || [41.3111, 69.2797];

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ fontSize: 12, color: "#52657b" }}>
        Tap map to set location pin
      </div>
      <MapContainer
        center={center}
        zoom={selected ? 15 : 12}
        scrollWheelZoom={false}
        style={{
          height: 220,
          borderRadius: 14,
          border: "1px solid #dbe5f2"
        }}
      >
        <TileLayer attribution={tileConfig.attribution} url={tileConfig.url} />
        {!disabled ? <LocationPinSelector onSelect={onSelect} /> : null}
        {selected ? (
          <CircleMarker
            center={selected}
            radius={9}
            pathOptions={{
              color: "white",
              weight: 2,
              fillColor: "#0f6b8f",
              fillOpacity: 0.9
            }}
          />
        ) : null}
      </MapContainer>
    </div>
  );
}
