import { clean, encodeBase64Url, fail, json, originError } from "./http.js";
import { requireAdmin, requireStaff, signAdmin } from "./auth.js";
import { ALL_PERMISSIONS, PERMISSIONS, validPermissions } from "./permissions.js";
const MAX_BODY_BYTES = 16000;
const SESSION_SECONDS = 8 * 60 * 60;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function normalizeName(value) {
  return clean(value, 80).normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function syntheticEmail(normalized) {
  return "rota." + normalized + "@members.invalid";
}

function randomToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return encodeBase64Url(bytes);
}

function config(env) {
  const url = String(env.SUPABASE_URL || "").trim().replace(/\/$/, "");
  const serviceKey = String(env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  const publicKey = String(env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY || "").trim();
  if (!/^(?:https:\/\/|http:\/\/(?:localhost|127\.0\.0\.1)[:/])/i.test(url) || !serviceKey || !publicKey) {
    throw new Error("O administrador precisa configurar as variáveis Supabase na hospedagem.");
  }
  return { url, serviceKey, publicKey };
}

async function callSupabase(env, path, options, usePublicKey) {
  const cfg = config(env);
  const key = usePublicKey ? cfg.publicKey : cfg.serviceKey;
  const init = options || {};
  const headers = { apikey: key, "Content-Type": "application/json", ...(init.headers || {}) };
  if (!/^sb_(?:publishable|secret)_/i.test(key)) headers.Authorization = "Bearer " + key;
  init.headers = headers;
  const response = await fetch(cfg.url + path, init);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.msg || body.message || body.error_description || body.error || "Falha ao acessar o banco de dados.");
    error.status = response.status;
    throw error;
  }
  return body;
}

