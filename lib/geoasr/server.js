const SOURCE_ENDPOINTS = {
  maktab44: "https://duasr.uz/api4/maktab44",
  bogcha: "https://duasr.uz/api4/bogcha",
  ssv: "https://duasr.uz/api4/ssv"
};

function getSourceUrl(sourceKey, env = process.env) {
  switch (sourceKey) {
    case "maktab44":
      return env.GEOASR_MAKTAB44_URL || SOURCE_ENDPOINTS.maktab44;
    case "bogcha":
      return env.GEOASR_BOGCHA_URL || SOURCE_ENDPOINTS.bogcha;
    case "ssv":
      return env.GEOASR_SSV_URL || SOURCE_ENDPOINTS.ssv;
    default:
      return "";
  }
}

function getHeaders(token) {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
    "User-Agent": "RealHolatPulse/1.0"
  };
}

export async function fetchGeoAsrSource(sourceKey, env = process.env) {
  const token = env.GEOASR_BEARER_TOKEN || "";
  const url = getSourceUrl(sourceKey, env);

  if (!url) {
    return {
      ok: false,
      status: 400,
      error: "Unknown GEOASR source"
    };
  }

  if (!token) {
    return {
      ok: false,
      status: 500,
      error: "Missing GEOASR_BEARER_TOKEN"
    };
  }

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: getHeaders(token)
    });

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: `Upstream GEOASR request failed (${response.status})`
      };
    }

    const payload = await response.json();
    return {
      ok: true,
      status: 200,
      payload
    };
  } catch (error) {
    return {
      ok: false,
      status: 502,
      error: error?.message || "GEOASR request failed"
    };
  }
}

export function createGeoAsrNetlifyHandler(sourceKey) {
  return async function handler(event) {
    if (event.httpMethod !== "GET") {
      return {
        statusCode: 405,
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ error: "Method not allowed" })
      };
    }

    const result = await fetchGeoAsrSource(sourceKey, process.env);
    if (!result.ok) {
      return {
        statusCode: result.status || 500,
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ error: result.error || "GEOASR request failed" })
      };
    }

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
      },
      body: JSON.stringify(result.payload)
    };
  };
}
