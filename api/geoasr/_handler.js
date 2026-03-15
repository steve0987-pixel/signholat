import { fetchGeoAsrSource } from "../../lib/geoasr/server.js";

export function createVercelGeoAsrHandler(sourceKey) {
  return async function handler(req, res) {
    if (req.method !== "GET") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const result = await fetchGeoAsrSource(sourceKey, process.env);
    if (!result.ok) {
      res.status(result.status || 500).json({ error: result.error || "GEOASR request failed" });
      return;
    }

    res.setHeader("Cache-Control", "no-store");
    res.status(200).json(result.payload);
  };
}
