import { handleAvatar } from "../_shared/avatar.js";

export function onRequest(context) {
  return handleAvatar(context.request, context.env || {});
}
