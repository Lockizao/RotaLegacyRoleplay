// Acesso ao Supabase pelas Functions (chave secreta do servidor ou chave pública).

export function configuration(env, requireServiceKey) {
  const url = String(env.SUPABASE_URL || "").trim().replace(/\/$/, "");
  const serviceKey = String(env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  const publicKey = String(env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY || "").trim();
  if (!/^(?:https:\/\/|http:\/\/(?:localhost|127\.0\.0\.1)[:/])/i.test(url) || (requireServiceKey !== false && !serviceKey) || !publicKey) throw Object.assign(new Error("O administrador precisa configurar as variáveis Supabase na hospedagem."), { status: 503 });
  return { url, serviceKey, publicKey };
}

export async function supabase(env, endpoint, options, usePublic) {
  const cfg = configuration(env, !usePublic), key = usePublic ? cfg.publicKey : cfg.serviceKey, init = options || {};
  const headers = { apikey: key, "Content-Type": "application/json", ...(init.headers || {}) };
  if (!headers.Authorization && !/^sb_(?:publishable|secret)_/i.test(key)) headers.Authorization = "Bearer " + key;
  init.headers = headers;
  const response = await fetch(cfg.url + endpoint, init), body = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(body.message || body.msg || body.error_description || body.error || "Falha ao acessar o Supabase."), { status: response.status });
  return body;
}
