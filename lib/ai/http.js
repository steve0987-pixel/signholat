import { runDuplicateCheck, runPriorityExplanation, runTitleSummary } from "./service.js";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store"
};

function safeParseJson(value) {
  if (!value) return {};

  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return null;
  }
}

export async function resolveAiRoute(routeName, payload, options = {}) {
  switch (routeName) {
    case "duplicate-check":
      return runDuplicateCheck(payload, options);
    case "title-summary":
      return runTitleSummary(payload, options);
    case "priority-explanation":
      return runPriorityExplanation(payload, options);
    default:
      throw new Error(`Unknown AI route: ${routeName}`);
  }
}

export function jsonResponse(statusCode, payload) {
  return {
    statusCode,
    headers: JSON_HEADERS,
    body: JSON.stringify(payload)
  };
}

export function createNetlifyHandler(routeName) {
  return async function handler(event) {
    if (event.httpMethod !== "POST") {
      return jsonResponse(405, { error: "Method not allowed" });
    }

    const payload = safeParseJson(event.body);
    if (payload === null) {
      return jsonResponse(400, { error: "Invalid JSON body" });
    }

    const result = await resolveAiRoute(routeName, payload, { env: process.env });
    return jsonResponse(200, result);
  };
}
