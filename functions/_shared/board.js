import { requireStaff, supabase } from "./blacklist.js";

const encoder = new TextEncoder();
const MAX_BODY_BYTES = 8000;
const KINDS = ["ops", "inc", "wanted"];
const OPS_STATUS = ["Programada", "Em andamento", "Concluída"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SELECT = "id,kind,title,zone,leader,status,person,place,detail,created_at";

function json(status, payload) {
  return new Response(JSON.stringify(payload), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" } });
}
function clean(value, limit) {
  return Array.from(String(value || "")).filter((character) => { const code = character.charCodeAt(0); return code >= 32 || code === 9 || code === 10; }).join("").trim().slice(0, limit);
}
function originError(request) {
  const origin = request.headers.get("origin");
  if (!origin || origin === "null") return null;
  try { if (new URL(origin).host.toLowerCase() !== new URL(request.url).host.toLowerCase()) return "Origem não autorizada."; }
  catch (_) { return "Origem inválida."; }
  return null;
}
function toRow(row) {
  return { id: row.id, kind: row.kind, title: row.title, zone: row.zone, leader: row.leader, status: row.status, person: row.person, place: row.place, detail: row.detail, createdAt: row.created_at };
}

// Operações, Registros RP e Procurados RP compartilhados entre toda a equipe.
export async function handleBoard(request, env) {
  if (!["GET", "POST", "PATCH", "DELETE"].includes(request.method)) return json(405, { error: "Método não permitido." });
  if (request.method !== "GET") {
    const rejected = originError(request);
    if (rejected) return json(403, { error: rejected });
  }
  try {
    const staff = await requireStaff(request, env);
    if (request.method === "GET") {
      const kind = new URL(request.url).searchParams.get("kind");
      if (!KINDS.includes(kind)) return json(400, { error: "Quadro inválido." });
      const rows = await supabase(env, "/rest/v1/police_board_entries?select=" + SELECT + "&kind=eq." + kind + "&is_active=eq.true&order=created_at.desc&limit=500", { method: "GET" });
      return json(200, { rows: (Array.isArray(rows) ? rows : []).map(toRow) });
    }
    const text = await request.text();
    if (encoder.encode(text).byteLength > MAX_BODY_BYTES) return json(413, { error: "Solicitação muito grande." });
    let input;
    try { input = JSON.parse(text || "{}"); } catch (_) { return json(400, { error: "Dados inválidos." }); }
    if (!input || typeof input !== "object" || Array.isArray(input)) return json(400, { error: "Dados inválidos." });

    if (request.method === "POST") {
      const kind = KINDS.includes(input.kind) ? input.kind : "";
      const record = { kind, title: clean(input.title, 120), zone: clean(input.zone, 120), leader: clean(input.leader, 120), person: clean(input.person, 120), place: clean(input.place, 120), detail: clean(input.detail, 2000), status: kind === "ops" ? "Programada" : "", created_by: staff.id };
      if (!kind || record.title.length < 2) return json(400, { error: "Informe o título do registro." });
      if (kind === "ops" && (!record.zone || !record.leader)) return json(400, { error: "Informe a área e o responsável pela operação." });
      if (kind !== "ops" && (!record.person || !record.detail)) return json(400, { error: "Informe o personagem e os detalhes do registro." });
      const rows = await supabase(env, "/rest/v1/police_board_entries?select=" + SELECT, { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(record) });
      return json(201, { row: toRow(rows[0]) });
    }

    const id = clean(input.id, 36);
    if (!UUID.test(id)) return json(400, { error: "Registro inválido." });
    const now = new Date().toISOString();
    const change = request.method === "PATCH"
      ? (OPS_STATUS.includes(input.status) ? { status: input.status, updated_at: now } : null)
      : { is_active: false, removed_at: now, removed_by: staff.id, updated_at: now };
    if (!change) return json(400, { error: "Situação inválida." });
    const filter = "id=eq." + encodeURIComponent(id) + "&is_active=eq.true" + (request.method === "PATCH" ? "&kind=eq.ops" : "");
    const rows = await supabase(env, "/rest/v1/police_board_entries?" + filter + "&select=" + SELECT, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(change) });
    if (!Array.isArray(rows) || !rows.length) return json(404, { error: "Registro não encontrado ou já removido." });
    return json(200, request.method === "PATCH" ? { row: toRow(rows[0]) } : { ok: true });
  } catch (error) {
    return json(error.status || 500, { error: error.message || "Erro inesperado." });
  }
}
