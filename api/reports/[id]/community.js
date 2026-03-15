import { getReportCommunityActivity } from "../../../lib/backend/community.js";

function normalizeRouteParam(value) {
  if (Array.isArray(value)) return String(value[0] || "").trim();
  return String(value || "").trim();
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const reportId = normalizeRouteParam(req.query?.id);
  const result = await getReportCommunityActivity(reportId, process.env);

  if (!result.ok) {
    res.status(result.status || 500).json({ error: result.error || "Failed to load report community activity" });
    return;
  }

  res.setHeader("Cache-Control", "no-store");
  res.status(200).json(result.data);
}
