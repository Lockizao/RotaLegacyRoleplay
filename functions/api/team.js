import { handleTeam } from "../_shared/team.js";

export function onRequest(context) {
  return handleTeam(context.request, context.env || {});
}
