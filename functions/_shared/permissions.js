// Permissões que uma tag ou um poder avulso pode conceder. O administrador do servidor (ROTA_ADMIN_*) tem todas.
export const PERMISSIONS = {
  "tags.gerenciar": "Criar e editar tags e distribuí-las",
  "acessos.gerenciar": "Aprovar pedidos de acesso, gerar tokens, vincular fichas e ativar ou desativar contas",
  "efetivo.gerenciar": "Cadastrar e editar o efetivo",
  "comunicados.publicar": "Publicar e remover comunicados",
  "editais.gerenciar": "Publicar editais e ver as candidaturas",
  "blacklist.gerenciar": "Incluir e remover personagens da blacklist",
  "integrantes.remover": "Remover integrantes (desligamento e exoneração)",
  "integrantes.suspender": "Suspender integrantes com prazo e motivo, e cancelar suspensões",
  "patentes.promover": "Promover e rebaixar integrantes",
  "regras.ajustar": "Mudar a patente mínima de cada área do site",
  "registros.moderar": "Apagar prisões, procurados, operações e registros feitos por outros"
};

export const ALL_PERMISSIONS = Object.keys(PERMISSIONS);

export function validPermissions(list) {
  return Array.isArray(list) ? [...new Set(list.filter((p) => ALL_PERMISSIONS.includes(p)))] : [];
}

// Áreas da área policial liberadas por patente (a patente mínima fica em rota_area_rules).
export const AREAS = {
  "painel": "Painel policial",
  "codigo-penal": "Código Penal e regras de roubo",
  "efetivo": "Efetivo",
  "blacklist": "Blacklist",
  "balanco": "Balanço operacional",
  "bo.ver": "Ver B.O. recebidos",
  "bo.decidir": "Aceitar ou recusar B.O.",
  "ouvidoria.ver": "Ver tickets da Ouvidoria",
  "ouvidoria.decidir": "Decidir tickets da Ouvidoria",
  "prisoes.ver": "Ver registros de prisão",
  "prisoes.registrar": "Registrar prisão",
  "procurados.ver": "Ver procurados",
  "procurados.cadastrar": "Cadastrar procurado",
  "operacoes.ver": "Ver operações",
  "operacoes.criar": "Criar e atualizar operação",
  "registros.ver": "Ver registros de cena",
  "registros.criar": "Criar registro de cena"
};

// Patentes em ordem (nível = posição). O banco guarda a mesma lista em rota_ranks.
export const RANKS = ["Recruta", "Soldado", "Cabo", "3º Sargento", "2º Sargento", "1º Sargento", "Subtenente", "Aspirante a Oficial", "2º Tenente", "1º Tenente", "Capitão", "Major", "Tenente-Coronel", "Coronel", "Sub Comandante", "Comandante Geral"];
export const ADMIN_LEVEL = 99;
export function rankLevel(rank) {
  const index = RANKS.indexOf(String(rank || "").trim());
  return index < 0 ? 0 : index;
}

// Categorias de conta (police_users.role). Só "policial" com ficha do efetivo entra na área policial.
// Advogado e imprensa estão previstos: ainda não têm telas nem acessos.
export const ROLES = {
  visitante: { label: "Visitante", description: "Cidadão com conta: vê só o portal público." },
  policial: { label: "Integrante da ROTA", description: "Acesso pela patente da ficha do efetivo." },
  advogado: { label: "Advogado", description: "Previsto: consultas sobre os próprios clientes.", planned: true },
  imprensa: { label: "Imprensa", description: "Previsto: informações públicas para reportagens.", planned: true }
};
export function isMemberRole(role) {
  return role === "policial";
}
