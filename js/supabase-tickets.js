(function () {
  "use strict";

  var config = window.ROTA_SUPABASE_CONFIG || {};
  var url = String(config.url || "").trim().replace(/\/$/, "");
  var key = String(config.publishableKey || "").trim();
  var SESSION_KEY = "rota-supabase-officer-session";
  var ADMIN_KEY = "rota-admin-session";
  var current = readSession();
  var adminToken = sessionStorage.getItem(ADMIN_KEY) || "";
  var profile = null;

  function readSession() {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null"); }
    catch (_) { return null; }
  }
  function saveSession(session) {
    current = session;
    if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else sessionStorage.removeItem(SESSION_KEY);
  }
  // Revoga a sessão do policial no Supabase (o refresh_token deixa de valer) antes de limpar o navegador.
  function signOut() {
    var officerToken = current && current.access_token && current.access_token !== "admin" ? current.access_token : "";
    if (officerToken && isConfigured()) {
      fetch(url + "/auth/v1/logout?scope=local", { method: "POST", headers: apiHeaders(officerToken), keepalive: true }).catch(function () {});
    }
    saveSession(null); adminToken = ""; profile = null; sessionStorage.removeItem(ADMIN_KEY);
  }
  function isConfigured() {
    return /^(?:https:\/\/|http:\/\/(?:localhost|127\.0\.0\.1)[:/])/i.test(url) && !!key && !/COLE_AQUI|SUA_CHAVE/i.test(key);
  }
  function isAdmin() {
    return !!(current && current.access_token === "admin" && adminToken);
  }
  function apiHeaders(accessToken, extra) {
    var result = { apikey: key, "Content-Type": "application/json" };
    if (accessToken) result.Authorization = "Bearer " + accessToken;
    else if (!/^sb_publishable_/i.test(key)) result.Authorization = "Bearer " + key;
    Object.keys(extra || {}).forEach(function (name) { result[name] = extra[name]; });
    return result;
  }
  // Só usa mensagens em texto; respostas de erro fora do padrão (ex.: 404 do servidor) viram o texto padrão.
  function messageFrom(body, fallback) {
    var found = [body && body.message, body && body.msg, body && body.error_description, body && body.error].find(function (value) { return typeof value === "string" && value.trim(); });
    return found || fallback;
  }
  async function responseData(response) {
    var body = await response.json().catch(function () { return {}; });
    if (!response.ok) throw new Error(messageFrom(body, "Erro na comunicação com o serviço."));
    return body;
  }
  async function functionCall(action, values, admin) {
    var headers = { "Content-Type": "application/json" };
    if (admin && adminToken) headers["x-rota-admin-session"] = adminToken;
    else if (admin && officerToken()) headers.Authorization = "Bearer " + officerToken();
    var response = await fetch("/api/police-access", {
      method: "POST", headers: headers, body: JSON.stringify(Object.assign({ action: action }, values || {}))
    });
    return responseData(response);
  }
  function officerToken() {
    return current && current.access_token && current.access_token !== "admin" ? current.access_token : "";
  }
  // Perfil do policial: tags, permissões e ficha do efetivo. Sem perfil, nenhuma permissão extra.
  async function loadProfile() {
    if (!officerToken()) { profile = null; return null; }
    try { profile = await functionCall("my-profile", {}, true); }
    catch (error) {
      // Conta suspensa no meio da sessão: sai e leva o motivo para a tela de login.
      if (/suspensa/i.test(error.message || "")) { signOut(); try { sessionStorage.setItem("rota-suspensao", error.message); } catch (_) {} throw error; }
      profile = { permissions: [], tags: [], roster: null, areas: [] };
    }
    return profile;
  }
  function can(permission) {
    return isAdmin() || !!(profile && Array.isArray(profile.permissions) && profile.permissions.indexOf(permission) !== -1);
  }
  function canArea(area) {
    return isAdmin() || !!(profile && Array.isArray(profile.areas) && profile.areas.indexOf(area) !== -1);
  }
  function canManage() {
    return isAdmin() || !!(profile && Array.isArray(profile.permissions) && profile.permissions.length);
  }
  function authHeaders() {
    if (isAdmin() && adminToken) return { "x-rota-admin-session": adminToken };
    return officerToken() ? { Authorization: "Bearer " + officerToken() } : {};
  }
  function normalizedName(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }
  function makeToken() {
    var bytes = new Uint8Array(6);
    if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(bytes);
    else for (var i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    return Array.from(bytes).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("").toUpperCase();
  }
  function makeTrackingToken() {
    var bytes = new Uint8Array(32);
    if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(bytes);
    else for (var i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    return Array.from(bytes).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
  }
  async function policeMembership(session) {
    if (!session || !session.access_token || !session.user || !session.user.id) return false;
    var query = "/rest/v1/police_users?select=user_id,display_name,role,enabled&user_id=eq." + encodeURIComponent(session.user.id) + "&enabled=eq.true";
    var rows = await responseData(await fetch(url + query, { headers: apiHeaders(session.access_token) }));
    if (!Array.isArray(rows) || !rows.length) return false;
    session.user.user_metadata = session.user.user_metadata || {};
    session.user.user_metadata.full_name = rows[0].display_name || session.user.user_metadata.full_name || session.user.email;
    session.user.user_metadata.role = rows[0].role || "policial";
    return true;
  }
  async function refreshSession() {
    if (!current || !current.refresh_token) return null;
    var res = await fetch(url + "/auth/v1/token?grant_type=refresh_token", {
      method: "POST", headers: apiHeaders(), body: JSON.stringify({ refresh_token: current.refresh_token })
    });
    var body = await responseData(res);
    current = { access_token: body.access_token, refresh_token: body.refresh_token, expires_at: Date.now() + (Number(body.expires_in) || 3600) * 1000, user: body.user };
    saveSession(current);
    return current;
  }
  async function validSession() {
    if (adminToken) {
      try {
        var result = await functionCall("admin-session", {}, true);
        if (result && result.valid) {
          current = { access_token: "admin", user: { id: "rota-admin", email: "admin@rota.invalid", user_metadata: { full_name: "Administrador ROTA", role: "admin" } } };
          return true;
        }
      } catch (_) {}
      adminToken = "";
      sessionStorage.removeItem(ADMIN_KEY);
    }
    if (!isConfigured() || !current || current.access_token === "admin") return false;
    try {
      if (current.expires_at && current.expires_at < Date.now() + 60000) await refreshSession();
      var ok = await policeMembership(current);
      if (!ok) saveSession(null);
      else await loadProfile();
      return ok;
    } catch (_) { return false; }
  }
  async function signIn(name, token) {
    if (!isConfigured()) throw new Error("Configure a URL e a chave publishable em js/supabase-config.js e publique as funções do portal.");
    var body = await functionCall("officer-login", { name: String(name || "").trim(), token: String(token || "") });
    var session = body.session;
    if (!session || !session.access_token || !(await policeMembership(session))) throw new Error("A conta não está ativa. Peça aprovação à administração da ROTA.");
    session.expires_at = Date.now() + (Number(session.expires_in) || 3600) * 1000;
    adminToken = "";
    sessionStorage.removeItem(ADMIN_KEY);
    saveSession(session);
    await loadProfile();
    return session;
  }
  async function adminLogin(username, password) {
    var body = await functionCall("admin-login", { username: String(username || "").trim(), password: String(password || "") });
    adminToken = body.adminToken || "";
    if (!adminToken) throw new Error("O servidor não retornou uma sessão administrativa.");
    sessionStorage.setItem(ADMIN_KEY, adminToken);
    saveSession(null);
    current = { access_token: "admin", user: { id: "rota-admin", email: "admin@rota.invalid", user_metadata: { full_name: "Administrador ROTA", role: "admin" } } };
    return current;
  }
  async function requestAccess(name) { return functionCall("request-access", { name: String(name || "").trim() }); }
  async function requestTokenReset(name) { return functionCall("request-reset", { name: String(name || "").trim() }); }
  async function adminAction(action, values) {
    if (!adminToken && !officerToken()) throw new Error("Sua sessão expirou. Entre novamente.");
    return functionCall(action, values, true);
  }
  async function applicationCall(action, values) {
    var response = await fetch("/api/edital-applications", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.assign({ action: action }, values || {}))
    });
    var body = await response.json().catch(function () { return {}; });
    if (!response.ok) {
      var error = new Error(messageFrom(body, "Não foi possível processar a candidatura."));
      error.status = response.status;
      error.availableAt = body.availableAt || null;
      error.remainingSeconds = body.remainingSeconds || 0;
      throw error;
    }
    return body;
  }
  function checkApplicationCooldown(playerId) {
    return applicationCall("check", { playerId: String(playerId || "").trim() });
  }
  function submitApplication(details) {
    return applicationCall("submit", details || {});
  }
  async function authedFetch(path, options) {
    if (current && current.access_token === "admin") throw new Error("A administração acessa este módulo pelo painel seguro.");
    if (!current || !current.access_token) throw new Error("Entre novamente no portal policial.");
    if (current.expires_at && current.expires_at < Date.now() + 60000) await refreshSession();
    var init = options || {};
    init.headers = apiHeaders(current.access_token, init.headers);
    return fetch(url + path, init);
  }
  function tableFor(kind) {
    if (kind === "ouvidoria") return "ouvidoria_tickets";
    if (kind === "bo") return "bo_tickets";
    throw new Error("Tipo de ticket inválido.");
  }
  function rowToTicket(row, kind) {
    return {
      id: row.public_id, uuid: row.id, type: kind, discord: row.discord,
      player: row.player, legacyName: row.legacy_name || "", reason: row.reason || "",
      category: row.category || "", title: row.category || row.reason || "",
      detail: row.detail || "", status: row.status || "Pendente",
      created: row.created_at ? new Date(row.created_at).toLocaleString("pt-BR") : "",
      createdAt: row.created_at || "", decisionAt: row.decision_at ? new Date(row.decision_at).toLocaleString("pt-BR") : "",
      trackingToken: row.tracking_token || ""
    };
  }
  async function submit(kind, details) {
    if (!isConfigured()) throw new Error("O atendimento online está indisponível no momento. Tente novamente mais tarde ou procure a ROTA no Discord da cidade.");
    var isBo = kind === "bo", table = tableFor(kind);
    var record = {
      public_id: (isBo ? "BO-" : "OUV-") + makeToken(), tracking_token: makeTrackingToken(),
      discord: String(details.discord || "").trim(), player: String(details.player || "").trim(),
      legacy_name: String(details.legacyName || "").trim(), reason: String(details.reason || "").trim(),
      category: String(details.category || "").trim(), detail: String(details.detail || "").trim(), status: "Pendente"
    };
    var response = await fetch(url + "/rest/v1/" + table, {
      method: "POST", headers: apiHeaders(null, { Prefer: "return=minimal" }), body: JSON.stringify(record)
    });
    await responseData(response);
    return rowToTicket(Object.assign({ created_at: new Date().toISOString() }, record), kind);
  }
  async function getCitizenStatus(kind, publicId, token) {
    if (!isConfigured() || !publicId || !token) return null;
    var table = tableFor(kind);
    var query = "/rest/v1/" + table + "?select=public_id,status,decision_at,created_at&public_id=eq." + encodeURIComponent(publicId);
    var res = await fetch(url + query, { headers: apiHeaders(null, { "x-ticket-token": token }) });
    var rows = await responseData(res);
    return Array.isArray(rows) && rows.length ? rows[0] : null;
  }
  async function list(kind) {
    if (isAdmin()) {
      var adminResult = await adminAction("tickets-list", { kind: kind });
      return (adminResult.rows || []).map(function (row) { return rowToTicket(row, kind); });
    }
    var table = tableFor(kind);
    var query = "/rest/v1/" + table + "?select=id,public_id,discord,player,legacy_name,reason,category,detail,status,created_at,decision_at&order=created_at.desc";
    var rows = await responseData(await authedFetch(query));
    return rows.map(function (row) { return rowToTicket(row, kind); });
  }
  async function decide(kind, publicId, status) {
    if (status !== "Aceito" && status !== "Recusado") throw new Error("Decisão inválida.");
    if (isAdmin()) {
      var adminResult = await adminAction("ticket-decide", { kind: kind, publicId: publicId, status: status });
      return rowToTicket(adminResult.row, kind);
    }
    var table = tableFor(kind);
    var query = "/rest/v1/" + table + "?select=id,public_id,discord,player,legacy_name,reason,category,detail,status,created_at,decision_at&public_id=eq." + encodeURIComponent(publicId) + "&status=eq.Pendente";
    var rows = await responseData(await authedFetch(query, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ status: status, decision_at: new Date().toISOString() }) }));
    if (!Array.isArray(rows) || !rows.length) throw new Error("O ticket já foi decidido ou não está mais disponível.");
    return rowToTicket(rows[0], kind);
  }

  async function protectedRequest(endpoint, method, payload) {
    var headers = { "Content-Type": "application/json" };
    if (isAdmin() && adminToken) headers["x-rota-admin-session"] = adminToken;
    else if (current && current.access_token && current.access_token !== "admin") headers.Authorization = "Bearer " + current.access_token;
    var response = await fetch(endpoint, { method: method, headers: headers, body: payload ? JSON.stringify(payload) : undefined });
    var body = await response.json().catch(function () { return {}; });
    if (!response.ok) throw new Error(messageFrom(body, "Falha ao acessar o servidor."));
    return body;
  }
  async function optimizeBlacklistPhoto(file) {
    if (!file || !/^image\/(?:jpeg|png|webp)$/i.test(file.type || "")) throw new Error("Escolha uma imagem JPG, PNG ou WebP.");
    if (file.size > 12 * 1024 * 1024) throw new Error("A foto original precisa ter menos de 12 MB.");
    if (typeof window.createImageBitmap !== "function") {
      if (file.size > 3 * 1024 * 1024) throw new Error("Este navegador não consegue otimizar a foto. Use uma imagem de até 3 MB.");
      return file;
    }
    var bitmap;
    try { bitmap = await window.createImageBitmap(file); }
    catch (_) { throw new Error("Não foi possível abrir essa imagem. Escolha outra foto."); }
    var scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height));
    var canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    var context = canvas.getContext("2d");
    context.fillStyle = "#111820";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    var blob = await new Promise(function (resolve) { canvas.toBlob(resolve, "image/jpeg", 0.82); });
    if (!blob || blob.size > 3 * 1024 * 1024) throw new Error("A foto continuou muito grande após otimização. Escolha uma imagem menor.");
    return new File([blob], "rota-blacklist-" + Date.now() + ".jpg", { type: "image/jpeg" });
  }
  async function uploadBlacklistPhoto(file) {
    if (!can("blacklist.gerenciar")) throw new Error("Sua conta não pode alterar a blacklist.");
    var optimized = await optimizeBlacklistPhoto(file), form = new FormData();
    form.append("photo", optimized);
    var headers = authHeaders();
    var response = await fetch("/api/blacklist-photo", { method: "POST", headers: headers, body: form });
    var body = await response.json().catch(function () { return {}; });
    if (!response.ok) throw new Error(messageFrom(body, "Falha ao enviar a foto."));
    return body;
  }
  async function listBlacklist() { var result = await protectedRequest("/api/blacklist", "GET"); return result.rows || []; }
  async function addBlacklist(details) { return protectedRequest("/api/blacklist", "POST", details); }
  async function removeBlacklist(id) { return protectedRequest("/api/blacklist", "DELETE", { id: id }); }
  async function listArrests() { var result = await protectedRequest("/api/arrests", "GET"); return result.rows || []; }
  async function createArrest(record) { return protectedRequest("/api/arrests", "POST", record); }
  async function notifyArrest(record) { return protectedRequest("/api/arrest-notify", "POST", record); }
  async function uploadArrestPhoto(file) {
    if (!current || (!isAdmin() && !current.access_token)) throw new Error("Entre como policial para anexar as fotos do registro.");
    var optimized = await optimizeBlacklistPhoto(file), form = new FormData(); form.append("photo", optimized);
    var headers = {};
    if (isAdmin() && adminToken) headers["x-rota-admin-session"] = adminToken;
    else if (current.access_token) headers.Authorization = "Bearer " + current.access_token;
    var response = await fetch("/api/arrest-photo", { method: "POST", headers: headers, body: form });
    var body = await response.json().catch(function () { return {}; });
    if (!response.ok) throw new Error(messageFrom(body, "Falha ao enviar a foto da apreensão."));
    return body;
  }
  async function removeArrest(id) { return protectedRequest("/api/arrests", "DELETE", { id: id }); }
  async function listBoard(kind) { var result = await protectedRequest("/api/board?kind=" + encodeURIComponent(kind), "GET"); return result.rows || []; }
  async function createBoardEntry(record) { return protectedRequest("/api/board", "POST", record); }
  async function updateBoardStatus(id, status) { return protectedRequest("/api/board", "PATCH", { id: id, status: status }); }
  async function removeBoardEntry(id) { return protectedRequest("/api/board", "DELETE", { id: id }); }
  async function listContent(type) {
    var response = await fetch("/api/content?type=" + encodeURIComponent(type), { method: "GET", headers: { Accept: "application/json" } });
    var body = await response.json().catch(function () { return {}; });
    if (!response.ok) throw new Error(messageFrom(body, "O serviço não respondeu. Tente atualizar em instantes."));
    return body.rows || [];
  }
  async function publishContent(record) { return protectedRequest("/api/content", "POST", record); }
  async function removeContent(type, id) { return protectedRequest("/api/content", "DELETE", { type: type, id: id }); }
  async function listRoster() {
    var response = await fetch("/api/roster", { method: "GET", headers: { Accept: "application/json" } });
    var body = await response.json().catch(function () { return {}; });
    if (!response.ok) throw new Error(messageFrom(body, "O serviço não respondeu. Tente atualizar em instantes."));
    return body.rows || [];
  }
  async function saveRoster(record) { return protectedRequest("/api/roster", "POST", record); }
  async function uploadRosterPhoto(file) {
    if (!can("efetivo.gerenciar")) throw new Error("Sua conta não pode alterar o efetivo.");
    var optimized = await optimizeBlacklistPhoto(file), form = new FormData();
    form.append("photo", optimized);
    var response = await fetch("/api/roster-photo", { method: "POST", headers: authHeaders(), body: form });
    var body = await response.json().catch(function () { return {}; });
    if (!response.ok) throw new Error(messageFrom(body, "Falha ao enviar a foto."));
    return body;
  }

  window.ROTA_TICKETS = {
    isConfigured: isConfigured,
    current: function () { return current; },
    isAdmin: isAdmin,
    can: can,
    canManage: canManage,
    canArea: canArea,
    profile: function () { return profile; },
    loadProfile: loadProfile,
    restore: validSession,
    signIn: signIn,
    adminLogin: adminLogin,
    requestAccess: requestAccess,
    requestTokenReset: requestTokenReset,
    adminAction: adminAction,
    signOut: signOut,
    submit: submit,
    getCitizenStatus: getCitizenStatus,
    list: list,
    decide: decide,
    checkApplicationCooldown: checkApplicationCooldown,
    submitApplication: submitApplication,
    listBlacklist: listBlacklist,
    uploadBlacklistPhoto: uploadBlacklistPhoto,
    addBlacklist: addBlacklist,
    removeBlacklist: removeBlacklist,
    listArrests: listArrests,
    createArrest: createArrest,
    notifyArrest: notifyArrest,
    uploadArrestPhoto: uploadArrestPhoto,
    removeArrest: removeArrest,
    listBoard: listBoard,
    createBoardEntry: createBoardEntry,
    updateBoardStatus: updateBoardStatus,
    removeBoardEntry: removeBoardEntry,
    listContent: listContent,
    publishContent: publishContent,
    removeContent: removeContent,
    listRoster: listRoster,
    saveRoster: saveRoster,
    uploadRosterPhoto: uploadRosterPhoto
  };
})();
