import { handle, json, parseId, readBody, type RouteContext } from '@/lib/api';
import { requireUserId } from '@/lib/auth';
import { deletePlan, getPlan, updatePlan } from '@/lib/services/weekly';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: RouteContext) {
  return handle(async () => {
    const userId = await requireUserId(request);
    return json(await getPlan(userId, parseId(params.id)));
  });
}

/** goals / memo / retrospective 부분 수정 */
export async function PUT(request: Request, { params }: RouteContext) {
  return handle(async () => {
    const userId = await requireUserId(request);
    return json(await updatePlan(userId, parseId(params.id), await readBody(request)));
  });
}

export const PATCH = PUT;

export async function DELETE(request: Request, { params }: RouteContext) {
  return handle(async () => {
    const userId = await requireUserId(request);
    return json(await deletePlan(userId, parseId(params.id)));
  });
}
