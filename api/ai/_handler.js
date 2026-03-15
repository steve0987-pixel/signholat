import { resolveAiRoute } from "../../lib/ai/http.js";

function safeParseBody(body) {
  if (!body) return {};
  if (typeof body === "object") return body;

  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

export function createVercelAiHandler(routeName) {
  return async function handler(req, res) {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const payload = safeParseBody(req.body);
    if (payload === null) {
      res.status(400).json({ error: "Invalid JSON body" });
      return;
    }

    try {
      const result = await resolveAiRoute(routeName, payload, { env: process.env });
      res.setHeader("Cache-Control", "no-store");
      res.status(200).json(result);
    } catch {
      res.status(500).json({ error: "AI route failed" });
    }
  };
}
