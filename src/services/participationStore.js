import { isSupabaseConfigured, supabase } from "../lib/supabase";

const PARTICIPATION_TABLE = import.meta.env.VITE_SUPABASE_PARTICIPATION_TABLE || "report_participation";

function stringifyId(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function clipText(value, maxLength = 240) {
  const cleaned = String(value || "")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, Math.max(0, maxLength - 1)).trim()}...`;
}

function normalizeActionType(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "confirm" || normalized === "confirmation") return "confirm";
  if (normalized === "evidence") return "evidence";
  return "";
}

function mapParticipationRow(row = {}) {
  return {
    id: stringifyId(row.id || `local-${Date.now()}`),
    reportId: stringifyId(row.report_id ?? row.reportId),
    userId: stringifyId(row.user_id ?? row.userId ?? row.telegram_user_id),
    actionType: normalizeActionType(row.action_type ?? row.actionType),
    note: clipText(row.note || ""),
    createdAt: String(row.created_at || row.createdAt || new Date().toISOString())
  };
}

async function ensureSupabaseSession() {
  if (!supabase) return false;

  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) return false;
    if (data.session) return true;

    const { error: signInError } = await supabase.auth.signInAnonymously();
    return !signInError;
  } catch {
    return false;
  }
}

export async function fetchParticipationEvents() {
  if (!isSupabaseConfigured || !supabase) {
    return { events: null, error: "" };
  }

  try {
    const { data, error } = await supabase
      .from(PARTICIPATION_TABLE)
      .select("*")
      .order("created_at", { ascending: true })
      .limit(5000);

    if (error) {
      return { events: null, error: error.message || "Failed to load participation events" };
    }

    return {
      events: Array.isArray(data) ? data.map(mapParticipationRow).filter((item) => item.reportId && item.userId) : [],
      error: ""
    };
  } catch (error) {
    return { events: null, error: error?.message || "Failed to load participation events" };
  }
}

export async function createParticipationEvent(payload = {}) {
  if (!isSupabaseConfigured || !supabase) {
    return { event: null, error: "not_configured" };
  }

  const reportId = stringifyId(payload.reportId);
  const userId = stringifyId(payload.userId);
  const actionType = normalizeActionType(payload.actionType);
  const note = actionType === "evidence" ? clipText(payload.note || "") : "";

  if (!reportId || !userId || !actionType) {
    return { event: null, error: "invalid_payload" };
  }

  if (actionType === "evidence" && note.length < 8) {
    return { event: null, error: "invalid_evidence_note" };
  }

  const hasSession = await ensureSupabaseSession();
  if (!hasSession) {
    return { event: null, error: "auth_failed" };
  }

  try {
    const row = {
      report_id: reportId,
      user_id: userId,
      action_type: actionType,
      note: note || null,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase.from(PARTICIPATION_TABLE).insert(row).select().single();
    if (error) {
      return { event: null, error: error.message || "Failed to save participation event" };
    }

    return { event: mapParticipationRow(data), error: "" };
  } catch (error) {
    return { event: null, error: error?.message || "Failed to save participation event" };
  }
}
