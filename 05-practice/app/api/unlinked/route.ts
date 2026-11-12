import { badRequest, handle, json, parseId, readBody } from '@/lib/api';
import { requireUserId } from '@/lib/auth';
import { listUnlinked, updateTodo } from '@/lib/services/todos';
import { linkWeeklyGoal } from '@/lib/services/weekly';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return handle(async () => json(await listUnlinked(await requireUserId(request))));
}

/**
 * 재연결
 * - { kind: 'todo', todoId, weeklyGoalId }
 * - { kind: 'weeklyGoal', weeklyGoalId, goalId }
 */
export async function PATCH(request: Request) {
  return handle(async () => {
    const userId = await requireUserId(request);
    const body = await readBody(request);
    if (body.kind === 'todo') {
      return json(await updateTodo(userId, parseId(body.todoId, 'todoId'), { weeklyGoalId: body.weeklyGoalId }));
    }
    if (body.kind === 'weeklyGoal') {
      return json(
        await linkWeeklyGoal(userId, parseId(body.weeklyGoalId, 'weeklyGoalId'), parseId(body.goalId, 'goalId')),
      );
    }
    throw badRequest("kind는 'todo' 또는 'weeklyGoal'이어야 합니다.");
  });
}
