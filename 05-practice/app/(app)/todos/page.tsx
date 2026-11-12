'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import ErrorMessage from '@/components/shared/ErrorMessage';
import TodoModal from '@/components/todos/TodoModal';
import { useLinkLookup } from '@/components/todos/useLinkLookup';
import { errorMessage } from '@/lib/http';
import { useThisWeek } from '@/lib/useThisWeek';
import { addWeeks, formatWeekRange } from '@/lib/week';
import { useAppStore } from '@/store';
import type { Todo, TodoStatus } from '@/types';

// dnd-kit은 SSR에서 aria id 불일치가 생기므로 클라이언트에서만 렌더링한다 (PLAN 리스크 표).
const KanbanBoard = dynamic(() => import('@/components/todos/KanbanBoard'), {
  ssr: false,
  loading: () => <p className="text-sm text-slate-500">보드를 불러오는 중…</p>,
});

export default function TodosPage() {
  const thisWeek = useThisWeek();
  const [weekStart, setWeekStart] = useState<string | null>(null);
  // undefined = 불러오는 중, null = 해당 주 계획 없음
  const [planId, setPlanId] = useState<string | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<{ todo?: Todo } | null>(null);

  const plans = useAppStore((state) => state.plans);
  const todos = useAppStore((state) => state.todos);
  const fetchGoals = useAppStore((state) => state.fetchGoals);
  const fetchPlanByWeek = useAppStore((state) => state.fetchPlanByWeek);
  const fetchTodosByPlan = useAppStore((state) => state.fetchTodosByPlan);
  const moveTodo = useAppStore((state) => state.moveTodo);
  const linksOf = useLinkLookup();

  useEffect(() => {
    if (thisWeek && !weekStart) setWeekStart(thisWeek);
  }, [thisWeek, weekStart]);

  useEffect(() => {
    fetchGoals().catch((e) => setError(errorMessage(e)));
  }, [fetchGoals]);

  useEffect(() => {
    if (!weekStart) return;
    let cancelled = false;
    setPlanId(undefined);
    (async () => {
      try {
        const plan = await fetchPlanByWeek(weekStart);
        if (plan) await fetchTodosByPlan(plan._id);
        if (!cancelled) setPlanId(plan?._id ?? null);
      } catch (e) {
        if (!cancelled) {
          setError(errorMessage(e));
          setPlanId(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [weekStart, fetchPlanByWeek, fetchTodosByPlan]);

  const plan = planId ? plans[planId] : undefined;
  const weekTodos = useMemo(
    () => (planId ? Object.values(todos).filter((todo) => todo.weeklyPlanId === planId) : []),
    [todos, planId],
  );

  const handleMove = (id: string, status: TodoStatus, order: string) => {
    setError(null);
    moveTodo(id, status, order).catch((e) => setError(`이동을 저장하지 못해 원래대로 되돌렸습니다. ${errorMessage(e)}`));
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-xl font-bold">할 일 보드</h1>
        {weekStart && (
          <div className="flex items-center gap-1">
            <button type="button" className="btn-secondary" onClick={() => setWeekStart(addWeeks(weekStart, -1))} aria-label="이전 주">
              ◀
            </button>
            <span className="min-w-[110px] text-center text-sm font-medium" data-testid="week-range">
              {formatWeekRange(weekStart)}
            </span>
            <button type="button" className="btn-secondary" onClick={() => setWeekStart(addWeeks(weekStart, 1))} aria-label="다음 주">
              ▶
            </button>
            {thisWeek && weekStart !== thisWeek && (
              <button type="button" className="btn-secondary" onClick={() => setWeekStart(thisWeek)}>
                이번 주
              </button>
            )}
          </div>
        )}
        <button type="button" className="btn-primary" onClick={() => setModal({})} disabled={!plan || plan.goals.length === 0}>
          + 할 일
        </button>
      </div>

      <ErrorMessage message={error} onClose={() => setError(null)} />

      {planId === undefined && <p className="text-sm text-slate-500">불러오는 중…</p>}

      {planId === null && (
        <div className="card text-sm text-slate-600">
          이 주의 주간 계획이 없습니다. 할 일은 주간 목표에 연결되어야 하므로{' '}
          <Link href="/weekly" className="font-medium text-indigo-600 hover:underline">
            주간 계획
          </Link>
          을 먼저 만들어 주세요.
        </div>
      )}

      {plan && (
        <>
          {plan.goals.length === 0 && (
            <p className="mb-3 text-sm text-amber-700">
              주간 목표가 없습니다.{' '}
              <Link href={`/weekly/${plan._id}`} className="font-medium underline">
                주간 계획
              </Link>
              에서 추가하세요.
            </p>
          )}
          <KanbanBoard todos={weekTodos} linksOf={linksOf} onMove={handleMove} onEdit={(todo) => setModal({ todo })} />
          <TodoModal open={modal !== null} onClose={() => setModal(null)} plan={plan} todo={modal?.todo} />
        </>
      )}
    </div>
  );
}
