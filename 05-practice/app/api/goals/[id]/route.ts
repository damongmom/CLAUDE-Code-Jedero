import { handle, json, parseId, readBody, type RouteContext } from '@/lib/api';
import { requireUserId } from '@/lib/auth';
import { deleteGoal, getGoal, updateGoal } from '@/lib/services/goals';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: RouteContext) {
  return handle(async () => {
    const userId = await requireUserId(request);
    return json(await getGoal(userId, parseId(params.id)));
  });
}

export async function PUT(request: Request, { params }: RouteContext) {
  return handle(async () => {
    const userId = await requireUserId(request);
    return json(await updateGoal(userId, parseId(params.id), await readBody(request)));
  });
}

export async function DELETE(request: Request, { params }: RouteContext) {
  return handle(async () => {
    const userId = await requireUserId(request);
    return json(await deleteGoal(userId, parseId(params.id)));
  });
}
