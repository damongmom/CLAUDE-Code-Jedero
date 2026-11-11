import { handle, json, parseId, readBody, type RouteContext } from '@/lib/api';
import { deleteGoal, getGoal, updateGoal } from '@/lib/services/goals';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: RouteContext) {
  return handle(async () => json(await getGoal(parseId(params.id))));
}

export async function PUT(request: Request, { params }: RouteContext) {
  return handle(async () => json(await updateGoal(parseId(params.id), await readBody(request))));
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  return handle(async () => json(await deleteGoal(parseId(params.id))));
}
