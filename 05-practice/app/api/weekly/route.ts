import { handle, json, readBody } from '@/lib/api';
import { requireUserId } from '@/lib/auth';
import { createPlan, listPlans } from '@/lib/services/weekly';

export const dynamic = 'force-dynamic';

/** ?weekStart=YYYY-MM-DD (해당 주, 0~1개) 또는 ?limit=N (최근 순) */
export async function GET(request: Request) {
  return handle(async () => {
    const userId = await requireUserId(request);
    return json(await listPlans(userId, new URL(request.url)));
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    const userId = await requireUserId(request);
    return json(await createPlan(userId, await readBody(request)), 201);
  });
}
