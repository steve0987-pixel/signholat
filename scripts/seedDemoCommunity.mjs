import { createClient } from "@supabase/supabase-js";

const config = {
  url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  reportsTable: process.env.SUPABASE_REPORTS_TABLE || process.env.VITE_SUPABASE_REPORTS_TABLE || "reports",
  usersTable: process.env.SUPABASE_USERS_TABLE || "users",
  peerActionsTable: process.env.SUPABASE_PEER_ACTIONS_TABLE || "peer_actions"
};

if (!config.url || !config.serviceRoleKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(config.url, config.serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
});

const demoUsers = [
  { telegram_user_id: 900001, username: "mahalla_aziza", display_name: "Aziza Karimova", is_demo: true },
  { telegram_user_id: 900002, username: "observer_jasur", display_name: "Jasur Rakhmatov", is_demo: true },
  { telegram_user_id: 900003, username: "clinic_nodira", display_name: "Nodira Yunusova", is_demo: true },
  { telegram_user_id: 900004, username: "roads_bekzod", display_name: "Bekzod Akhmedov", is_demo: true },
  { telegram_user_id: 900005, username: "water_sitora", display_name: "Sitora Tursunova", is_demo: true }
];

function normalizeId(value) {
  return String(value || "").trim();
}

async function ensureUsers() {
  const { data, error } = await supabase
    .from(config.usersTable)
    .upsert(demoUsers, { onConflict: "telegram_user_id" })
    .select("id, telegram_user_id, username, display_name, is_demo")
    .order("telegram_user_id", { ascending: true });

  if (error) throw new Error(`Failed to seed users: ${error.message}`);
  return data || [];
}

async function fetchReports() {
  const { data, error } = await supabase
    .from(config.reportsTable)
    .select("id, created_at")
    .order("created_at", { ascending: false })
    .limit(12);

  if (error) throw new Error(`Failed to load reports: ${error.message}`);
  return data || [];
}

async function hasAction({ reportId, userId, actionType, note = "" }) {
  const query = supabase
    .from(config.peerActionsTable)
    .select("id")
    .eq("report_id", normalizeId(reportId))
    .eq("user_id", normalizeId(userId))
    .eq("action_type", actionType)
    .limit(1);

  const { data, error } = note
    ? await query.eq("note", note).maybeSingle()
    : await query.maybeSingle();

  if (error) throw new Error(`Failed to check existing action: ${error.message}`);
  return Boolean(data);
}

async function insertAction(row) {
  const { error } = await supabase.from(config.peerActionsTable).insert(row);
  if (error) throw new Error(`Failed to insert ${row.action_type}: ${error.message}`);
}

async function seedActions(users, reports) {
  if (!reports.length || !users.length) return 0;

  let inserted = 0;
  const [u1, u2, u3, u4, u5] = users;

  for (let index = 0; index < reports.length; index += 1) {
    const report = reports[index];
    const reportId = normalizeId(report.id);

    const confirmActors = [u1, u2, u3].filter(Boolean);
    for (const actor of confirmActors) {
      const exists = await hasAction({
        reportId,
        userId: actor.id,
        actionType: "confirm"
      });
      if (exists) continue;

      await insertAction({
        report_id: reportId,
        user_id: actor.id,
        action_type: "confirm",
        note: null,
        metadata: { source: "seed-script", weight: 1 },
        created_at: new Date(Date.now() - (index + 1) * 60 * 60 * 1000).toISOString()
      });
      inserted += 1;
    }

    if (u4 && index % 2 === 0) {
      const evidenceNote = "Observed recurring queue and service interruption at this location.";
      const exists = await hasAction({
        reportId,
        userId: u4.id,
        actionType: "evidence",
        note: evidenceNote
      });

      if (!exists) {
        await insertAction({
          report_id: reportId,
          user_id: u4.id,
          action_type: "evidence",
          note: evidenceNote,
          metadata: { source: "seed-script", media_hint: "photo" },
          created_at: new Date(Date.now() - (index + 2) * 2 * 60 * 60 * 1000).toISOString()
        });
        inserted += 1;
      }
    }

    if (u5 && index % 3 === 0) {
      const unresolvedNote = "Issue still unresolved after community follow-up check.";
      const exists = await hasAction({
        reportId,
        userId: u5.id,
        actionType: "still_unresolved",
        note: unresolvedNote
      });

      if (!exists) {
        await insertAction({
          report_id: reportId,
          user_id: u5.id,
          action_type: "still_unresolved",
          note: unresolvedNote,
          metadata: { source: "seed-script", follow_up_days: 3 },
          created_at: new Date(Date.now() - (index + 2) * 3 * 60 * 60 * 1000).toISOString()
        });
        inserted += 1;
      }
    }
  }

  return inserted;
}

async function run() {
  const users = await ensureUsers();
  const reports = await fetchReports();
  const inserted = await seedActions(users, reports);

  console.log(`Demo users in backend: ${users.length}`);
  console.log(`Reports used for seeding: ${reports.length}`);
  console.log(`New peer actions inserted: ${inserted}`);
}

run().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
