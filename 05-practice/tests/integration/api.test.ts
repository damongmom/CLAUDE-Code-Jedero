import { Types } from 'mongoose';
import { beforeEach, describe, expect, it } from 'vitest';
import { GoalModel } from '@/models/Goal';
import { TodoModel } from '@/models/Todo';
import * as goalItem from '@/app/api/goals/[id]/route';
import * as goals from '@/app/api/goals/route';
import * as todoItem from '@/app/api/todos/[id]/route';
import * as todos from '@/app/api/todos/route';
import * as unlinked from '@/app/api/unlinked/route';
import * as weeklyItem from '@/app/api/weekly/[id]/route';
import * as weekly from '@/app/api/weekly/route';
import type { GoalWithProgress, Todo, UnlinkedResponse, WeeklyPlan } from '@/types';
import { useTestDB } from '../helpers/db';
import { loginAs } from '../helpers/auth';
import { call as rawCall } from '../helpers/http';

useTestDB();

// 입력 주입: 모든 요청에 기본 사용자의 세션 쿠키를 붙인다. 기대값은 로그인 기능 추가 전과 같다.
let owner: Awaited<ReturnType<typeof loginAs>>;
beforeEach(async () => {
  owner = await loginAs('owner');
});
const call: typeof rawCall = (handler, options = {}) => rawCall(handler, { cookie: owner.cookie, ...options });

const WEEK = '2026-11-09';
const MISSING_ID = '0123456789abcdef01234567';

async function seedGoal(title = '취업 준비') {
  const res = await call<GoalWithProgress>(goals.POST, { method: 'POST', body: { title, description: '설명' } });
  expect(res.status).toBe(201);
  return res.body;
}

async function seedPlan(goalId: string, texts = ['알고리즘'], weekStart = WEEK) {
  const res = await call<WeeklyPlan>(weekly.POST, {
    method: 'POST',
    body: { weekStart, goals: texts.map((text) => ({ text, goalId })), memo: '' },
  });
  expect(res.status).toBe(201);
  return res.body;
}

async function seedTodo(weeklyGoalId: string, extra: Record<string, unknown> = {}) {
  const res = await call<Todo>(todos.POST, { method: 'POST', body: { title: '문제 풀기', weeklyGoalId, ...extra } });
  expect(res.status).toBe(201);
  return res.body;
}

describe('1년 목표 API', () => {
  it('생성/조회/수정/삭제', async () => {
    const goal = await seedGoal();
    expect((await call(goalItem.GET, { params: { id: goal._id } })).body.title).toBe('취업 준비');

    const updated = await call(goalItem.PUT, { method: 'PUT', params: { id: goal._id }, body: { title: '이직' } });
    expect(updated.status).toBe(200);
    expect(updated.body.title).toBe('이직');

    const list = await call<GoalWithProgress[]>(goals.GET);
    expect(list.body).toHaveLength(1);

    expect((await call(goalItem.DELETE, { method: 'DELETE', params: { id: goal._id } })).status).toBe(200);
    expect((await call(goalItem.GET, { params: { id: goal._id } })).status).toBe(404);
  });

  it('제목이 비면 400', async () => {
    expect((await call(goals.POST, { method: 'POST', body: { title: '  ' } })).status).toBe(400);
  });

  it('잘못된 JSON 본문은 400', async () => {
    expect((await call(goals.POST, { method: 'POST', body: '{bad' })).status).toBe(400);
  });
});

describe('id 검증', () => {
  it('잘못된 ObjectId는 400, 없는 id는 404', async () => {
    for (const handler of [goalItem.GET, weeklyItem.GET, todoItem.GET]) {
      expect((await call(handler, { params: { id: 'not-an-id' } })).status).toBe(400);
      expect((await call(handler, { params: { id: 'abcdefghijkl' } })).status).toBe(400);
      expect((await call(handler, { params: { id: MISSING_ID } })).status).toBe(404);
    }
  });
});

