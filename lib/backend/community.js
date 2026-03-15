import { getCommunityTableNames, getServerSupabase } from "./supabaseServer.js";

const ALLOWED_ACTION_TYPES = new Set([
  "confirm",
  "evidence",
  "still_unresolved",
  "confirm_object",
  "suggest_duplicate"
]);

function normalizeActionType(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "confirmation") return "confirm";
  return normalized;
}

function clipText(value, maxLength = 240) {
  const cleaned = String(value || "")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, Math.max(0, maxLength - 1)).trim()}...`;
}

function toMaybeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9а-яёўқғҳ\s-]/gi, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function inferObjectType(report = {}) {
  const text = `${report.category || ""} ${report.place_name || report.placeName || ""}`.toLowerCase();

  if (text.includes("school") || text.includes("maktab")) return "school";
  if (text.includes("clinic") || text.includes("hospital") || text.includes("health") || text.includes("ssv")) {
    return "clinic";
  }
  if (text.includes("water") || text.includes("suv")) return "water";
  if (text.includes("road") || text.includes("street") || text.includes("yo'l")) return "road";

  return "public-object";
}

function getObjectKeyFromReport(report = {}) {
  const explicitObjectId = String(report.object_id || "").trim();
  if (explicitObjectId) return explicitObjectId;

  const objectType = String(report.object_type || inferObjectType(report)).trim() || "public-object";
  const placeName = String(report.place_name || report.placeName || "").trim();

  if (placeName) {
    return `${objectType}:${slugify(placeName) || "object"}`;
  }

  const location = String(report.location || "").trim();
  if (location) {
    return `${objectType}:${slugify(location) || "location"}`;
  }

  return `${objectType}:unknown`;
}

function getReportTitle(report = {}) {
  const aiTitle = String(report.ai_title || report.aiTitle || "").trim();
  if (aiTitle) return aiTitle;

  const summary = String(report.summary || "").trim();
  if (summary) return summary.length > 84 ? `${summary.slice(0, 83)}...` : summary;

  const description = String(report.description || "").trim();
  if (!description) return "Issue report";
  return description.length > 84 ? `${description.slice(0, 83)}...` : description;
}

function buildActionSummary(actions = []) {
  const summary = {
    total: actions.length,
    confirm: 0,
    evidence: 0,
    still_unresolved: 0,
    confirm_object: 0,
    suggest_duplicate: 0
  };

  actions.forEach((action) => {
    const actionType = normalizeActionType(action.action_type);
    if (summary[actionType] !== undefined) {
      summary[actionType] += 1;
    }
  });

  return summary;
}

async function fetchUsersByIds(client, tableNames, userIds) {
  const normalizedIds = Array.from(new Set((userIds || []).map((id) => String(id).trim()).filter(Boolean)));
  if (!normalizedIds.length) return new Map();

  const { data } = await client
    .from(tableNames.users)
    .select("id, telegram_user_id, username, display_name, is_demo")
    .in("id", normalizedIds);

  const map = new Map();
  (data || []).forEach((row) => {
    map.set(String(row.id), row);
  });

  return map;
}

function formatPeerAction(action, userMap) {
  const user = userMap.get(String(action.user_id)) || null;

  return {
    id: String(action.id),
    reportId: String(action.report_id),
    userId: String(action.user_id),
    actionType: normalizeActionType(action.action_type),
    note: clipText(action.note || "", 280),
    metadata: action.metadata || {},
    createdAt: action.created_at,
    actor: user
      ? {
          id: String(user.id),
          telegramUserId: user.telegram_user_id,
          username: user.username || "",
          displayName: user.display_name || user.username || "Participant",
          isDemo: Boolean(user.is_demo)
        }
      : null
  };
}

async function ensureActorUser(client, tableNames, actor = {}) {
  const telegramUserId = toMaybeNumber(actor.telegramUserId ?? actor.userId);
  if (!telegramUserId) {
    return { user: null, error: "missing_actor_telegram_user_id" };
  }

  const username = clipText(actor.username || "", 80) || null;
  const displayName = clipText(actor.displayName || actor.fullName || actor.username || "Telegram user", 120);

  const row = {
    telegram_user_id: telegramUserId,
    username,
    display_name: displayName,
    is_demo: false
  };

  const { data, error } = await client
    .from(tableNames.users)
    .upsert(row, { onConflict: "telegram_user_id" })
    .select("id, telegram_user_id, username, display_name, is_demo")
    .single();

  if (error) {
    return { user: null, error: error.message || "failed_to_upsert_actor_user" };
  }

  return {
    user: {
      id: String(data.id),
      telegramUserId: data.telegram_user_id,
      username: data.username || "",
      displayName: data.display_name || "",
      isDemo: Boolean(data.is_demo)
    },
    error: ""
  };
}

export async function getReportCommunityActivity(reportId, env = process.env) {
  const client = getServerSupabase(env);
  if (!client) return { ok: false, status: 500, error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" };

  const tableNames = getCommunityTableNames(env);
  const normalizedReportId = String(reportId || "").trim();
  if (!normalizedReportId) return { ok: false, status: 400, error: "Invalid report id" };

  const { data: report, error: reportError } = await client
    .from(tableNames.reports)
    .select("id, category, place_name, location, status, created_at, ai_title, summary, description, object_id, object_type")
    .eq("id", normalizedReportId)
    .maybeSingle();

  if (reportError) return { ok: false, status: 500, error: reportError.message || "Failed to load report" };
  if (!report) return { ok: false, status: 404, error: "Report not found" };

  const { data: actions, error: actionsError } = await client
    .from(tableNames.peerActions)
    .select("id, report_id, user_id, action_type, note, metadata, created_at")
    .eq("report_id", normalizedReportId)
    .order("created_at", { ascending: false })
    .limit(120);

  if (actionsError) return { ok: false, status: 500, error: actionsError.message || "Failed to load actions" };

  const rows = actions || [];
  const userMap = await fetchUsersByIds(
    client,
    tableNames,
    rows.map((row) => row.user_id)
  );

  const formattedActions = rows.map((row) => formatPeerAction(row, userMap));
  const summary = buildActionSummary(rows);

  return {
    ok: true,
    status: 200,
    data: {
      report: {
        id: String(report.id),
        title: getReportTitle(report),
        category: report.category || "",
        status: report.status || "Submitted",
        placeName: report.place_name || "",
        location: report.location || "",
        objectId: getObjectKeyFromReport(report)
      },
      summary,
      recentActions: formattedActions
    }
  };
}

export async function createPeerActionForReport(reportId, payload = {}, env = process.env) {
  const client = getServerSupabase(env);
  if (!client) return { ok: false, status: 500, error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" };

  const tableNames = getCommunityTableNames(env);
  const normalizedReportId = String(reportId || "").trim();
  if (!normalizedReportId) return { ok: false, status: 400, error: "Invalid report id" };

  const actionType = normalizeActionType(payload.actionType);
  if (!ALLOWED_ACTION_TYPES.has(actionType)) {
    return { ok: false, status: 400, error: "Unsupported action type" };
  }

  const { data: reportExists, error: reportError } = await client
    .from(tableNames.reports)
    .select("id")
    .eq("id", normalizedReportId)
    .maybeSingle();

  if (reportError) return { ok: false, status: 500, error: reportError.message || "Failed to validate report" };
  if (!reportExists) return { ok: false, status: 404, error: "Report not found" };

  const actorResult = await ensureActorUser(client, tableNames, payload.actor || {});
  if (!actorResult.user) {
    return { ok: false, status: 400, error: actorResult.error || "Invalid actor payload" };
  }

  if (actionType === "confirm") {
    const { data: existingConfirm, error: confirmCheckError } = await client
      .from(tableNames.peerActions)
      .select("id")
      .eq("report_id", normalizedReportId)
      .eq("user_id", actorResult.user.id)
      .eq("action_type", "confirm")
      .limit(1)
      .maybeSingle();

    if (confirmCheckError) {
      return { ok: false, status: 500, error: confirmCheckError.message || "Failed to validate confirm action" };
    }

    if (existingConfirm) {
      return { ok: false, status: 409, error: "You already confirmed this report" };
    }
  }

  const note = clipText(payload.note || "", 240) || null;
  if (actionType === "evidence" && (!note || note.length < 8)) {
    return { ok: false, status: 400, error: "Evidence note is too short" };
  }

  const metadata = payload.metadata && typeof payload.metadata === "object" ? payload.metadata : {};
  const insertRow = {
    report_id: normalizedReportId,
    user_id: actorResult.user.id,
    action_type: actionType,
    note,
    metadata,
    created_at: new Date().toISOString()
  };

  const { data: inserted, error: insertError } = await client
    .from(tableNames.peerActions)
    .insert(insertRow)
    .select("id, report_id, user_id, action_type, note, metadata, created_at")
    .single();

  if (insertError) {
    if (insertError.code === "23505" && actionType === "confirm") {
      return { ok: false, status: 409, error: "You already confirmed this report" };
    }

    return { ok: false, status: 500, error: insertError.message || "Failed to create peer action" };
  }

  const formatted = formatPeerAction(inserted, new Map([[actorResult.user.id, {
    id: actorResult.user.id,
    telegram_user_id: actorResult.user.telegramUserId,
    username: actorResult.user.username,
    display_name: actorResult.user.displayName,
    is_demo: actorResult.user.isDemo
  }]]));

  const community = await getReportCommunityActivity(normalizedReportId, env);
  return {
    ok: true,
    status: 201,
    data: {
      createdAction: formatted,
      summary: community.ok ? community.data.summary : null
    }
  };
}

export async function getObjectDetailsById(objectId, env = process.env) {
  const client = getServerSupabase(env);
  if (!client) return { ok: false, status: 500, error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" };

  const tableNames = getCommunityTableNames(env);
  const normalizedObjectId = String(objectId || "").trim();
  if (!normalizedObjectId) return { ok: false, status: 400, error: "Invalid object id" };

  const { data: reports, error: reportsError } = await client
    .from(tableNames.reports)
    .select("id, category, description, place_name, location, status, created_at, ai_title, summary, object_id, object_type")
    .order("created_at", { ascending: false })
    .limit(2000);

  if (reportsError) return { ok: false, status: 500, error: reportsError.message || "Failed to load reports" };

  const linkedIssues = (reports || []).filter((row) => getObjectKeyFromReport(row) === normalizedObjectId);
  if (!linkedIssues.length) return { ok: false, status: 404, error: "Object not found" };

  const reportIds = linkedIssues.map((issue) => String(issue.id));
  const { data: actions, error: actionsError } = await client
    .from(tableNames.peerActions)
    .select("id, report_id, action_type")
    .in("report_id", reportIds)
    .limit(8000);

  if (actionsError) return { ok: false, status: 500, error: actionsError.message || "Failed to load object activity" };

  const actionRows = actions || [];
  const actionsByReport = reportIds.reduce((acc, id) => {
    acc[id] = actionRows.filter((row) => String(row.report_id) === String(id));
    return acc;
  }, {});

  const unresolvedCount = linkedIssues.filter((issue) => String(issue.status || "") !== "Resolved").length;
  const categoryCounts = linkedIssues.reduce((acc, issue) => {
    const key = String(issue.category || "other").toLowerCase();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const repeatedIssueCount = Object.values(categoryCounts).reduce((total, count) => {
    return count > 1 ? total + 1 : total;
  }, 0);

  const lead = linkedIssues[0];
  const objectType = String(lead.object_type || inferObjectType(lead));
  const objectName = String(lead.place_name || "").trim() || "Public object";

  return {
    ok: true,
    status: 200,
    data: {
      objectId: normalizedObjectId,
      objectName,
      objectType,
      unresolvedCount,
      repeatedIssueCount,
      linkedIssues: linkedIssues.map((issue) => {
        const issueActions = actionsByReport[String(issue.id)] || [];
        const counts = buildActionSummary(issueActions);

        return {
          id: String(issue.id),
          title: getReportTitle(issue),
          category: issue.category || "",
          status: issue.status || "Submitted",
          location: issue.location || "",
          createdAt: issue.created_at,
          community: counts
        };
      })
    }
  };
}
