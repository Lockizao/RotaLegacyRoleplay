// Permissões que uma tag pode conceder. O administrador do servidor (ROTA_ADMIN_*) tem todas.
export const PERMISSIONS = {
  "tags.gerenciar": "Criar e editar tags e distribuí-las",
  "acessos.gerenciar": "Aprovar pedidos de acesso, gerar tokens e ativar ou desativar contas",
  "efetivo.gerenciar": "Cadastrar e editar o efetivo",
  "comunicados.publicar": "Publicar e remover comunicados",
  "editais.gerenciar": "Publicar editais e ver as candidaturas",
  "blacklist.gerenciar": "Incluir e remover personagens da blacklist"
};

export const ALL_PERMISSIONS = Object.keys(PERMISSIONS);

export function validPermissions(list) {
  return Array.isArray(list) ? [...new Set(list.filter((p) => ALL_PERMISSIONS.includes(p)))] : [];
}
