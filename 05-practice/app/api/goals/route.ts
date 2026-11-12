import { handle, json, readBody } from '@/lib/api';
import { requireUserId } from '@/lib/auth';
import { createGoal, listGoalsWithProgress } from '@/lib/services/goals';

export const dynamic = 'force-dynamic';

// 인증은 반드시 handle 안(DB 연결 뒤)에서 한다. DB 설정 오류가 401보다 먼저 503으로 보이게 하기 위함.

export async function GET(request: Request) {
  return handle(async () => json(await listGoalsWithProgress(await requireUserId(request))));
}

export async function POST(request: Request) {
  return handle(async () => {
    const userId = await requireUserId(request);
    return json(await createGoal(userId, await readBody(request)), 201);
  });
}