describe('주간 계획 API', () => {
  it('같은 주를 두 번 만들면 409', async () => {
    const goal = await seedGoal();
    await seedPlan(goal._id);
    const dup = await call(weekly.POST, { method: 'POST', body: { weekStart: WEEK } });
    expect(dup.status).toBe(409);
  });

  it('월요일이 아닌 weekStart는 400', async () => {
    expect((await call(weekly.POST, { method: 'POST', body: { weekStart: '2026-11-10' } })).status).toBe(400);
  });

  it('주간 목표 6개는 400', async () => {
    const goal = await seedGoal();
    const res = await call(weekly.POST, {
      method: 'POST',
      body: { weekStart: WEEK, goals: Array.from({ length: 6 }, (_, i) => ({ text: `g${i}`, goalId: goal._id })) },
    });
    expect(res.status).toBe(400);
  });

  it('1년 목표 없이 새 주간 목표를 추가하면 400', async () => {
    const res = await call(weekly.POST, { method: 'POST', body: { weekStart: WEEK, goals: [{ text: '혼자' }] } });
    expect(res.status).toBe(400);

    const goal = await seedGoal();
    const plan = await seedPlan(goal._id);
    const put = await call(weeklyItem.PUT, {
      method: 'PUT',
      params: { id: plan._id },
      body: { goals: [...plan.goals, { text: '새 목표', goalId: null }] },
    });
    expect(put.status).toBe(400);
  });

  it('존재하지 않는 1년 목표 연결은 400', async () => {
    const res = await call(weekly.POST, {
      method: 'POST',
      body: { weekStart: WEEK, goals: [{ text: 'x', goalId: MISSING_ID }] },
    });
    expect(res.status).toBe(400);
  });

  it('weekStart로 조회하고 메모를 수정한다', async () => {
    const goal = await seedGoal();
    const plan = await seedPlan(goal._id);
    const found = await call<WeeklyPlan[]>(weekly.GET, { path: `/api/weekly?weekStart=${WEEK}` });
    expect(found.body.map((p) => p._id)).toEqual([plan._id]);

    const put = await call<WeeklyPlan>(weeklyItem.PUT, {
      method: 'PUT',
      params: { id: plan._id },
      body: { memo: '이번 주는 집중' },
    });
    expect(put.body.memo).toBe('이번 주는 집중');
    expect(put.body.goals).toHaveLength(1);
  });

  it('최근 N주를 내림차순으로 조회한다', async () => {
    const goal = await seedGoal();
    await seedPlan(goal._id, ['a'], '2026-11-02');
    await seedPlan(goal._id, ['b'], '2026-11-09');
    const res = await call<WeeklyPlan[]>(weekly.GET, { path: '/api/weekly?limit=4' });
    expect(res.body.map((p) => p.weekStart)).toEqual(['2026-11-09', '2026-11-02']);
  });
});

describe('할 일 API', () => {
  it('weeklyGoalId 없이 만들면 400', async () => {
    expect((await call(todos.POST, { method: 'POST', body: { title: '고아' } })).status).toBe(400);
  });

  it('존재하지 않는 주간 목표로 만들면 400', async () => {
    const res = await call(todos.POST, { method: 'POST', body: { title: 'x', weeklyGoalId: MISSING_ID } });
    expect(res.status).toBe(400);
  });

  it('생성 시 status는 todo, weeklyPlanId는 서버가 채운다', async () => {
    const goal = await seedGoal();
    const plan = await seedPlan(goal._id);
    const todo = await seedTodo(plan.goals[0]._id);
    expect(todo.status).toBe('todo');
    expect(todo.weeklyPlanId).toBe(plan._id);
    expect(todo.order).toBeTypeOf('string');
  });

  it('PATCH 한 번으로 status와 order를 바꾼다', async () => {
    const goal = await seedGoal();
    const plan = await seedPlan(goal._id);
    const todo = await seedTodo(plan.goals[0]._id);
    const res = await call<Todo>(todoItem.PATCH, {
      method: 'PATCH',
      params: { id: todo._id },
      body: { status: 'done', order: 'a5' },
    });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'done', order: 'a5' });
    const reread = await call<Todo>(todoItem.GET, { params: { id: todo._id } });
    expect(reread.body).toMatchObject({ status: 'done', order: 'a5' });
  });

  it('잘못된 status/priority/dayOfWeek는 400', async () => {
    const goal = await seedGoal();
    const plan = await seedPlan(goal._id);
    const todo = await seedTodo(plan.goals[0]._id);
    for (const body of [{ status: 'archived' }, { priority: 'urgent' }, { dayOfWeek: 7 }, { dueDate: '2026-13-01' }]) {
      expect((await call(todoItem.PATCH, { method: 'PATCH', params: { id: todo._id }, body })).status).toBe(400);
    }
  });

  it('weeklyPlanId로 필터하고 order 순으로 정렬한다', async () => {
    const goal = await seedGoal();
    const plan = await seedPlan(goal._id);
    const first = await seedTodo(plan.goals[0]._id, { title: '1' });
    const second = await seedTodo(plan.goals[0]._id, { title: '2' });
    const res = await call<Todo[]>(todos.GET, { path: `/api/todos?weeklyPlanId=${plan._id}` });
    expect(res.body.map((t) => t._id)).toEqual([first._id, second._id]);
  });

  it('삭제한다', async () => {
    const goal = await seedGoal();
    const plan = await seedPlan(goal._id);
    const todo = await seedTodo(plan.goals[0]._id);
    expect((await call(todoItem.DELETE, { method: 'DELETE', params: { id: todo._id } })).status).toBe(200);
    expect((await call(todoItem.GET, { params: { id: todo._id } })).status).toBe(404);
  });
});

