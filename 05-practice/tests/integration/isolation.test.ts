import { beforeEach, describe, expect, it } from 'vitest';
import * as goalItem from '@/app/api/goals/[id]/route';
import * as goals from '@/app/api/goals/route';
import * as me from '@/app/api/auth/me/route';
import * as logout from '@/app/auth/logout/route';
import * as todoItem from '@/app/api/todos/[id]/route';
import * as todos from '@/app/api/todos/route';
import * as unlinked from '@/app/api/unlinked/route';
import * as weeklyItem from '@/app/api/weekly/[id]/route';
import * as weekly from '@/app/api/weekly/route';
import type { GoalWithProgress, Todo, UnlinkedResponse, WeeklyPlan } from '@/types';
import { loginAs } from '../helpers/auth';
import { useTestDB } from '../helpers/db';
import { call } from '../helpers/http';

useTestDB();

const WEEK = '2026-11-09';
type Session = Awaited<ReturnType<typeof loginAs>>;

/** 사용자 하나의 데이터 세트: 1년 목표 → 주간 계획(주간 목표 1개) → 할 일 1개(done) */
async function seed(user: Session, prefix: string) {
  const goal = (await call<GoalWithProgress>(goals.POST, { method: 'POST', cookie: user.cookie, body: { title: `${prefix} 목표` } })).body;
  const plan = (
    await call<WeeklyPlan>(weekly.POST, {
      method: 'POST',
      cookie: user.cookie,
      body: { weekStart: WEEK, goals: [{ text: `${prefix} 주간`, goalId: goal._id }] },
    })
  ).body;
  const todo = (
    await call<Todo>(todos.POST, {
      method: 'POST',
      cookie: user.cookie,
      body: { title: `${prefix} 할 일`, weeklyGoalId: plan.goals[0]._id, status: 'done' },
    })
  ).body;
  return { goal, plan, todo, weeklyGoalId: plan.goals[0]._id };
}

let alice: Session;
let bob: Session;
let a: Awaited<ReturnType<typeof seed>>;
let b: Awaited<ReturnType<typeof seed>>;

beforeEach(async () => {
  alice = await loginAs('alice');
  bob = await loginAs('bob');
  a = await seed(alice, 'A');
  b = await seed(bob, 'B');
});

describe('세션 없는 요청', () => {
  const routes: Array<[string, () => ReturnType<typeof call>]> = [
    ['GET /api/goals', () => call(goals.GET)],
    ['POST /api/goals', () => call(goals.POST, { method: 'POST', body: { title: 'x' } })],
    ['GET /api/goals/[id]', () => call(goalItem.GET, { params: { id: a.goal._id } })],
    ['PUT /api/goals/[id]', () => call(goalItem.PUT, { method: 'PUT', params: { id: a.goal._id }, body: { title: 'x' } })],
    ['DELETE /api/goals/[id]', () => call(goalItem.DELETE, { method: 'DELETE', params: { id: a.goal._id } })],
    ['GET /api/weekly', () => call(weekly.GET, { path: `/api/weekly?weekStart=${WEEK}` })],
    ['POST /api/weekly', () => call(weekly.POST, { method: 'POST', body: { weekStart: '2026-11-16' } })],
    ['GET /api/weekly/[id]', () => call(weeklyItem.GET, { params: { id: a.plan._id } })],
    ['PUT /api/weekly/[id]', () => call(weeklyItem.PUT, { method: 'PUT', params: { id: a.plan._id }, body: { memo: 'x' } })],
    ['DELETE /api/weekly/[id]', () => call(weeklyItem.DELETE, { method: 'DELETE', params: { id: a.plan._id } })],
    ['GET /api/todos', () => call(todos.GET)],
    ['POST /api/todos', () => call(todos.POST, { method: 'POST', body: { title: 'x', weeklyGoalId: a.weeklyGoalId } })],
    ['GET /api/todos/[id]', () => call(todoItem.GET, { params: { id: a.todo._id } })],
    ['PATCH /api/todos/[id]', () => call(todoItem.PATCH, { method: 'PATCH', params: { id: a.todo._id }, body: { status: 'todo' } })],
    ['DELETE /api/todos/[id]', () => call(todoItem.DELETE, { method: 'DELETE', params: { id: a.todo._id } })],
    ['GET /api/unlinked', () => call(unlinked.GET)],
    ['PATCH /api/unlinked', () => call(unlinked.PATCH, { method: 'PATCH', body: { kind: 'todo', todoId: a.todo._id, weeklyGoalId: a.weeklyGoalId } })],
    ['GET /api/auth/me', () => call(me.GET)],
  ];

  for (const [name, request] of routes) {
    it(`${name} → 401 + session 쿠키 삭제`, async () => {
      const res = await request();
      expect(res.status).toBe(401);
      expect(res.headers.get('set-cookie')).toBe('session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax');
    });
  }

  it('위조 쿠키도 401이고 데이터는 바뀌지 않는다', async () => {
    const res = await call(goalItem.DELETE, { method: 'DELETE', params: { id: a.goal._id }, cookie: 'session=forged' });
    expect(res.status).toBe(401);
    expect((await call(goalItem.GET, { params: { id: a.goal._id }, cookie: alice.cookie })).status).toBe(200);
  });
});

