import { handle, json, parseId, readBody, type RouteContext } from '@/lib/api';
import { deletePlan, getPlan, updatePlan } from '@/lib/services/weekly';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: RouteContext) {
  return handle(async () => json(await getPlan(parseId(params.id))));
}

/** goals / memo / retrospective 부분 수정 */
export async function PUT(request: Request, { params }: RouteContext) {
  return handle(async () => json(await updatePlan(parseId(params.id), await readBody(request))));
}

export const PATCH = PUT;

export async function DELETE(_request: Request, { params }: RouteContext) {
  return handle(async () => json(await deletePlan(parseId(params.id))));
}
