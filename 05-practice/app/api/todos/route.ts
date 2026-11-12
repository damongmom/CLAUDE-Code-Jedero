import { handle, json, readBody } from '@/lib/api';
import { requireUserId } from '@/lib/auth';
import { createTodo, listTodos } from '@/lib/services/todos';

export const dynamic = 'force-dynamic';

/** 필터: weeklyPlanId, weeklyGoalId, status, unlinked=true */
export async function GET(request: Request) {
  return handle(async () => {
    const userId = await requireUserId(request);
    return json(await listTodos(userId, new URL(request.url)));
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    const userId = await requireUserId(request);
    return json(await createTodo(userId, await readBody(request)), 201);
  });
}
