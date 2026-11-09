// Sessões do portal: administrador (token HMAC próprio) e policial (sessão do Supabase Auth).
import { decodeBase64Url, encodeBase64Url } from "./http.js";
import { configuration, supabase } from "./supabase.js";
import { ALL_PERMISSIONS, validPermissions } from "./permissions.js";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export async function signAdmin(env, payload) {
  const secret = String(env.ROTA_SESSION_SECRET || "");
  if (secret.length < 32) throw new Error("Configure ROTA_SESSION_SECRET com pelo menos 32 caracteres.");
  const data = encodeBase64Url(encoder.encode(JSON.stringify(payload)));
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(data)));
  return data + "." + encodeBase64Url(signature);
}

export async function verifyAdmin(request, env) {
  const secret = String(env.ROTA_SESSION_SECRET || ""), parts = String(request.headers.get("x-rota-admin-session") || "").split(".");
  if (secret.length < 32 || parts.length !== 2) return false;
  try {
    const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const expected = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(parts[0]))), actual = decodeBase64Url(parts[1]);
    if (actual.length !== expected.length) return false;
    let difference = 0; for (let i = 0; i < expected.length; i++) difference |= expected[i] ^ actual[i];
    if (difference) return false;
    const payload = JSON.parse(decoder.decode(decodeBase64Url(parts[0])));
    return payload.role === "admin" && payload.exp > Math.floor(Date.now() / 1000);
  } catch (_) { return false; }
}

export async function requireAdmin(request, env, message) {
  if (await verifyAdmin(request, env)) return { id: null, role: "admin" };
  throw Object.assign(new Error(message || "Somente o administrador pode fazer esta alteração."), { status: 401 });
}

// Aceita a sessão de administrador ou a de um policial habilitado em police_users.
// O policial volta com as tags e a soma das permissões delas; o administrador tem todas.
export async function requireStaff(request, env) {
  if (await verifyAdmin(request, env)) return { id: null, role: "admin", name: "Administração", permissions: ALL_PERMISSIONS.slice(), tags: [] };
  const authorization = String(request.headers.get("authorization") || ""), match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) throw Object.assign(new Error("Entre com uma conta policial autorizada para acessar este recurso."), { status: 401 });
  const cfg = configuration(env), token = match[1];
  const userResponse = await fetch(cfg.url + "/auth/v1/user", { headers: { apikey: cfg.publicKey, Authorization: "Bearer " + token } });
  const user = await userResponse.json().catch(() => ({}));
  if (!userResponse.ok || !user.id) throw Object.assign(new Error("Sessão policial inválida ou expirada."), { status: 401 });
  const members = await supabase(env, "/rest/v1/police_users?select=user_id,display_name,role,enabled,roster_id&user_id=eq." + encodeURIComponent(user.id) + "&enabled=eq.true&limit=1", { method: "GET" });
  if (!Array.isArray(members) || !members.length) throw Object.assign(new Error("Esta conta não está autorizada para acessar este recurso."), { status: 403 });
  const tags = await officerTags(env, user.id);
  const permissions = [...new Set(tags.flatMap((tag) => tag.permissions))];
  return { id: user.id, role: members[0].role || "policial", name: members[0].display_name || "", rosterId: members[0].roster_id || null, permissions, tags };
}

// Tags de um integrante. Sem a tabela de tags (tags.sql ainda não executado) o policial fica sem permissões extras.
export async function officerTags(env, userId) {
  try {
    const links = await supabase(env, "/rest/v1/rota_user_tags?select=tag_id&user_id=eq." + encodeURIComponent(userId), { method: "GET" });
    const ids = (Array.isArray(links) ? links : []).map((row) => row.tag_id);
    if (!ids.length) return [];
    const rows = await supabase(env, "/rest/v1/rota_tags?select=id,name,permissions&id=in.(" + ids.map(encodeURIComponent).join(",") + ")", { method: "GET" });
    return (Array.isArray(rows) ? rows : []).map((row) => ({ id: row.id, name: row.name, permissions: validPermissions(row.permissions) }));
  } catch (_) { return []; }
}

export async function requirePermission(request, env, permission, message) {
  const actor = await requireStaff(request, env);
  if (actor.role === "admin" || actor.permissions.includes(permission)) return actor;
  throw Object.assign(new Error(message || "Sua conta não tem permissão para esta ação. Peça a tag correspondente ao comando."), { status: 403 });
}
