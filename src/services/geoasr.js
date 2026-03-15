function getApiConfig() {
  return {
    endpoints: [
      {
        key: "maktab44",
        url: "/api/geoasr/maktab44"
      },
      {
        key: "bogcha",
        url: "/api/geoasr/bogcha"
      },
      {
        key: "ssv",
        url: "/api/geoasr/ssv"
      }
    ]
  };
}

function maskToken(token) {
  if (!token) return "";
  if (token.length <= 12) return "***hidden***";
  return `${token.slice(0, 6)}...${token.slice(-6)}`;
}

function normalizeArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, options = {}, retries = 2) {
  let lastResponse = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const response = await fetch(url, options);
    lastResponse = response;
    if (response.ok) return response;

    const retryable = response.status >= 500;
    if (!retryable || attempt === retries) {
      return response;
    }

    await sleep(250 * (attempt + 1));
  }

  return lastResponse;
}

const REGION_CENTERS = [
  { match: ["toshkent sh", "tashkent city"], lat: 41.3111, lng: 69.2797 },
  { match: ["toshkent viloyati", "tashkent"], lat: 41.0167, lng: 69.0 },
  { match: ["samarqand"], lat: 39.6542, lng: 66.9597 },
  { match: ["buxoro", "bukhara"], lat: 39.7681, lng: 64.4556 },
  { match: ["navoiy", "navoi"], lat: 40.1039, lng: 65.3689 },
  { match: ["qashqadaryo", "kashkadarya"], lat: 38.86, lng: 65.79 },
  { match: ["surxondaryo", "surkhandarya"], lat: 37.2242, lng: 67.2783 },
  { match: ["jizzax", "jizzakh"], lat: 40.1158, lng: 67.8422 },
  { match: ["sirdaryo", "syrdarya"], lat: 40.85, lng: 68.66 },
  { match: ["farg", "fergana"], lat: 40.3864, lng: 71.7864 },
  { match: ["namangan"], lat: 41.0011, lng: 71.6726 },
  { match: ["andijon", "andijan"], lat: 40.7821, lng: 72.3442 },
  { match: ["xorazm", "khorezm"], lat: 41.5534, lng: 60.6317 },
  { match: ["qoraqalpog", "karakalpak"], lat: 42.4611, lng: 59.6166 }
];

function hashJitter(seed = "") {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const normalized = (Math.abs(hash) % 1000) / 1000;
  return (normalized - 0.5) * 0.2;
}

function resolveApproxLatLng(item) {
  const region = String(item?.viloyat || "").toLowerCase();
  if (!region) return null;

  const center = REGION_CENTERS.find((entry) => entry.match.some((m) => region.includes(m)));
  if (!center) return null;

  const seed = `${item?.id || ""}-${item?.tuman || ""}-${item?.obekt_nomi || ""}`;
  const j1 = hashJitter(seed);
  const j2 = hashJitter(`${seed}-x`);
  return [center.lat + j1, center.lng + j2];
}

export function extractLatLng(item) {
  const latCandidates = [item?.lat, item?.latitude, item?.geo_lat, item?.y];
  const lngCandidates = [item?.lng, item?.lon, item?.long, item?.longitude, item?.geo_lng, item?.x];

  const lat = latCandidates.find((v) => v !== undefined && v !== null && v !== "");
  const lng = lngCandidates.find((v) => v !== undefined && v !== null && v !== "");

  const latNum = Number(lat);
  const lngNum = Number(lng);
  if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) return null;
  if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) return null;

  return [latNum, lngNum];
}

export function resolveGeoAsrLatLng(item) {
  const exact = extractLatLng(item);
  if (exact) return { latLng: exact, approximate: false };

  const approximate = resolveApproxLatLng(item);
  if (approximate) return { latLng: approximate, approximate: true };

  return null;
}

export async function fetchGeoAsrData() {
  const { endpoints } = getApiConfig();
  const headers = {};

  const results = await Promise.all(
    endpoints.map(async (source) => {
      try {
        const response = await fetchWithRetry(source.url, { headers }, 2);
        if (!response.ok) {
          let errorText = `${source.key}: ${response.status}`;

          try {
            const payload = await response.json();
            if (payload?.error) {
              errorText = `${source.key}: ${payload.error}`;
            }
          } catch {
            // ignore invalid JSON responses
          }

          return {
            source: source.key,
            ok: false,
            status: response.status,
            count: 0,
            records: [],
            error: errorText
          };
        }

        const json = await response.json();
        const records = normalizeArray(json).map((item) => ({ ...item, __source: source.key }));
        return {
          source: source.key,
          ok: true,
          status: response.status,
          count: records.length,
          records,
          error: ""
        };
      } catch (error) {
        return {
          source: source.key,
          ok: false,
          status: 0,
          count: 0,
          records: [],
          error: `${source.key}: ${error?.message || "Network error"}`
        };
      }
    })
  );

  const sources = [];
  const items = [];
  const errors = [];

  results.forEach((result) => {
    sources.push({ source: result.source, count: result.count, ok: result.ok, status: result.status });
    if (result.ok) {
      items.push(...result.records);
    }
    if (result.error) {
      errors.push(result.error);
    }
  });

  return {
    enabled: true,
    apiKeyInfo: {
      configured: !errors.some((entry) => String(entry).includes("Missing GEOASR_BEARER_TOKEN")),
      masked: "server-side-only"
    },
    sources,
    items,
    error: errors.length ? errors.join("; ") : ""
  };
}
