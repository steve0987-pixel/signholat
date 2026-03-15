import { createClient } from "@supabase/supabase-js";

let cachedClient = null;
let cachedUrl = "";
let cachedKey = "";

function readServerConfig(env = process.env) {
  return {
    url: env.SUPABASE_URL || env.VITE_SUPABASE_URL || "",
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY || ""
  };
}

export function getServerSupabase(env = process.env) {
  const config = readServerConfig(env);
  if (!config.url || !config.serviceRoleKey) return null;

  if (cachedClient && cachedUrl === config.url && cachedKey === config.serviceRoleKey) {
    return cachedClient;
  }

  cachedUrl = config.url;
  cachedKey = config.serviceRoleKey;
  cachedClient = createClient(config.url, config.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });

  return cachedClient;
}

export function getCommunityTableNames(env = process.env) {
  return {
    reports: env.SUPABASE_REPORTS_TABLE || env.VITE_SUPABASE_REPORTS_TABLE || "reports",
    users: env.SUPABASE_USERS_TABLE || "users",
    peerActions: env.SUPABASE_PEER_ACTIONS_TABLE || "peer_actions"
  };
}
