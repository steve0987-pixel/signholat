import { findNearbyObjects, parseReportLatLng } from "./enrichReport";

function isValidCoordinate(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function toCoordinatePair(match) {
  if (!match || match.length < 3) return null;

  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!isValidCoordinate(lat, lng)) return null;

  return { lat, lng };
}

function decodeSafe(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function parseCoordinatesFromText(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const direct = parseReportLatLng(raw);
  if (direct) return direct;

  const patterns = [
    /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/i,
    /[?&](?:q|query|ll|destination)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/i,
    /(?:^|[^0-9-])(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)(?:[^0-9.]|$)/i
  ];

  for (const pattern of patterns) {
    const coords = toCoordinatePair(raw.match(pattern));
    if (coords) return coords;

    const decoded = decodeSafe(raw);
    const decodedCoords = toCoordinatePair(decoded.match(pattern));
    if (decodedCoords) return decodedCoords;
  }

  return null;
}

export function extractCoordinatesFromLocationInput(locationValue) {
  return parseCoordinatesFromText(locationValue);
}

export function normalizeLocationInput(locationValue) {
  const raw = String(locationValue || "").trim();
  if (!raw) return "";

  const coords = extractCoordinatesFromLocationInput(raw);
  if (!coords) return raw;

  return `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
}

function clipText(value, maxLength = 84) {
  const cleaned = String(value || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return "";
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, Math.max(0, maxLength - 1)).trim()}...`;
}

function isNumericOnlyValue(value) {
  return /^-?\d+(?:\.\d+)?$/.test(String(value || "").trim());
}

function isCoordinateOnlyText(value) {
  return /^-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?$/.test(String(value || "").trim());
}

function extractMapQueryLabel(locationValue) {
  const raw = String(locationValue || "").trim();
  if (!raw) return "";

  try {
    const parsed = new URL(raw);
    const candidateKeys = ["query", "q", "destination", "daddr"];

    for (const key of candidateKeys) {
      const value = parsed.searchParams.get(key);
      if (!value) continue;
      const cleaned = clipText(decodeSafe(value), 84);
      if (cleaned && !extractCoordinatesFromLocationInput(cleaned)) {
        return cleaned;
      }
    }

    const path = decodeSafe(parsed.pathname || "")
      .split("/")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .pop();

    if (path && !extractCoordinatesFromLocationInput(path)) {
      return clipText(path.replace(/\+/g, " "), 84);
    }
  } catch {
    return "";
  }

  return "";
}

function extractAddressLabel(locationValue) {
  const raw = String(locationValue || "").trim();
  if (!raw) return "";
  if (isCoordinateOnlyText(raw)) return "";

  const firstChunk = raw.split(",").map((entry) => entry.trim()).find(Boolean) || "";
  if (!firstChunk) return "";
  if (firstChunk.length < 4) return "";
  if (isNumericOnlyValue(firstChunk)) return "";
  if (firstChunk.startsWith("http://") || firstChunk.startsWith("https://")) return "";
  if (extractCoordinatesFromLocationInput(firstChunk)) return "";

  return clipText(firstChunk, 84);
}

export function suggestPlaceNameFromLocation(locationValue, geoAsrData) {
  const rawLocation = String(locationValue || "").trim();
  if (!rawLocation) return "";
  const normalizedLocation = normalizeLocationInput(rawLocation);
  if (!normalizedLocation) return "";

  const coords = extractCoordinatesFromLocationInput(normalizedLocation);
  if (coords) {
    const nearby = findNearbyObjects(coords.lat, coords.lng, geoAsrData, 900);
    if (nearby.length > 0) {
      return clipText(nearby[0].name, 84);
    }

    // If user provided only coordinates and no nearby object was found,
    // do not use numeric coordinates as an object name.
    if (isCoordinateOnlyText(rawLocation) || isCoordinateOnlyText(normalizedLocation)) {
      return "";
    }
  }

  const fromMapQuery = extractMapQueryLabel(rawLocation);
  if (fromMapQuery) return fromMapQuery;

  return extractAddressLabel(rawLocation);
}

export async function reverseGeocodePlaceName(lat, lng, language = "ru") {
  if (!isValidCoordinate(lat, lng)) return "";

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=${language},en,uz`
    );
    if (!response.ok) return "";

    const payload = await response.json();
    const address = payload?.address || {};
    const preferred =
      address.amenity ||
      address.building ||
      address.school ||
      address.hospital ||
      address.road ||
      address.neighbourhood ||
      address.suburb ||
      payload?.name ||
      "";

    const bestLabel = clipText(preferred || payload?.display_name || "", 84);
    if (!bestLabel || isNumericOnlyValue(bestLabel) || isCoordinateOnlyText(bestLabel)) {
      return "";
    }

    return bestLabel;
  } catch {
    return "";
  }
}
