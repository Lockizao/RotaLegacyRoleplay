// Respostas e validações comuns a todas as Functions do portal.

export function json(status, payload) {
  return new Response(JSON.stringify(payload), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" } });
}

// Erro com status HTTP; os handlers devolvem error.status e error.message ao cliente.
export function fail(status, message) {
  return Object.assign(new Error(message), { status });
}

// Remove caracteres de controle (mantém tab e, se multiline, quebra de linha), apara e limita o tamanho.
export function clean(value, limit, multiline) {
  return Array.from(String(value || "")).filter((character) => { const code = character.charCodeAt(0); return code >= 32 || code === 9 || (multiline && code === 10); }).join("").trim().slice(0, limit);
}

// Bloqueia requisições de outra origem; sem cabeçalho Origin a requisição segue (ver T-10 na auditoria).
export function originError(request) {
  const origin = request.headers.get("origin");
  if (!origin || origin === "null") return null;
  try { if (new URL(origin).host.toLowerCase() !== new URL(request.url).host.toLowerCase()) return "Origem não autorizada."; }
  catch (_) { return "Origem inválida."; }
  return null;
}

export function encodeBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

export function decodeBase64Url(value) {
  const base64 = String(value).replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - base64.length % 4) % 4);
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}
