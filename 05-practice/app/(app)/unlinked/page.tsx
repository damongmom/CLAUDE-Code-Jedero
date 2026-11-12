'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import ErrorMessage from '@/components/shared/ErrorMessage';
import { api, errorMessage } from '@/lib/http';
import { formatWeekRange } from '@/lib/week';
import { useAppStore } from '@/store';
import type { Todo, UnlinkedResponse, WeeklyPlan } from '@/types';

/** PRD 4장: 미연결 항목 목록 조회 및 재연결 */
export default function UnlinkedPage() {
  const goals = useAppStore((state) => state.goals);
  const plans = useAppStore((state) => state.plans);
  const fetchGoals = useAppStore((state) => state.fetchGoals);
  const fetchRecentPlans = useAppStore((state) => state.fetchRecentPlans);

  const [data, setData] = useState<UnlinkedResponse | null>(null);
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [unlinked] = await Promise.all([api<UnlinkedResponse>('/api/unlinked'), fetchGoals(), fetchRecentPlans(52)]);
      setData(unlinked);
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [fetchGoals, fetchRecentPlans]);

  useEffect(() => {
    void load();
  }, [load]);

  // 할 일을 다시 연결할 수 있는 주간 목표 (최근 주부터)
  const weeklyGoalOptions = useMemo(
    () =>
      Object.values(plans)
        .filter((plan) => plan.goals.length > 0)
        .sort((a, b) => (a.weekStart < b.weekStart ? 1 : -1)),
    [plans],
  );

  const relink = async (key: string, body: Record<string, unknown>, onDone: (result: unknown) => void) => {
    setBusy(key);
    setError(null);
    try {
      onDone(await api('/api/unlinked', { method: 'PATCH', body }));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const relinkTodo = (todo: Todo) =>
    relink(todo._id, { kind: 'todo', todoId: todo._id, weeklyGoalId: selection[todo._id] }, (saved) => {
      const updated = saved as Todo;
      useAppStore.setState((state) => ({ todos: { ...state.todos, [updated._id]: updated } }));
      setData((current) => current && { ...current, todos: current.todos.filter((t) => t._id !== todo._id) });
    });

  const relinkWeeklyGoal = (weeklyGoalId: string) =>
    relink(weeklyGoalId, { kind: 'weeklyGoal', weeklyGoalId, goalId: selection[weeklyGoalId] }, (saved) => {
      const plan = saved as WeeklyPlan;
      useAppStore.setState((state) => ({ plans: { ...state.plans, [plan._id]: plan } }));
      setData((current) => current && { ...current, weeklyGoals: current.weeklyGoals.filter((g) => g._id !== weeklyGoalId) });
    });

  const empty = data && data.todos.length === 0 && data.weeklyGoals.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">미연결 항목</h1>
        <p className="mt-1 text-sm text-slate-500">
          주간 목표나 1년 목표가 삭제되어 연결이 끊긴 항목입니다. 다시 연결하면 목록에서 사라집니다.
        </p>
      </div>

      <ErrorMessage message={error} onClose={() => setError(null)} />
      {!data && !error && <p className="text-sm text-slate-500">불러오는 중…</p>}
      {empty && <div className="card text-sm text-slate-600">미연결 항목이 없습니다. 모든 할 일과 주간 목표가 연결되어 있어요.</div>}

      {data && data.weeklyGoals.length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold">1년 목표와 끊긴 주간 목표 ({data.weeklyGoals.length})</h2>
          <ul className="space-y-2">
            {data.weeklyGoals.map((weeklyGoal) => (
              <li key={weeklyGoal._id} className="card flex flex-wrap items-center gap-2" data-testid="unlinked-weekly-goal">
                <div className="mr-auto min-w-0">
                  <p className="font-medium">{weeklyGoal.text}</p>
                  <p className="text-xs text-slate-500">{formatWeekRange(weeklyGoal.weekStart)} 주</p>
                </div>
                <select
                  className="input w-auto"
                  aria-label={`${weeklyGoal.text}에 연결할 1년 목표`}
                  value={selection[weeklyGoal._id] ?? ''}
                  onChange={(e) => setSelection((s) => ({ ...s, [weeklyGoal._id]: e.target.value }))}
                >
                  <option value="">1년 목표 선택</option>
                  {goals.map((goal) => (
                    <option key={goal._id} value={goal._id}>
                      {goal.title}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={!selection[weeklyGoal._id] || busy === weeklyGoal._id}
                  onClick={() => relinkWeeklyGoal(weeklyGoal._id)}
                >
                  연결
                </button>
              </li>
            ))}
          </ul>
          {goals.length === 0 && <p className="mt-2 text-xs text-amber-700">연결할 1년 목표가 없습니다. 1년 목표를 먼저 만들어 주세요.</p>}
        </section>
      )}

      {data && data.todos.length > 0 && (
        <section>
          <h2 className="mb-2 font-semibold">주간 목표와 끊긴 할 일 ({data.todos.length})</h2>
          <ul className="space-y-2">
            {data.todos.map((todo) => (
              <li key={todo._id} className="card flex flex-wrap items-center gap-2" data-testid="unlinked-todo">
                <p className="mr-auto font-medium">{todo.title}</p>
                <select
                  className="input w-auto"
                  aria-label={`${todo.title}에 연결할 주간 목표`}
                  value={selection[todo._id] ?? ''}
                  onChange={(e) => setSelection((s) => ({ ...s, [todo._id]: e.target.value }))}
                >
                  <option value="">주간 목표 선택</option>
                  {weeklyGoalOptions.map((plan) => (
                    <optgroup key={plan._id} label={`${formatWeekRange(plan.weekStart)} 주`}>
                      {plan.goals.map((goal) => (
                        <option key={goal._id} value={goal._id}>
                          {goal.text}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={!selection[todo._id] || busy === todo._id}
                  onClick={() => relinkTodo(todo)}
                >
                  연결
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
