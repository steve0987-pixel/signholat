function toRadians(value) {
  return (value * Math.PI) / 180;
}

export function calculateDistanceMeters(lat1, lng1, lat2, lng2) {
  const earthRadius = 6371000;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function pickCoordinate(item, keys) {
  const value = keys.map((key) => item?.[key]).find((entry) => entry !== undefined && entry !== null && entry !== "");
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function extractCoordinates(item) {
  const lat = pickCoordinate(item, ["lat", "latitude", "LAT"]);
  const lng = pickCoordinate(item, ["lng", "longitude", "LNG"]);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  return { lat, lng };
}

function getObjectName(item) {
  return item?.obekt_nomi || item?.name || item?.title || item?.nomi || item?.muassasa_nomi || "Unknown object";
}

function getObjectCapacity(item) {
  return (
    item?.capacity ||
    item?.quvvat ||
    item?.sigim ||
    item?.oquvchi_soni ||
    item?.bola_soni ||
    item?.places ||
    item?.person_count ||
    null
  );
}

export function parseReportLatLng(location) {
  if (!location || typeof location !== "string") return null;

  const match = location.trim().match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (!match) return null;

  const lat = Number(match[1]);
  const lng = Number(match[2]);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  return { lat, lng };
}

export function findNearbyObjects(reportLat, reportLng, geoasrData, radiusMeters = 500) {
  if (!Number.isFinite(reportLat) || !Number.isFinite(reportLng) || !geoasrData) return [];

  return Object.entries(geoasrData)
    .flatMap(([source, items]) => {
      if (!Array.isArray(items)) return [];

      return items
        .map((item) => {
          const coords = extractCoordinates(item);
          if (!coords) return null;

          const distance = calculateDistanceMeters(reportLat, reportLng, coords.lat, coords.lng);
          if (distance > radiusMeters) return null;

          return {
            source,
            name: getObjectName(item),
            distance,
            capacity: getObjectCapacity(item)
          };
        })
        .filter(Boolean);
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 5)
    .map((item) => ({
      ...item,
      distance: Math.round(item.distance)
    }));
}

export function findNearbyReports(reportLat, reportLng, reports = [], radiusMeters = 350) {
  if (!Number.isFinite(reportLat) || !Number.isFinite(reportLng) || !Array.isArray(reports)) return [];

  return reports
    .map((report) => {
      const coords = parseReportLatLng(report.location);
      if (!coords) return null;

      const distance = calculateDistanceMeters(reportLat, reportLng, coords.lat, coords.lng);
      if (distance > radiusMeters) return null;

      return {
        ...report,
        distance: Math.round(distance)
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 6);
}
