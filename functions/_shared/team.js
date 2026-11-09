// Equipe: todas as contas ativas do portal com patente, ID e presença (online ou visto por último). Consulta pública.
import { json } from "./http.js";
import { supabase } from "./supabase.js";
import { rankLevel } from "./permissions.js";

export const ONLINE_MS = 150 * 1000; // visto nos últimos 2min30s = online

export async function handleTeam(request, env) {
  if (request.method !== "GET") return json(405, { error: "Método não permitido." });
  try {
    const people = await supabase(env, "/rest/v1/police_users?select=user_id,display_name,role,roster_id,login_id,last_seen_at&enabled=eq.true&removed_at=is.null&order=display_name.asc&limit=500", { method: "GET" });
    const rosterIds = (people || []).map((p) => p.roster_id).filter(Boolean);
    const roster = rosterIds.length ? await supabase(env, "/rest/v1/rota_roster?select=id,rank&id=in.(" + rosterIds.join(",") + ")", { method: "GET" }) : [];
    const rankById = Object.fromEntries((roster || []).map((r) => [r.id, r.rank]));
    const now = Date.now();
    const rows = (people || []).map((p) => {
      const member = p.role === "policial" && p.roster_id && rankById[p.roster_id];
      const seen = p.last_seen_at ? new Date(p.last_seen_at).getTime() : 0;
      return { name: p.display_name || "", rank: member ? rankById[p.roster_id] : "", role: member ? "integrante" : "visitante", loginId: p.login_id || "", online: !!seen && now - seen < ONLINE_MS, lastSeen: p.last_seen_at || null };
    }).sort((a, b) => (b.online - a.online) || ((b.role === "integrante") - (a.role === "integrante")) || (rankLevel(b.rank) - rankLevel(a.rank)) || a.name.localeCompare(b.name, "pt-BR"));
    return json(200, { rows, serverTime: new Date(now).toISOString() });
  } catch (error) {
    return json(error.status || 500, { error: error.message || "Erro inesperado." });
  }
}
