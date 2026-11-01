import { handleContent } from "../_shared/content.js";

export function onRequest(context) {
  return handleContent(context.request, context.env || {});
}
