import { handle, json, readBody } from '@/lib/api';
import { createGoal, listGoalsWithProgress } from '@/lib/services/goals';

export const dynamic = 'force-dynamic';

export async function GET() {
  return handle(async () => json(await listGoalsWithProgress()));
}

export async function POST(request: Request) {
  return handle(async () => json(await createGoal(await readBody(request)), 201));
}
