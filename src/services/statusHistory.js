import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { normalizeStatus } from "../constants/statusLifecycle";

const STATUS_HISTORY_TABLE = import.meta.env.VITE_SUPABASE_STATUS_HISTORY_TABLE || "report_status_history";

function stringifyId(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function clipText(value, maxLength = 220) {
  const cleaned = String(value || "")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, Math.max(0, maxLength - 1)).trim()}...`;
}

function mapStatusEvent(row = {}) {
  return {
    id: stringifyId(row.id || `status-${Date.now()}`),
    reportId: stringifyId(row.report_id ?? row.reportId),
    status: normalizeStatus(row.status),
    note: clipText(row.note || ""),
    changedBy: stringifyId(row.changed_by ?? row.changedBy),
    createdAt: String(row.created_at || row.createdAt || new Date().toISOString())
  };
}

function buildHistoryMap(events = []) {
  return events.reduce((acc, event) => {
    const reportId = stringifyId(event.reportId);
    if (!reportId) return acc;

    if (!acc[reportId]) {
      acc[reportId] = [];
    }

    acc[reportId].push(event);
    return acc;
  }, {});
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

export async function fetchStatusHistory(reportIds = []) {
  if (!isSupabaseConfigured || !supabase) {
    return { map: null, events: null, error: "" };
  }

  try {
    let query = supabase.from(STATUS_HISTORY_TABLE).select("*").order("created_at", { ascending: true });

    const normalizedIds = Array.isArray(reportIds)
      ? reportIds.map((value) => stringifyId(value)).filter(Boolean).slice(0, 500)
      : [];

    if (normalizedIds.length > 0) {
      query = query.in("report_id", normalizedIds);
    }

    const { data, error } = await query.limit(5000);

    if (error) {
      return { map: null, events: null, error: error.message || "Failed to load status history" };
    }

    const events = Array.isArray(data) ? data.map(mapStatusEvent).filter((item) => item.reportId) : [];
    return {
      map: buildHistoryMap(events),
      events,
      error: ""
    };
  } catch (error) {
    return { map: null, events: null, error: error?.message || "Failed to load status history" };
  }
}

export async function createStatusHistoryEvent(payload = {}) {
  if (!isSupabaseConfigured || !supabase) {
    return { event: null, error: "not_configured" };
  }

  const reportId = stringifyId(payload.reportId);
  const status = normalizeStatus(payload.status);

  if (!reportId || !status) {
    return { event: null, error: "invalid_payload" };
  }

  const hasSession = await ensureSupabaseSession();
  if (!hasSession) {
    return { event: null, error: "auth_failed" };
  }

  try {
    const row = {
      report_id: reportId,
      status,
      note: clipText(payload.note || "") || null,
      changed_by: stringifyId(payload.changedBy) || null,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase.from(STATUS_HISTORY_TABLE).insert(row).select().single();
    if (error) {
      return { event: null, error: error.message || "Failed to save status history event" };
    }

    return { event: mapStatusEvent(data), error: "" };
  } catch (error) {
    return { event: null, error: error?.message || "Failed to save status history event" };
  }
}