describe('삭제 규칙과 재연결 (PRD 4장)', () => {
  it('주간 목표를 제거하면 할 일은 남고 weeklyGoalId가 null이 된다', async () => {
    const goal = await seedGoal();
    const plan = await seedPlan(goal._id, ['A', 'B']);
    const [goalA, goalB] = plan.goals;
    const todo = await seedTodo(goalA._id);

    const put = await call(weeklyItem.PUT, { method: 'PUT', params: { id: plan._id }, body: { goals: [goalB] } });
    expect(put.status).toBe(200);

    const reread = await call<Todo>(todoItem.GET, { params: { id: todo._id } });
    expect(reread.status).toBe(200);
    expect(reread.body.weeklyGoalId).toBeNull();
    expect(reread.body.weeklyPlanId).toBe(plan._id);
  });

  it('1년 목표를 삭제하면 주간 목표는 남고 goalId가 null이 된다', async () => {
    const goal = await seedGoal();
    const keep = await seedGoal('다른 목표');
    const plan = await call<WeeklyPlan>(weekly.POST, {
      method: 'POST',
      body: { weekStart: WEEK, goals: [{ text: 'A', goalId: goal._id }, { text: 'B', goalId: keep._id }] },
    });

    await call(goalItem.DELETE, { method: 'DELETE', params: { id: goal._id } });

    const reread = await call<WeeklyPlan>(weeklyItem.GET, { params: { id: plan.body._id } });
    expect(reread.body.goals.map((g) => [g.text, g.goalId])).toEqual([
      ['A', null],
      ['B', keep._id],
    ]);
  });

  it('미연결 주간 목표는 goalId=null을 유지한 채 다른 필드를 수정할 수 있다', async () => {
    const goal = await seedGoal();
    const plan = await seedPlan(goal._id);
    await call(goalItem.DELETE, { method: 'DELETE', params: { id: goal._id } });
    const unlinkedGoal = { ...plan.goals[0], goalId: null };
    const put = await call(weeklyItem.PUT, {
      method: 'PUT',
      params: { id: plan._id },
      body: { goals: [{ ...unlinkedGoal, text: '이름 변경' }] },
    });
    expect(put.status).toBe(200);
  });

  it('미연결 목록을 조회하고 재연결하면 목록에서 빠진다', async () => {
    const goal = await seedGoal();
    const plan = await seedPlan(goal._id, ['A', 'B']);
    const todo = await seedTodo(plan.goals[0]._id);

    // 주간 목표 A 제거 → 할 일 미연결, 1년 목표 삭제 → 주간 목표 B 미연결
    await call(weeklyItem.PUT, { method: 'PUT', params: { id: plan._id }, body: { goals: [plan.goals[1]] } });
    await call(goalItem.DELETE, { method: 'DELETE', params: { id: goal._id } });

    let list = await call<UnlinkedResponse>(unlinked.GET);
    expect(list.body.todos.map((t) => t._id)).toEqual([todo._id]);
    expect(list.body.weeklyGoals.map((g) => g._id)).toEqual([plan.goals[1]._id]);
    expect(list.body.weeklyGoals[0]).toMatchObject({ planId: plan._id, weekStart: WEEK });

    const newGoal = await seedGoal('새 목표');
    const relinkGoal = await call(unlinked.PATCH, {
      method: 'PATCH',
      body: { kind: 'weeklyGoal', weeklyGoalId: plan.goals[1]._id, goalId: newGoal._id },
    });
    expect(relinkGoal.status).toBe(200);

    const relinkTodo = await call<Todo>(unlinked.PATCH, {
      method: 'PATCH',
      body: { kind: 'todo', todoId: todo._id, weeklyGoalId: plan.goals[1]._id },
    });
    expect(relinkTodo.status).toBe(200);
    expect(relinkTodo.body.weeklyGoalId).toBe(plan.goals[1]._id);

    list = await call<UnlinkedResponse>(unlinked.GET);
    expect(list.body).toEqual({ todos: [], weeklyGoals: [] });
  });

  it('연결된 할 일을 null로 끊는 요청은 400', async () => {
    const goal = await seedGoal();
    const plan = await seedPlan(goal._id);
    const todo = await seedTodo(plan.goals[0]._id);
    const res = await call(todoItem.PATCH, { method: 'PATCH', params: { id: todo._id }, body: { weeklyGoalId: null } });
    expect(res.status).toBe(400);
  });

  it('주간 계획을 삭제하면 할 일은 남고 연결이 끊긴다', async () => {
    const goal = await seedGoal();
    const plan = await seedPlan(goal._id);
    const todo = await seedTodo(plan.goals[0]._id);
    expect((await call(weeklyItem.DELETE, { method: 'DELETE', params: { id: plan._id } })).status).toBe(200);
    const reread = await call<Todo>(todoItem.GET, { params: { id: todo._id } });
    expect(reread.body).toMatchObject({ weeklyPlanId: null, weeklyGoalId: null });
  });
});

