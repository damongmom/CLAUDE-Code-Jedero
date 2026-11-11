import { handle, json, readBody } from '@/lib/api';
import { createPlan, listPlans } from '@/lib/services/weekly';

export const dynamic = 'force-dynamic';

/** ?weekStart=YYYY-MM-DD (해당 주, 0~1개) 또는 ?limit=N (최근 순) */
export async function GET(request: Request) {
  return handle(async () => json(await listPlans(new URL(request.url))));
}

export async function POST(request: Request) {
  return handle(async () => json(await createPlan(await readBody(request)), 201));
}
