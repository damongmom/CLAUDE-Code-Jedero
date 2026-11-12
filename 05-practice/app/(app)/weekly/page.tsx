'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import ErrorMessage from '@/components/shared/ErrorMessage';
import Modal from '@/components/shared/Modal';
import WeeklyPlanCard from '@/components/weekly/WeeklyPlanCard';
import WeeklyPlanForm from '@/components/weekly/WeeklyPlanForm';
import { errorMessage } from '@/lib/http';
import { useThisWeek } from '@/lib/useThisWeek';
import { addWeeks, formatWeekRange } from '@/lib/week';
import { useAppStore } from '@/store';

const RECENT_WEEKS = 4;

export default function WeeklyListPage() {
  const router = useRouter();
  const thisWeek = useThisWeek();
  const goals = useAppStore((state) => state.goals);
  const goalsLoaded = useAppStore((state) => state.goalsLoaded);
  const plans = useAppStore((state) => state.plans);
  const todos = useAppStore((state) => state.todos);
  const fetchGoals = useAppStore((state) => state.fetchGoals);
  const fetchPlanByWeek = useAppStore((state) => state.fetchPlanByWeek);
  const fetchTodosByPlan = useAppStore((state) => state.fetchTodosByPlan);
  const createPlan = useAppStore((state) => state.createPlan);

  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creatingWeek, setCreatingWeek] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const weeks = useMemo(
    () => (thisWeek ? Array.from({ length: RECENT_WEEKS }, (_, i) => addWeeks(thisWeek, -i)) : []),
    [thisWeek],
  );

  useEffect(() => {
    if (weeks.length === 0) return;
    (async () => {
      try {
        await fetchGoals();
        const found = await Promise.all(weeks.map((week) => fetchPlanByWeek(week)));
        await Promise.all(found.filter((plan) => plan !== null).map((plan) => fetchTodosByPlan(plan._id)));
      } catch (e) {
        setError(errorMessage(e));
      } finally {
        setLoaded(true);
      }
    })();
  }, [weeks, fetchGoals, fetchPlanByWeek, fetchTodosByPlan]);

  const planByWeek = useMemo(() => new Map(Object.values(plans).map((plan) => [plan.weekStart, plan])), [plans]);
  const todosOf = (planId: string) => Object.values(todos).filter((todo) => todo.weeklyPlanId === planId);

  const handleCreate = async (values: { goals: { text: string; goalId: string | null }[]; memo: string }) => {
    if (!creatingWeek) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const plan = await createPlan({ weekStart: creatingWeek, ...values });
      setCreatingWeek(null);
      router.push(`/weekly/${plan._id}`);
    } catch (e) {
      setFormError(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const noGoals = goalsLoaded && goals.length === 0;

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">주간 계획</h1>
      <ErrorMessage message={error} onClose={() => setError(null)} />

      {noGoals && (
        <div className="card mb-4 border-amber-200 bg-amber-50 text-sm text-amber-800">
          주간 목표는 1년 목표와 연결해야 합니다.{' '}
          <Link href="/goals" className="font-semibold underline">
            1년 목표
          </Link>
          를 먼저 만들어 주세요.
        </div>
      )}

      {!loaded && <p className="text-sm text-slate-500">불러오는 중…</p>}

      {loaded && (
        <div className="grid gap-4 md:grid-cols-2">
          {weeks.map((week) => {
            const plan = planByWeek.get(week);
            if (plan) return <WeeklyPlanCard key={week} plan={plan} todos={todosOf(plan._id)} isThisWeek={week === thisWeek} />;
            return (
              <div key={week} className="card flex flex-col items-start gap-3 border-dashed" data-testid="empty-week">
                <h2 className="font-semibold text-slate-500">
                  {formatWeekRange(week)}
                  {week === thisWeek && <span className="ml-2 rounded bg-indigo-600 px-1.5 py-0.5 text-xs text-white">이번 주</span>}
                </h2>
                <p className="text-sm text-slate-400">주간 계획이 없습니다.</p>
                <button type="button" className="btn-primary" onClick={() => setCreatingWeek(week)} disabled={noGoals}>
                  {week === thisWeek ? '이번 주 계획 만들기' : '계획 만들기'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={creatingWeek !== null}
        title={creatingWeek ? `${formatWeekRange(creatingWeek)} 주간 계획` : ''}
        onClose={() => setCreatingWeek(null)}
      >
        <ErrorMessage message={formError} />
        <WeeklyPlanForm
          key={creatingWeek ?? 'none'}
          goals={goals}
          withMemo
          submitting={submitting}
          submitLabel="만들기"
          onSubmit={handleCreate}
          onCancel={() => setCreatingWeek(null)}
        />
      </Modal>
    </div>
  );
}