async function db(env, path, method, body, prefer) {
  const headers = {};
  if (prefer) headers.Prefer = prefer;
  return callSupabase(env, "/rest/v1/" + path, {
    method: method || "GET",
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}

function getTicketTable(kind) {
  if (kind === "ouvidoria") return "ouvidoria_tickets";
  if (kind === "bo") return "bo_tickets";
  throw fail(400, "Tipo de ticket inválido.");
}

async function createAccessRequest(env, input, requestType) {
  const name = clean(input.name, 80);
  const normalized = normalizeName(name);
  if (name.length < 2 || normalized.length < 2) throw fail(400, "Informe seu nome para continuar.");
  const row = { display_name: name, normalized_name: normalized, request_type: requestType, status: "Pendente" };
  try {
    await db(env, "access_requests", "POST", row, "return=minimal");
  } catch (error) {
    if (error.status === 409 || /duplicate|unique/i.test(error.message)) {
      return { ok: true, message: requestType === "acesso" ? "Se o nome foi enviado, a solicitação está aguardando análise." : "Se houver uma conta com este nome, a solicitação está aguardando análise." };
    }
    throw error;
  }
  return { ok: true, message: requestType === "acesso" ? "Pedido enviado. Aguarde a aprovação da administração da ROTA." : "Pedido enviado. Se a conta existir, a administração poderá gerar um novo token." };
}

async function officerLogin(env, input) {
  const normalized = normalizeName(input.name);
  const token = clean(input.token, 100);
  if (normalized.length < 2 || token.length < 12) throw fail(400, "Informe seu nome e o token recebido da administração.");
  let session;
  try {
    session = await callSupabase(env, "/auth/v1/token?grant_type=password", {
      method: "POST", body: JSON.stringify({ email: syntheticEmail(normalized), password: token })
    }, true);
  } catch (error) {
    if (error.status === 400 || error.status === 401) throw fail(401, "Nome ou token incorreto. Se esqueceu o token, solicite uma troca.");
    throw error;
  }
  const members = await db(env, "police_users?select=user_id,display_name,normalized_name,role,enabled&user_id=eq." + encodeURIComponent(session.user.id) + "&enabled=eq.true", "GET");
  if (!Array.isArray(members) || !members.length) throw fail(403, "Esta conta não está autorizada. Peça aprovação à administração.");
  await db(env, "login_events", "POST", { user_id: session.user.id, display_name: members[0].display_name, role: members[0].role || "policial", logged_at: new Date().toISOString() }, "return=minimal");
  session.user.user_metadata = session.user.user_metadata || {};
  session.user.user_metadata.full_name = members[0].display_name;
  session.user.user_metadata.role = members[0].role || "policial";
  return { session };
}

const ADMIN_LOCK_MINUTES = 15;
const ADMIN_MAX_FAILURES_PER_CLIENT = 5;
const ADMIN_MAX_FAILURES_TOTAL = 30;

async function adminClientKey(request, env) {
  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "local";
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(String(env.ROTA_SESSION_SECRET || "") + "|" + ip.split(",")[0].trim()));
  return encodeBase64Url(new Uint8Array(digest)).slice(0, 32);
}

// Bloqueia novas tentativas depois de muitos erros recentes, por IP e no total
// (o limite total cobre quem troca de IP a cada tentativa).
async function assertAdminNotLocked(env, clientKey) {
  const since = new Date(Date.now() - ADMIN_LOCK_MINUTES * 60 * 1000).toISOString();
  let failures;
  try {
    failures = await db(env, "admin_login_attempts?select=client_key&succeeded=eq.false&attempted_at=gte." + encodeURIComponent(since) + "&limit=" + ADMIN_MAX_FAILURES_TOTAL, "GET");
  } catch (_) {
    throw fail(503, "Login administrativo indisponível: execute o supabase/schema.sql atualizado no Supabase.");
  }
  const rows = Array.isArray(failures) ? failures : [];
  if (rows.length >= ADMIN_MAX_FAILURES_TOTAL || rows.filter((row) => row.client_key === clientKey).length >= ADMIN_MAX_FAILURES_PER_CLIENT) {
    throw fail(429, "Muitas tentativas de login. Aguarde " + ADMIN_LOCK_MINUTES + " minutos e tente novamente.");
  }
}

async function adminLogin(env, input, request) {
  config(env);
  const clientKey = await adminClientKey(request, env);
  await assertAdminNotLocked(env, clientKey);
  const expectedUser = String(env.ROTA_ADMIN_USERNAME || "");
  const expectedPassword = String(env.ROTA_ADMIN_PASSWORD || "");
  if (expectedPassword.length < 12) throw fail(503, "Defina uma senha administrativa forte na variável ROTA_ADMIN_PASSWORD.");
  const submittedUser = clean(input.username, 60);
  const submittedPassword = encoder.encode(String(input.password || ""));
  const expectedBuffer = encoder.encode(expectedPassword);
  const userOk = submittedUser.toLowerCase() === expectedUser.toLowerCase();
  let difference = submittedPassword.length ^ expectedBuffer.length;
  const length = Math.max(submittedPassword.length, expectedBuffer.length);
  for (let i = 0; i < length; i++) difference |= (submittedPassword[i] || 0) ^ (expectedBuffer[i] || 0);
  const succeeded = userOk && difference === 0;
  await db(env, "admin_login_attempts", "POST", { client_key: clientKey, succeeded }, "return=minimal");
  if (!succeeded) throw fail(401, "Usuário ou senha administrativa incorretos.");
  const now = Math.floor(Date.now() / 1000);
  return { adminToken: await signAdmin(env, { role: "admin", iat: now, exp: now + SESSION_SECONDS }) };
}

async function dashboardRows(env, key, path, issues) {
  try {
    return await db(env, path, "GET") || [];
  } catch (_) {
    issues.push(key);
    return [];
  }
}

async function dashboard(env, actor) {
  const issues = [];
  const [requests, officers, logins, boTickets, ouvidoriaTickets, applications, arrests, blacklist, roster] = await Promise.all([
    dashboardRows(env, "solicitações de acesso", "access_requests?select=id,display_name,normalized_name,request_type,status,created_at&order=created_at.desc&limit=150", issues),
    dashboardRows(env, "contas policiais", "police_users?select=user_id,display_name,normalized_name,role,enabled,created_at,roster_id&order=display_name.asc&limit=300", issues),
    dashboardRows(env, "histórico de acesso", "login_events?select=id,user_id,display_name,role,logged_at&order=logged_at.desc&limit=40", issues),
    dashboardRows(env, "B.O.", "bo_tickets?select=id,public_id,player,legacy_name,category,status,created_at&order=created_at.desc&limit=100", issues),
    dashboardRows(env, "Ouvidoria", "ouvidoria_tickets?select=id,public_id,player,legacy_name,category,status,created_at&order=created_at.desc&limit=100", issues),
    dashboardRows(env, "candidaturas", "edital_applications?select=id,edital_title,full_name,candidate_name,status,created_at&order=created_at.desc&limit=100", issues),
    dashboardRows(env, "registros de prisão", "arrest_records?select=id,character_name,player_id,officer,created_at&is_active=eq.true&order=created_at.desc&limit=30", issues),
    dashboardRows(env, "blacklist", "rota_blacklist?select=id,character_name,player_id,created_at&is_active=eq.true&order=created_at.desc&limit=100", issues),
    dashboardRows(env, "efetivo ROTA", "rota_roster?select=id,qra,full_name,rank,passport,admitted_on,birth_date,status,photo_path,photo_url,created_at,updated_at&order=qra.asc&limit=500", issues),
  ]);

  // As listas acima são só as mais recentes; a contagem de pendentes considera todos os tickets.
  const [pendingBo, pendingOuvidoria] = await Promise.all([
    dashboardRows(env, "B.O. pendentes", "bo_tickets?select=id&status=eq.Pendente&limit=10000", issues),
    dashboardRows(env, "Ouvidoria pendente", "ouvidoria_tickets?select=id&status=eq.Pendente&limit=10000", issues)
  ]);

  // Tags: quem as tem e o histórico recente. Sem tags.sql executado, as listas ficam vazias.
  const [tags, userTags, tagLog] = await Promise.all([
    db(env, "rota_tags?select=id,name,description,permissions,created_by,updated_at&order=name.asc", "GET").catch(() => []),
    db(env, "rota_user_tags?select=user_id,tag_id,granted_by,granted_at", "GET").catch(() => []),
    db(env, "rota_tag_log?select=id,action,actor,tag_name,target_name,created_at&order=created_at.desc&limit=40", "GET").catch(() => [])
  ]);
  const result = { requests, officers, logins, boTickets, ouvidoriaTickets, applications, arrests, blacklist, roster, pendingBoCount: pendingBo.length, pendingOuvidoriaCount: pendingOuvidoria.length, dataIssues: issues, tags: (tags || []).map((t) => ({ ...t, permissions: validPermissions(t.permissions) })), userTags: userTags || [], tagLog: tagLog || [], catalog: PERMISSIONS };
  // Quem entra por tag só recebe os dados das áreas que pode gerenciar.
  if (actor && actor.role !== "admin") {
    const can = (p) => actor.permissions.includes(p), people = can("acessos.gerenciar") || can("tags.gerenciar");
    if (!can("acessos.gerenciar")) { result.requests = []; result.logins = []; }
    if (!people) result.officers = [];
    if (!can("editais.gerenciar")) result.applications = [];
    if (!can("tags.gerenciar")) result.tagLog = [];
    result.permissions = actor.permissions;
  }
  return result;
}

async function issueForOfficer(env, userId, reactivate) {
  const rows = await db(env, "police_users?select=user_id,display_name,normalized_name,role,enabled&user_id=eq." + encodeURIComponent(userId) + "&limit=1", "GET");
  if (!Array.isArray(rows) || !rows.length) throw fail(404, "Integrante não encontrado.");
  if (!rows[0].enabled && !reactivate) throw fail(409, "Esta conta está desativada. Reative antes de trocar o token.");
  const token = randomToken();
  await callSupabase(env, "/auth/v1/admin/users/" + encodeURIComponent(userId), { method: "PUT", body: JSON.stringify({ password: token }) });
  if (!rows[0].enabled) await db(env, "police_users?user_id=eq." + encodeURIComponent(userId), "PATCH", { enabled: true }, "return=minimal");
  await db(env, "access_requests?normalized_name=eq." + encodeURIComponent(rows[0].normalized_name) + "&request_type=eq.troca_token&status=eq.Pendente", "PATCH", { status: "Aprovado", decided_at: new Date().toISOString() }, "return=minimal");
  return { ok: true, displayName: rows[0].display_name, token };
}

// ---------- tags e perfil ----------

function canHandle(actor, permissions) {
  return actor.role === "admin" || permissions.every((p) => actor.permissions.includes(p));
}

async function logTag(env, entry) {
  await db(env, "rota_tag_log", "POST", entry, "return=minimal").catch(() => {});
}

async function myProfile(env, actor) {
  if (actor.role === "admin") return { role: "admin", name: "Administração", permissions: ALL_PERMISSIONS, tags: [], roster: null };
  let roster = null;
  if (actor.rosterId) {
    const rows = await db(env, "rota_roster?select=id,qra,full_name,rank,passport,status,photo_url&id=eq." + encodeURIComponent(actor.rosterId) + "&limit=1", "GET").catch(() => []);
    if (Array.isArray(rows) && rows.length) roster = { id: rows[0].id, qra: rows[0].qra, fullName: rows[0].full_name, rank: rows[0].rank, passport: rows[0].passport, status: rows[0].status, photoUrl: rows[0].photo_url || "" };
  }
  return { role: actor.role, name: actor.name, permissions: actor.permissions, tags: actor.tags.map((t) => ({ id: t.id, name: t.name })), roster };
}

async function tagsList(env) {
  const tags = await db(env, "rota_tags?select=id,name,description,permissions,created_by,updated_at&order=name.asc", "GET");
  return { tags: (tags || []).map((t) => ({ ...t, permissions: validPermissions(t.permissions) })), catalog: PERMISSIONS };
}

async function tagSave(env, actor, actorName, input) {
  const name = clean(input.name, 40), description = clean(input.description, 200), permissions = validPermissions(input.permissions);
  if (name.length < 2) throw fail(400, "Dê um nome para a tag.");
  if (!permissions.length) throw fail(400, "Escolha ao menos uma permissão para a tag.");
  if (!canHandle(actor, permissions)) throw fail(403, "Você só pode dar a uma tag permissões que você mesmo tem.");
  const id = clean(input.id, 40);
  if (id) {
    const existing = await db(env, "rota_tags?select=id,permissions&id=eq." + encodeURIComponent(id) + "&limit=1", "GET");
    if (!existing.length) throw fail(404, "Tag não encontrada.");
    if (!canHandle(actor, validPermissions(existing[0].permissions))) throw fail(403, "Esta tag tem permissões que você não tem; só quem tem todas pode editá-la.");
    try {
      const rows = await db(env, "rota_tags?id=eq." + encodeURIComponent(id), "PATCH", { name, description, permissions, updated_at: new Date().toISOString() }, "return=representation");
      await logTag(env, { action: "editar", actor: actorName, tag_id: id, tag_name: name, details: { permissions } });
      return { tag: rows[0] };
    } catch (error) {
      if (error.status === 409 || /duplicate|unique/i.test(error.message)) throw fail(409, "Já existe uma tag com este nome.");
      throw error;
    }
  }
  const newId = normalizeName(name).slice(0, 40);
  if (newId.length < 2) throw fail(400, "Use letras ou números no nome da tag.");
  try {
    const rows = await db(env, "rota_tags", "POST", { id: newId, name, description, permissions, created_by: actorName }, "return=representation");
    await logTag(env, { action: "criar", actor: actorName, tag_id: newId, tag_name: name, details: { permissions } });
    return { tag: rows[0] };
  } catch (error) {
    if (error.status === 409 || /duplicate|unique/i.test(error.message)) throw fail(409, "Já existe uma tag com este nome.");
    throw error;
  }
}

async function tagDelete(env, actor, actorName, input) {
  const id = clean(input.id, 40);
  const existing = await db(env, "rota_tags?select=id,name,permissions&id=eq." + encodeURIComponent(id) + "&limit=1", "GET");
  if (!existing.length) throw fail(404, "Tag não encontrada.");
  if (!canHandle(actor, validPermissions(existing[0].permissions))) throw fail(403, "Esta tag tem permissões que você não tem; só quem tem todas pode apagá-la.");
  await db(env, "rota_tags?id=eq." + encodeURIComponent(id), "DELETE", undefined, "return=minimal");
  await logTag(env, { action: "apagar", actor: actorName, tag_id: id, tag_name: existing[0].name });
  return { ok: true };
}

async function tagAssign(env, actor, actorName, input, grant) {
  const tagId = clean(input.tagId, 40), userId = clean(input.userId, 80);
  const [tags, users] = await Promise.all([
    db(env, "rota_tags?select=id,name,permissions&id=eq." + encodeURIComponent(tagId) + "&limit=1", "GET"),
    db(env, "police_users?select=user_id,display_name&user_id=eq." + encodeURIComponent(userId) + "&limit=1", "GET")
  ]);
  if (!tags.length) throw fail(404, "Tag não encontrada.");
  if (!users.length) throw fail(404, "Integrante não encontrado.");
  if (!canHandle(actor, validPermissions(tags[0].permissions))) throw fail(403, "Você só pode " + (grant ? "dar" : "tirar") + " tags cujas permissões você mesmo tem.");
  if (grant) await db(env, "rota_user_tags", "POST", { user_id: userId, tag_id: tagId, granted_by: actorName }, "resolution=ignore-duplicates,return=minimal");
  else await db(env, "rota_user_tags?user_id=eq." + encodeURIComponent(userId) + "&tag_id=eq." + encodeURIComponent(tagId), "DELETE", undefined, "return=minimal");
  await logTag(env, { action: grant ? "dar" : "tirar", actor: actorName, tag_id: tagId, tag_name: tags[0].name, target_user: userId, target_name: users[0].display_name });
  return { ok: true };
}

async function officerLink(env, actorName, input) {
  const userId = clean(input.userId, 80), rosterId = clean(input.rosterId, 36);
  if (!userId) throw fail(400, "Conta inválida.");
  if (rosterId && !/^[0-9a-f-]{36}$/i.test(rosterId)) throw fail(400, "Ficha do efetivo inválida.");
  try {
    const rows = await db(env, "police_users?user_id=eq." + encodeURIComponent(userId), "PATCH", { roster_id: rosterId || null }, "return=representation");
    if (!rows.length) throw fail(404, "Conta não encontrada.");
    await logTag(env, { action: "vincular", actor: actorName, target_user: userId, target_name: rows[0].display_name, details: { rosterId: rosterId || null } });
    return { officer: rows[0] };
  } catch (error) {
    if (error.status === 409 || /duplicate|unique/i.test(error.message)) throw fail(409, "Esta ficha do efetivo já está ligada a outra conta.");
    throw error;
  }
}

// Permissão exigida por ação. Ações fora da lista são só do administrador do servidor.
const ACTION_PERMISSION = {
  "request-decide": "acessos.gerenciar",
  "token-rotate": "acessos.gerenciar",
  "officer-toggle": "acessos.gerenciar",
  "officer-link": "acessos.gerenciar",
  "edital-applications-list": "editais.gerenciar",
  "tag-save": "tags.gerenciar",
  "tag-delete": "tags.gerenciar",
  "tag-grant": "tags.gerenciar",
  "tag-revoke": "tags.gerenciar"
};
const MANAGE_ACTIONS = ["admin-dashboard", "tags-list"];

async function handleAdmin(request, env, input) {
  if (input.action === "admin-session") { await requireAdmin(request, env, "Sessão administrativa inválida ou expirada."); return { valid: true }; }
  if (input.action === "my-profile") return myProfile(env, await requireStaff(request, env));
  const actor = await requireStaff(request, env).catch((error) => { if (error.status === 401 && !request.headers.get("authorization")) throw fail(401, "Sessão administrativa inválida ou expirada."); throw error; });
  const isServerAdmin = actor.role === "admin", needed = ACTION_PERMISSION[input.action];
  if (!isServerAdmin) {
    const allowed = needed ? actor.permissions.includes(needed) : MANAGE_ACTIONS.includes(input.action) && actor.permissions.length > 0;
    if (!allowed) throw fail(403, "Sua conta não tem permissão para esta ação. Peça a tag correspondente ao comando.");
  }
  const actorName = isServerAdmin ? "Administração" : (actor.name || "Integrante");
  if (input.action === "admin-dashboard") return dashboard(env, actor);
  if (input.action === "tags-list") return tagsList(env);
  if (input.action === "tag-save") return tagSave(env, actor, actorName, input);
  if (input.action === "tag-delete") return tagDelete(env, actor, actorName, input);
  if (input.action === "tag-grant" || input.action === "tag-revoke") return tagAssign(env, actor, actorName, input, input.action === "tag-grant");
  if (input.action === "officer-link") return officerLink(env, actorName, input);
  if (input.action === "edital-applications-list") {
    const rows = await db(env, "edital_applications?select=id,edital_id,edital_title,full_name,server_rg,candidate_name,player_id,real_age,rp_experience,police_experience,roleplay_definition,metagaming_definition,powergaming_definition,why_pmce,character_story,status,created_at&order=created_at.desc&limit=200", "GET");
    return { rows: rows || [] };
  }  if (input.action === "tickets-list") {
    const table = getTicketTable(input.kind);
    const rows = await db(env, table + "?select=id,public_id,discord,player,legacy_name,reason,category,detail,status,created_at,decision_at&order=created_at.desc&limit=300", "GET");
    return { rows: rows || [] };
  }
  if (input.action === "ticket-decide") {
    const table = getTicketTable(input.kind);
    const status = input.status === "Aceito" || input.status === "Recusado" ? input.status : "";
    const publicId = clean(input.publicId, 32);
    if (!status || !publicId) throw fail(400, "Decisão inválida.");
    const rows = await db(env, table + "?public_id=eq." + encodeURIComponent(publicId) + "&status=eq.Pendente", "PATCH", { status, decision_at: new Date().toISOString() }, "return=representation");
    if (!Array.isArray(rows) || !rows.length) throw fail(409, "Este ticket já foi decidido ou não está disponível.");
    return { row: rows[0] };
  }
  if (input.action === "request-decide") {
    const id = clean(input.id, 60);
    const decision = input.status === "Aprovado" || input.status === "Recusado" ? input.status : "";
    if (!id || !decision) throw fail(400, "Solicitação ou decisão inválida.");
    const requests = await db(env, "access_requests?select=id,display_name,normalized_name,request_type,status&id=eq." + encodeURIComponent(id) + "&limit=1", "GET");
    if (!requests.length || requests[0].status !== "Pendente") throw fail(409, "Solicitação não encontrada ou já analisada.");
    const requestRow = requests[0];
    if (requestRow.request_type === "acesso" && decision === "Aprovado") {
      const existing = await db(env, "police_users?select=user_id&normalized_name=eq." + encodeURIComponent(requestRow.normalized_name) + "&limit=1", "GET");
      if (existing.length) throw fail(409, "Já existe uma conta policial com este nome. Use a opção de troca de token.");
      const token = randomToken();
      let created;
      try {
        created = await callSupabase(env, "/auth/v1/admin/users", { method: "POST", body: JSON.stringify({ email: syntheticEmail(requestRow.normalized_name), password: token, email_confirm: true, user_metadata: { full_name: requestRow.display_name, name: requestRow.display_name, role: "policial" }, app_metadata: { role: "policial" } }) });
        await db(env, "police_users", "POST", { user_id: created.id, display_name: requestRow.display_name, normalized_name: requestRow.normalized_name, login_email: syntheticEmail(requestRow.normalized_name), role: "policial", enabled: true }, "return=minimal");
        await db(env, "access_requests?id=eq." + encodeURIComponent(id), "PATCH", { status: "Aprovado", decided_at: new Date().toISOString() }, "return=minimal");
      } catch (error) {
        if (created && created.id) {
          await db(env, "police_users?user_id=eq." + encodeURIComponent(created.id), "DELETE", undefined, "return=minimal").catch(() => {});
          await callSupabase(env, "/auth/v1/admin/users/" + encodeURIComponent(created.id), { method: "DELETE" }).catch(() => {});
        }
        throw error;
      }
      return { ok: true, displayName: requestRow.display_name, token };
    }
    if (requestRow.request_type === "troca_token" && decision === "Aprovado") {
      const account = await db(env, "police_users?select=user_id,enabled&normalized_name=eq." + encodeURIComponent(requestRow.normalized_name) + "&limit=1", "GET");
      if (!account.length) throw fail(404, "Não há conta policial para este pedido de troca.");
      return issueForOfficer(env, account[0].user_id, true);
    }
    await db(env, "access_requests?id=eq." + encodeURIComponent(id), "PATCH", { status: decision, decided_at: new Date().toISOString() }, "return=minimal");
    return { ok: true };
  }
  if (input.action === "token-rotate") return issueForOfficer(env, clean(input.userId, 80));
  if (input.action === "officer-toggle") {
    const userId = clean(input.userId, 80);
    if (!userId) throw fail(400, "Conta inválida.");
    const rows = await db(env, "police_users?select=user_id,enabled&user_id=eq." + encodeURIComponent(userId) + "&limit=1", "GET");
    if (!rows.length) throw fail(404, "Conta não encontrada.");
    const updated = await db(env, "police_users?user_id=eq." + encodeURIComponent(userId), "PATCH", { enabled: !rows[0].enabled }, "return=representation");
    return { officer: updated[0] };
  }
  throw fail(400, "Ação desconhecida.");
}

export async function handlePoliceAccess(request, env) {
  if (request.method !== "POST") return json(405, { error: "Método não permitido." });
  const rejectedOrigin = originError(request);
  if (rejectedOrigin) return json(403, { error: rejectedOrigin });
  const bodyText = await request.text();
  if (encoder.encode(bodyText).byteLength > MAX_BODY_BYTES) return json(413, { error: "Solicitação muito grande." });
  let input;
  try { input = JSON.parse(bodyText || "{}"); } catch (_) { return json(400, { error: "Dados inválidos." }); }
  if (!input || typeof input !== "object" || Array.isArray(input)) return json(400, { error: "Dados inválidos." });
  try {
    let result;
    if (input.action === "request-access") result = await createAccessRequest(env, input, "acesso");
    else if (input.action === "request-reset") result = await createAccessRequest(env, input, "troca_token");
    else if (input.action === "officer-login") result = await officerLogin(env, input);
    else if (input.action === "admin-login") result = await adminLogin(env, input, request);
    else result = await handleAdmin(request, env, input);
    return json(200, result || { ok: true });
  } catch (error) {
    const status = error.status || (/variáveis Supabase|ROTA_SESSION_SECRET/.test(error.message || "") ? 503 : 500);
    return json(status, { error: error.message || "Erro inesperado." });
  }
}
