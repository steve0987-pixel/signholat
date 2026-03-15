import { sampleReports } from "../data/sampleReports";
import { calculateXP } from "../utils/xp";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

const REPORTS_TABLE = import.meta.env.VITE_SUPABASE_REPORTS_TABLE || "reports";

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

function mapDemoReportToRow(report) {
  const createdAt = report.createdAt || report.submittedAt || new Date().toISOString();
  const mediaUrl = report.mediaUrl || report.image || "";
  const mediaType = report.mediaType || "image";

  return {
    seed_key: `demo:${report.id}`,
    telegram_user_id: report.userId ?? null,
    reporter_name: report.reporterName || "",
    category: report.category || "",
    description: report.description || "",
    location: report.location || "",
    place_name: report.placeName || "",
    media_url: mediaUrl,
    media_type: mediaType,
    status: report.status || "New",
    created_at: createdAt,
    summary: report.summary || null,
    context: report.context || null,
    severity: report.severity || null,
    impact_score:
      report.impact_score === null || report.impact_score === undefined ? null : Number(report.impact_score),
    xp_awarded: Number.isFinite(Number(report.xpAwarded))
      ? Number(report.xpAwarded)
      : calculateXP({
          category: report.category,
          description: report.description,
          location: report.location,
          media: mediaUrl ? [mediaUrl] : []
        })
  };
}

export async function syncDemoReportsToSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, error: "Supabase is not configured" };
  }

  const hasSession = await ensureSupabaseSession();
  if (!hasSession) {
    return { ok: false, error: "Anonymous auth failed" };
  }

  try {
    const rows = sampleReports.map(mapDemoReportToRow);

    const { data, error } = await supabase.from(REPORTS_TABLE).upsert(rows, { onConflict: "seed_key" }).select();
    if (error) {
      return { ok: false, error: error.message || "Failed to sync demo reports" };
    }

    return { ok: true, data: data || [] };
  } catch (error) {
    return { ok: false, error: error?.message || "Failed to sync demo reports" };
  }
}
