import { createPeerActionForReport } from "../../../lib/backend/community.js";

function normalizeRouteParam(value) {
  if (Array.isArray(value)) return String(value[0] || "").trim();
  return String(value || "").trim();
}

function safeBody(value) {
  if (!value) return {};
  if (typeof value === "object") return value;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const reportId = normalizeRouteParam(req.query?.id);
  const payload = safeBody(req.body);
  if (payload === null) {
    res.status(400).json({ error: "Invalid JSON body" });
    return;
  }

  const result = await createPeerActionForReport(reportId, payload, process.env);
  if (!result.ok) {
    res.status(result.status || 500).json({ error: result.error || "Failed to create peer action" });
    return;
  }

  res.setHeader("Cache-Control", "no-store");
  res.status(201).json(result.data);
}
