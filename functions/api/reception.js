import { handleReception } from "../_shared/reception.js";

export function onRequest(context) {
  return handleReception(context.request, context.env || {});
}