describe('사용자 간 격리 (계획 6장 표)', () => {
  const titles = (list: Array<{ title: string }>) => list.map((x) => x.title);

  it('목록에 남의 데이터가 없다', async () => {
    expect(titles((await call(goals.GET, { cookie: bob.cookie })).body)).toEqual(['B 목표']);
    expect((await call<WeeklyPlan[]>(weekly.GET, { path: `/api/weekly?weekStart=${WEEK}`, cookie: bob.cookie })).body.map((p) => p._id)).toEqual([b.plan._id]);
    expect((await call<WeeklyPlan[]>(weekly.GET, { path: '/api/weekly?limit=10', cookie: bob.cookie })).body).toHaveLength(1);
    expect(titles((await call(todos.GET, { cookie: bob.cookie })).body)).toEqual(['B 할 일']);
    expect(titles((await call(todos.GET, { path: `/api/todos?weeklyPlanId=${a.plan._id}`, cookie: bob.cookie })).body)).toEqual([]);
  });

  it('남의 id로 조회·수정·삭제하면 404이고 원본은 그대로다', async () => {
    const cases = [
      call(goalItem.GET, { params: { id: a.goal._id }, cookie: bob.cookie }),
      call(goalItem.PUT, { method: 'PUT', params: { id: a.goal._id }, cookie: bob.cookie, body: { title: '탈취' } }),
      call(goalItem.DELETE, { method: 'DELETE', params: { id: a.goal._id }, cookie: bob.cookie }),
      call(weeklyItem.GET, { params: { id: a.plan._id }, cookie: bob.cookie }),
      call(weeklyItem.PUT, { method: 'PUT', params: { id: a.plan._id }, cookie: bob.cookie, body: { memo: '탈취' } }),
      call(weeklyItem.DELETE, { method: 'DELETE', params: { id: a.plan._id }, cookie: bob.cookie }),
      call(todoItem.GET, { params: { id: a.todo._id }, cookie: bob.cookie }),
      call(todoItem.PATCH, { method: 'PATCH', params: { id: a.todo._id }, cookie: bob.cookie, body: { title: '탈취' } }),
      call(todoItem.DELETE, { method: 'DELETE', params: { id: a.todo._id }, cookie: bob.cookie }),
    ];
    for (const res of await Promise.all(cases)) expect(res.status).toBe(404);

    expect((await call(goalItem.GET, { params: { id: a.goal._id }, cookie: alice.cookie })).body.title).toBe('A 목표');
    expect((await call(weeklyItem.GET, { params: { id: a.plan._id }, cookie: alice.cookie })).body.memo).toBe('');
    expect((await call(todoItem.GET, { params: { id: a.todo._id }, cookie: alice.cookie })).body.title).toBe('A 할 일');
  });

  it('남의 주간 목표로 할 일을 만들거나 재연결하면 400', async () => {
    expect((await call(todos.POST, { method: 'POST', cookie: bob.cookie, body: { title: 'x', weeklyGoalId: a.weeklyGoalId } })).status).toBe(400);
    expect(
      (await call(todoItem.PATCH, { method: 'PATCH', params: { id: b.todo._id }, cookie: bob.cookie, body: { weeklyGoalId: a.weeklyGoalId } })).status,
    ).toBe(400);
    expect(
      (await call(unlinked.PATCH, { method: 'PATCH', cookie: bob.cookie, body: { kind: 'todo', todoId: b.todo._id, weeklyGoalId: a.weeklyGoalId } })).status,
    ).toBe(400);
  });

  it('남의 1년 목표로 주간 목표를 만들거나 수정하면 400', async () => {
    expect(
      (await call(weekly.POST, { method: 'POST', cookie: bob.cookie, body: { weekStart: '2026-11-16', goals: [{ text: 'x', goalId: a.goal._id }] } })).status,
    ).toBe(400);
    expect(
      (
        await call(weeklyItem.PUT, {
          method: 'PUT',
          params: { id: b.plan._id },
          cookie: bob.cookie,
          body: { goals: [...b.plan.goals, { text: '새 주간', goalId: a.goal._id }] },
        })
      ).status,
    ).toBe(400);
  });

  it('미연결 재연결: 남의 주간 목표는 404, 남의 1년 목표는 400', async () => {
    expect(
      (await call(unlinked.PATCH, { method: 'PATCH', cookie: bob.cookie, body: { kind: 'weeklyGoal', weeklyGoalId: a.weeklyGoalId, goalId: b.goal._id } })).status,
    ).toBe(404);
    expect(
      (await call(unlinked.PATCH, { method: 'PATCH', cookie: bob.cookie, body: { kind: 'weeklyGoal', weeklyGoalId: b.weeklyGoalId, goalId: a.goal._id } })).status,
    ).toBe(400);
  });

  it('미연결 목록에 남의 미연결 항목이 없다', async () => {
    // A의 1년 목표와 주간 목표를 지워 A에게만 미연결 항목을 만든다
    await call(goalItem.DELETE, { method: 'DELETE', params: { id: a.goal._id }, cookie: alice.cookie });
    await call(weeklyItem.PUT, { method: 'PUT', params: { id: a.plan._id }, cookie: alice.cookie, body: { goals: [] } });

    const forAlice = (await call<UnlinkedResponse>(unlinked.GET, { cookie: alice.cookie })).body;
    expect(forAlice.todos.map((t) => t._id)).toEqual([a.todo._id]);
    expect((await call<UnlinkedResponse>(unlinked.GET, { cookie: bob.cookie })).body).toEqual({ todos: [], weeklyGoals: [] });
  });

  it('목표 진행률에 남의 할 일이 반영되지 않는다', async () => {
    // B가 할 일을 하나 더(미완료) 만들면 B만 50%, A는 그대로 100%
    await call(todos.POST, { method: 'POST', cookie: bob.cookie, body: { title: 'B 둘째', weeklyGoalId: b.weeklyGoalId } });
    const [aGoal] = (await call<GoalWithProgress[]>(goals.GET, { cookie: alice.cookie })).body;
    const [bGoal] = (await call<GoalWithProgress[]>(goals.GET, { cookie: bob.cookie })).body;
    expect(aGoal).toMatchObject({ progress: 100, todoCount: 1, doneCount: 1 });
    expect(bGoal).toMatchObject({ progress: 50, todoCount: 2, doneCount: 1 });
  });

  it('두 사용자가 같은 weekStart로 각각 계획을 만들 수 있다 (beforeEach에서 둘 다 201)', async () => {
    expect(a.plan.weekStart).toBe(WEEK);
    expect(b.plan.weekStart).toBe(WEEK);
    expect(a.plan._id).not.toBe(b.plan._id);
    // 같은 사용자의 중복은 여전히 409
    expect((await call(weekly.POST, { method: 'POST', cookie: bob.cookie, body: { weekStart: WEEK } })).status).toBe(409);
  });

  it('A가 1년 목표를 삭제해도 B의 주간 목표 연결은 영향이 없다', async () => {
    await call(goalItem.DELETE, { method: 'DELETE', params: { id: a.goal._id }, cookie: alice.cookie });
    const bPlan = (await call<WeeklyPlan>(weeklyItem.GET, { params: { id: b.plan._id }, cookie: bob.cookie })).body;
    expect(bPlan.goals[0].goalId).toBe(b.goal._id);
  });
});

describe('로그아웃 후 데이터 API', () => {
  it('로그아웃한 쿠키로 데이터 API를 다시 요청하면 401', async () => {
    expect((await call(todos.GET, { cookie: alice.cookie })).status).toBe(200);
    await call(logout.POST, { path: '/auth/logout', method: 'POST', cookie: alice.cookie });
    expect((await call(todos.GET, { cookie: alice.cookie })).status).toBe(401);
    expect((await call(todos.GET, { cookie: bob.cookie })).status).toBe(200);
  });
});
