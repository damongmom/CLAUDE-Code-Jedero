import { handle, json, parseId, readBody, type RouteContext } from '@/lib/api';
import { deleteTodo, getTodo, updateTodo } from '@/lib/services/todos';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: RouteContext) {
  return handle(async () => json(await getTodo(parseId(params.id))));
}

/** 부분 수정. 드래그앤드랍은 { status, order }를 한 번에 보낸다. */
export async function PATCH(request: Request, { params }: RouteContext) {
  return handle(async () => json(await updateTodo(parseId(params.id), await readBody(request))));
}

export const PUT = PATCH;

export async function DELETE(_request: Request, { params }: RouteContext) {
  return handle(async () => json(await deleteTodo(parseId(params.id))));
}
