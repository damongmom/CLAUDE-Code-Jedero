import { handle, json, parseId, readBody, type RouteContext } from '@/lib/api';
import { requireUserId } from '@/lib/auth';
import { deleteTodo, getTodo, updateTodo } from '@/lib/services/todos';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: RouteContext) {
  return handle(async () => {
    const userId = await requireUserId(request);
    return json(await getTodo(userId, parseId(params.id)));
  });
}

/** 부분 수정. 드래그앤드랍은 { status, order }를 한 번에 보낸다. */
export async function PATCH(request: Request, { params }: RouteContext) {
  return handle(async () => {
    const userId = await requireUserId(request);
    return json(await updateTodo(userId, parseId(params.id), await readBody(request)));
  });
}

export const PUT = PATCH;

export async function DELETE(request: Request, { params }: RouteContext) {
  return handle(async () => {
    const userId = await requireUserId(request);
    return json(await deleteTodo(userId, parseId(params.id)));
  });
}
