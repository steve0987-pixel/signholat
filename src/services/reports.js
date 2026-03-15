import { supabase, isSupabaseConfigured } from "../lib/supabase";

const REPORTS_TABLE = import.meta.env.VITE_SUPABASE_REPORTS_TABLE || "reports";
const REPORT_MEDIA_BUCKET = import.meta.env.VITE_SUPABASE_REPORT_MEDIA_BUCKET || "report-media";

function normalizeUserId(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : value || null;
}

function sanitizeFileName(fileName = "upload") {
  return fileName.replace(/[^a-zA-Z0-9._-]+/g, "-");
}

function getStoredTimestamp(report) {
  return report.createdAt || report.submittedAt || new Date().toISOString();
}

export function mapStoredReport(row = {}) {
  const createdAt = row.created_at || row.createdAt || row.submitted_at || row.submittedAt || new Date().toISOString();
  const mediaUrl = row.media_url || row.mediaUrl || row.image || "";
  const mediaType = row.media_type || row.mediaType || "image";

  return {
    id: String(row.id || `r-${Date.now()}`),
    category: row.category || "",
    description: row.description || "",
    location: row.location || "",
    placeName: row.place_name || row.placeName || "",
    image: mediaType === "image" ? mediaUrl : "",
    media: mediaUrl ? [mediaUrl] : [],
    mediaUrl,
    mediaType,
    createdAt,
    submittedAt: createdAt,
    status: row.status || "New",
    userId: normalizeUserId(row.telegram_user_id ?? row.userId ?? row.created_by),
    reporterName: row.reporter_name || row.reporterName || "",
    aiTitle: row.ai_title || row.aiTitle || "",
    summary: row.summary || "",
    context: row.context || "",
    severity: row.severity || "",
    impact_score:
      row.impact_score === null || row.impact_score === undefined ? null : Number(row.impact_score),
    xpAwarded: Number.isFinite(Number(row.xp_awarded ?? row.xpAwarded))
      ? Number(row.xp_awarded ?? row.xpAwarded)
      : 0
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

async function uploadReportMedia(mediaFile, userId) {
  if (!supabase || !mediaFile) return null;

  const folder = String(userId || "anonymous");
  const path = `${folder}/${Date.now()}-${sanitizeFileName(mediaFile.name)}`;

  const { error } = await supabase.storage.from(REPORT_MEDIA_BUCKET).upload(path, mediaFile, {
    cacheControl: "3600",
    upsert: false,
    contentType: mediaFile.type || undefined
  });

  if (error) throw error;

  const { data } = supabase.storage.from(REPORT_MEDIA_BUCKET).getPublicUrl(path);
  return data?.publicUrl || null;
}

export async function fetchStoredReports() {
  if (!isSupabaseConfigured || !supabase) {
    return { reports: null, error: "" };
  }

  try {
    const { data, error } = await supabase.from(REPORTS_TABLE).select("*").order("created_at", { ascending: false });
    if (error) {
      return { reports: null, error: error.message || "Failed to load reports from Supabase" };
    }

    return {
      reports: Array.isArray(data) ? data.map(mapStoredReport) : [],
      error: ""
    };
  } catch (error) {
    return { reports: null, error: error?.message || "Failed to load reports from Supabase" };
  }
}

export async function createStoredReport({ report, mediaFile, user }) {
  if (!isSupabaseConfigured || !supabase) return null;

  const hasSession = await ensureSupabaseSession();
  if (!hasSession) return null;

  try {
    let remoteMediaUrl = report.mediaUrl || "";

    if (mediaFile) {
      remoteMediaUrl = await uploadReportMedia(mediaFile, user?.id);
    }

    const row = {
      telegram_user_id: user?.id ?? null,
      reporter_name: report.reporterName || "",
      category: report.category || "",
      description: report.description || "",
      location: report.location || "",
      place_name: report.placeName || "",
      media_url: remoteMediaUrl,
      media_type: report.mediaType || "image",
      status: report.status || "New",
      created_at: getStoredTimestamp(report),
      summary: report.summary || null,
      context: report.context || null,
      severity: report.severity || null,
      impact_score:
        report.impact_score === null || report.impact_score === undefined ? null : Number(report.impact_score),
      xp_awarded: Number.isFinite(Number(report.xpAwarded)) ? Number(report.xpAwarded) : 0
    };

    const { data, error } = await supabase.from(REPORTS_TABLE).insert(row).select().single();
    if (error) return null;

    return mapStoredReport(data);
  } catch {
    return null;
  }
}

export async function updateStoredReportEnrichment(reportId, enrichment) {
  if (!isSupabaseConfigured || !supabase || !reportId || !enrichment) return false;

  const hasSession = await ensureSupabaseSession();
  if (!hasSession) return false;

  try {
    const { error } = await supabase
      .from(REPORTS_TABLE)
      .update({
        summary: enrichment.summary || null,
        context: enrichment.context || null,
        severity: enrichment.severity || null,
        impact_score:
          enrichment.impact_score === null || enrichment.impact_score === undefined
            ? null
            : Number(enrichment.impact_score)
      })
      .eq("id", reportId);

    return !error;
  } catch {
    return false;
  }
}
