'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import ErrorMessage from '@/components/shared/ErrorMessage';
import PriorityBadge from '@/components/shared/PriorityBadge';
import TodoModal from '@/components/todos/TodoModal';
import { isOverdue } from '@/components/todos/TodoCard';
import ProgressBar from '@/components/weekly/ProgressBar';
import { compareTodos } from '@/lib/fractionalIndex';
import { errorMessage } from '@/lib/http';
import { STATUS_LABELS } from '@/lib/kanban';
import { calcProgress, countByStatus } from '@/lib/progress';
import { useThisWeek } from '@/lib/useThisWeek';
import { formatWeekRange } from '@/lib/week';
import { useAppStore } from '@/store';
import { TODO_STATUSES, type Todo, type TodoStatus } from '@/types';

export default function DashboardPage() {
  const thisWeek = useThisWeek();
  const goals = useAppStore((state) => state.goals);
  const goalsLoaded = useAppStore((state) => state.goalsLoaded);
  const plans = useAppStore((state) => state.plans);
  const todosMap = useAppStore((state) => state.todos);
  const fetchGoals = useAppStore((state) => state.fetchGoals);
  const fetchPlanByWeek = useAppStore((state) => state.fetchPlanByWeek);
  const fetchTodosByPlan = useAppStore((state) => state.fetchTodosByPlan);
  const updateTodo = useAppStore((state) => state.updateTodo);

  const [planId, setPlanId] = useState<string | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [todoModal, setTodoModal] = useState<{ todo?: Todo } | null>(null);

  useEffect(() => {
    if (!thisWeek) return;
    (async () => {
      try {
        const [, plan] = await Promise.all([fetchGoals(), fetchPlanByWeek(thisWeek)]);
        if (plan) await fetchTodosByPlan(plan._id);
        setPlanId(plan?._id ?? null);
      } catch (e) {
        setError(errorMessage(e));
        setPlanId(null);
      }
    })();
  }, [thisWeek, fetchGoals, fetchPlanByWeek, fetchTodosByPlan]);

  const plan = planId ? plans[planId] : undefined;
  // 스토어의 할 일이 바뀌면(생성/수정/삭제/상태 변경) 진행률이 즉시 다시 계산된다 (PRD 4장)
  const todos = useMemo(
    () => (planId ? Object.values(todosMap).filter((todo) => todo.weeklyPlanId === planId).sort(compareTodos) : []),
    [todosMap, planId],
  );
  const progress = calcProgress(todos);
  const counts = countByStatus(todos);
  const goalTitles = useMemo(() => new Map(goals.map((goal) => [goal._id, goal.title])), [goals]);

  // 1년 목표별 이번 주 연결 할 일 수 (PLAN Phase 6)
  const perGoal = useMemo(() => {
    if (!plan) return [];
    const weeklyToGoal = new Map(plan.goals.map((g) => [g._id, g.goalId]));
    const map = new Map<string, { total: number; done: number }>();
    for (const todo of todos) {
      const goalId = todo.weeklyGoalId ? weeklyToGoal.get(todo.weeklyGoalId) : null;
      if (!goalId) continue;
      const entry = map.get(goalId) ?? { total: 0, done: 0 };
      entry.total += 1;
      if (todo.status === 'done') entry.done += 1;
      map.set(goalId, entry);
    }
    return [...map.entries()].map(([goalId, value]) => ({ goalId, title: goalTitles.get(goalId) ?? '1년 목표', ...value }));
  }, [plan, todos, goalTitles]);

  const changeStatus = (todo: Todo, status: TodoStatus) => {
    updateTodo(todo._id, { status }).catch((e) => setError(errorMessage(e)));
  };

  if (planId === undefined) {
    return (
      <div>
        <h1 className="mb-4 text-xl font-bold">대시보드</h1>
        <ErrorMessage message={error} />
        {!error && <p className="text-sm text-slate-500">불러오는 중…</p>}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-xl font-bold">대시보드</h1>
        {thisWeek && <span className="text-sm text-slate-500">{formatWeekRange(thisWeek)}</span>}
      </div>

      <ErrorMessage message={error} onClose={() => setError(null)} />

      {!plan && (
        <div className="card space-y-3" data-testid="onboarding">
          <h2 className="font-semibold">이번 주 계획이 없습니다</h2>
          <ol className="list-inside list-decimal space-y-1 text-sm text-slate-600">
            <li className={goalsLoaded && goals.length > 0 ? 'text-slate-400 line-through' : ''}>
              <Link href="/goals" className="text-indigo-600 hover:underline">1년 목표</Link> 만들기
            </li>
            <li>
              1년 목표를 바탕으로 <Link href="/weekly" className="text-indigo-600 hover:underline">이번 주 계획</Link> 작성하기
            </li>
            <li>주간 목표에 연결된 할 일 만들기</li>
          </ol>
          <Link href={goalsLoaded && goals.length === 0 ? '/goals' : '/weekly'} className="btn-primary">
            {goalsLoaded && goals.length === 0 ? '1년 목표 만들기' : '이번 주 계획 만들기'}
          </Link>
        </div>
      )}

      {plan && (
        <>
          <section className="card space-y-4">
            <div className="flex items-baseline justify-between">
              <h2 className="font-semibold">주간 진행률</h2>
              <span className="text-3xl font-bold text-indigo-600" data-testid="weekly-progress">
                {progress}%
              </span>
            </div>
            <ProgressBar value={progress} />
            <div className="grid grid-cols-3 gap-2 text-center">
              {TODO_STATUSES.map((status) => (
                <div key={status} className="rounded-md bg-slate-50 py-2" data-testid={`count-${status}`}>
                  <div className="text-xl font-semibold">{counts[status]}</div>
                  <div className="text-xs text-slate-500">{STATUS_LABELS[status]}</div>
                </div>
              ))}
            </div>
          </section>

          <div className="grid gap-4 md:grid-cols-2">
            <section className="card">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-semibold">이번 주 목표</h2>
                <Link href={`/weekly/${plan._id}`} className="text-sm text-indigo-600 hover:underline">
                  주간 계획 보기
                </Link>
              </div>
              {plan.goals.length === 0 ? (
                <p className="text-sm text-slate-500">주간 목표가 없습니다.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {plan.goals.map((goal) => (
                    <li key={goal._id} className="flex justify-between gap-2">
                      <span className="truncate">{goal.text}</span>
                      <span className="shrink-0 text-xs text-slate-500">
                        {goal.goalId ? goalTitles.get(goal.goalId) : '미연결'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="card">
              <h2 className="mb-2 font-semibold">1년 목표별 이번 주 할 일</h2>
              {perGoal.length === 0 ? (
                <p className="text-sm text-slate-500">이번 주에 1년 목표와 연결된 할 일이 없습니다.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {perGoal.map((entry) => (
                    <li key={entry.goalId} className="flex justify-between">
                      <span className="truncate">{entry.title}</span>
                      <span className="text-xs text-slate-500">
                        {entry.done}/{entry.total} 완료
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section className="card">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">이번 주 할 일</h2>
              <div className="flex gap-2">
                <Link href="/todos" className="btn-secondary">칸반 보드</Link>
                <button type="button" className="btn-primary" onClick={() => setTodoModal({})} disabled={plan.goals.length === 0}>
                  + 할 일
                </button>
              </div>
            </div>
            {todos.length === 0 ? (
              <p className="text-sm text-slate-500">아직 할 일이 없습니다.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {todos.map((todo) => (
                  <li key={todo._id} className="flex flex-wrap items-center gap-2 py-2" data-testid="dashboard-todo">
                    <button type="button" className="mr-auto text-left text-sm hover:underline" onClick={() => setTodoModal({ todo })}>
                      <span className={todo.status === 'done' ? 'text-slate-400 line-through' : ''}>{todo.title}</span>
                    </button>
                    <PriorityBadge priority={todo.priority} />
                    {todo.dueDate && (
                      <span className={`text-xs ${isOverdue(todo) ? 'font-semibold text-rose-600' : 'text-slate-500'}`}>{todo.dueDate}</span>
                    )}
                    <select
                      className="rounded border border-slate-300 px-2 py-1 text-xs"
                      aria-label={`${todo.title} 상태`}
                      value={todo.status}
                      onChange={(e) => changeStatus(todo, e.target.value as TodoStatus)}
                    >
                      {TODO_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {STATUS_LABELS[status]}
                        </option>
                      ))}
                    </select>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <TodoModal open={todoModal !== null} onClose={() => setTodoModal(null)} plan={plan} todo={todoModal?.todo} />
        </>
      )}
    </div>
  );
}
