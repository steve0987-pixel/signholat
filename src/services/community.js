function stringifyId(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function mapAction(action = {}) {
  return {
    id: stringifyId(action.id),
    reportId: stringifyId(action.reportId),
    userId: stringifyId(action.userId),
    actionType: String(action.actionType || "").trim().toLowerCase(),
    note: String(action.note || "").trim(),
    metadata: action.metadata && typeof action.metadata === "object" ? action.metadata : {},
    createdAt: String(action.createdAt || new Date().toISOString()),
    actor: action.actor && typeof action.actor === "object" ? action.actor : null
  };
}

function mapSummary(summary = {}) {
  return {
    total: Number(summary.total) || 0,
    confirm: Number(summary.confirm) || 0,
    evidence: Number(summary.evidence) || 0,
    still_unresolved: Number(summary.still_unresolved) || 0,
    confirm_object: Number(summary.confirm_object) || 0,
    suggest_duplicate: Number(summary.suggest_duplicate) || 0
  };
}

function toErrorCode(prefix, response, payload) {
  const suffix = response ? String(response.status) : "unavailable";
  const backendMessage = payload?.error ? String(payload.error).trim() : "";
  if (backendMessage) return `${prefix}_${suffix}:${backendMessage}`;
  return `${prefix}_${suffix}`;
}

export function toParticipationEvents(actions = []) {
  if (!Array.isArray(actions)) return [];

  return actions
    .map((action) => {
      const normalized = mapAction(action);
      if (normalized.actionType !== "confirm" && normalized.actionType !== "evidence") return null;

      return {
        id: normalized.id || `act-${Date.now()}`,
        reportId: normalized.reportId,
        userId: normalized.userId,
        actionType: normalized.actionType,
        note: normalized.note,
        createdAt: normalized.createdAt
      };
    })
    .filter(Boolean);
}

export async function fetchReportCommunityActivity(reportId) {
  const normalizedId = stringifyId(reportId);
  if (!normalizedId) return { activity: null, error: "invalid_report_id" };

  const url = `/api/reports/${encodeURIComponent(normalizedId)}/community`;

  try {
    const response = await fetch(url, { method: "GET" });
    const payload = await safeJson(response);

    if (!response.ok) {
      return {
        activity: null,
        error: toErrorCode("community_fetch", response, payload)
      };
    }

    const recentActions = Array.isArray(payload?.recentActions) ? payload.recentActions.map(mapAction) : [];

    return {
      activity: {
        report: payload?.report || null,
        summary: mapSummary(payload?.summary),
        recentActions
      },
      error: ""
    };
  } catch {
    return { activity: null, error: "community_fetch_unavailable" };
  }
}

export async function createReportPeerAction(reportId, payload = {}) {
  const normalizedId = stringifyId(reportId);
  if (!normalizedId) return { action: null, summary: null, error: "invalid_report_id" };

  const url = `/api/reports/${encodeURIComponent(normalizedId)}/peer-actions`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const data = await safeJson(response);

    if (!response.ok) {
      return {
        action: null,
        summary: null,
        error: toErrorCode("peer_action", response, data)
      };
    }

    return {
      action: data?.createdAction ? mapAction(data.createdAction) : null,
      summary: data?.summary ? mapSummary(data.summary) : null,
      error: ""
    };
  } catch {
    return { action: null, summary: null, error: "peer_action_unavailable" };
  }
}

export async function fetchObjectCommunityDetails(objectId) {
  const normalizedId = stringifyId(objectId);
  if (!normalizedId) return { object: null, error: "invalid_object_id" };

  const url = `/api/objects/${encodeURIComponent(normalizedId)}`;

  try {
    const response = await fetch(url, { method: "GET" });
    const payload = await safeJson(response);

    if (!response.ok) {
      return {
        object: null,
        error: toErrorCode("object_fetch", response, payload)
      };
    }

    return {
      object: payload && typeof payload === "object" ? payload : null,
      error: ""
    };
  } catch {
    return { object: null, error: "object_fetch_unavailable" };
  }
}
