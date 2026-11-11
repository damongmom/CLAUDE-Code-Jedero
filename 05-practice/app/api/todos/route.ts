import { handle, json, readBody } from '@/lib/api';
import { createTodo, listTodos } from '@/lib/services/todos';

export const dynamic = 'force-dynamic';

/** 필터: weeklyPlanId, weeklyGoalId, status, unlinked=true */
export async function GET(request: Request) {
  return handle(async () => json(await listTodos(new URL(request.url))));
}

export async function POST(request: Request) {
  return handle(async () => json(await createTodo(await readBody(request)), 201));
}