describe('목표별 진행률 (P1)', () => {
  it('연결된 할 일 2개 중 1개 done이면 50%', async () => {
    const goal = await seedGoal();
    const other = await seedGoal('할 일 없음');
    const plan = await seedPlan(goal._id);
    const a = await seedTodo(plan.goals[0]._id);
    await seedTodo(plan.goals[0]._id);
    await call(todoItem.PATCH, { method: 'PATCH', params: { id: a._id }, body: { status: 'done' } });

    const list = await call<GoalWithProgress[]>(goals.GET);
    const byId = Object.fromEntries(list.body.map((g) => [g._id, g]));
    expect(byId[goal._id]).toMatchObject({ progress: 50, todoCount: 2, doneCount: 1 });
    expect(byId[other._id]).toMatchObject({ progress: 0, todoCount: 0 });
  });
});

describe('리뷰 회귀 테스트', () => {
  it('라이브러리가 받지 않는 order 키는 400이고, 이후 할 일 생성은 정상이다', async () => {
    const goal = await seedGoal();
    const plan = await seedPlan(goal._id);
    const todo = await seedTodo(plan.goals[0]._id);
    for (const order of ['zzzz', 'b', '0', 'a10']) {
      const res = await call(todoItem.PATCH, { method: 'PATCH', params: { id: todo._id }, body: { status: 'todo', order } });
      expect(res.status, order).toBe(400);
    }
    expect((await call(todos.POST, { method: 'POST', body: { title: '다음', weeklyGoalId: plan.goals[0]._id } })).status).toBe(201);
  });

  it('사라진 주간 목표·1년 목표를 가리키는 끊긴 참조도 미연결 목록에 나온다', async () => {
    const goal = await seedGoal();
    const plan = await seedPlan(goal._id);
    // 동시 요청 경합으로 남을 수 있는 상태를 직접 만든다
    const dangling = await TodoModel.create({ userId: owner.userId, title: '끊긴 할 일', order: 'a0', weeklyGoalId: new Types.ObjectId() });
    await GoalModel.deleteOne({ _id: goal._id });

    const list = await call<UnlinkedResponse>(unlinked.GET);
    expect(list.body.todos.map((t) => t._id)).toEqual([String(dangling._id)]);
    expect(list.body.weeklyGoals.map((g) => g._id)).toEqual([plan.goals[0]._id]);
  });

  it('삭제된 1년 목표를 가리키는 주간 목표가 있어도 계획 편집을 저장할 수 있다', async () => {
    const goal = await seedGoal();
    const other = await seedGoal('다른 목표');
    const plan = await seedPlan(goal._id, ['A']);
    // 삭제 규칙을 거치지 않은 끊긴 참조 (동시 요청 경합 상황)
    await GoalModel.deleteOne({ _id: goal._id });

    // 1) 끊긴 id를 그대로 다시 보내면 미연결(null)로 정리된다
    const resend = await call<WeeklyPlan>(weeklyItem.PUT, {
      method: 'PUT',
      params: { id: plan._id },
      body: { goals: [{ _id: plan.goals[0]._id, text: 'A 이름 변경', goalId: goal._id }] },
    });
    expect(resend.status).toBe(200);
    expect(resend.body.goals[0]).toMatchObject({ text: 'A 이름 변경', goalId: null });

    // 2) 다른 끊긴 참조 상태에서 null로 보내도 허용된다
    await call(unlinked.PATCH, { method: 'PATCH', body: { kind: 'weeklyGoal', weeklyGoalId: plan.goals[0]._id, goalId: other._id } });
    await GoalModel.deleteOne({ _id: other._id });
    const asNull = await call(weeklyItem.PUT, {
      method: 'PUT',
      params: { id: plan._id },
      body: { goals: [{ _id: plan.goals[0]._id, text: 'A', goalId: null }] },
    });
    expect(asNull.status).toBe(200);

    // 3) 새 주간 목표에 존재하지 않는 1년 목표를 붙이는 것은 여전히 400
    const bad = await call(weeklyItem.PUT, {
      method: 'PUT',
      params: { id: plan._id },
      body: { goals: [{ _id: plan.goals[0]._id, text: 'A', goalId: null }, { text: 'B', goalId: goal._id }] },
    });
    expect(bad.status).toBe(400);
  });
});
