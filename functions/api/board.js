import { handleBoard } from "../_shared/board.js";

export function onRequest(context) {
  return handleBoard(context.request, context.env || {});
}
