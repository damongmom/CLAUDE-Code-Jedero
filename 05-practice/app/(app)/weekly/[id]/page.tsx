'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import ErrorMessage from '@/components/shared/ErrorMessage';
import Modal from '@/components/shared/Modal';
import TodoModal from '@/components/todos/TodoModal';
import ProgressBar from '@/components/weekly/ProgressBar';
import TextSection from '@/components/weekly/TextSection';
import WeekGrid from '@/components/weekly/WeekGrid';
import WeeklyGoalItem from '@/components/weekly/WeeklyGoalItem';
import WeeklyPlanForm from '@/components/weekly/WeeklyPlanForm';
import { errorMessage } from '@/lib/http';
import { calcProgress, countByStatus } from '@/lib/progress';
import { formatWeekRange } from '@/lib/week';
import { useAppStore } from '@/store';
import type { WeeklyGoalInput } from '@/store/weeklySlice';
import type { Todo } from '@/types';

export default function WeeklyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const plan = useAppStore((state) => state.plans[id]);
  const todosMap = useAppStore((state) => state.todos);
  const goals = useAppStore((state) => state.goals);
  const fetchGoals = useAppStore((state) => state.fetchGoals);
  const fetchPlan = useAppStore((state) => state.fetchPlan);
  const fetchTodosByPlan = useAppStore((state) => state.fetchTodosByPlan);
  const updatePlan = useAppStore((state) => state.updatePlan);
  const deletePlan = useAppStore((state) => state.deletePlan);
  const updateTodo = useAppStore((state) => state.updateTodo);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingGoals, setEditingGoals] = useState(false);
  const [goalFormError, setGoalFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [todoModal, setTodoModal] = useState<{ todo?: Todo; day?: number | null } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        await Promise.all([fetchGoals(), fetchPlan(id), fetchTodosByPlan(id)]);
      } catch (e) {
        setError(errorMessage(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [id, fetchGoals, fetchPlan, fetchTodosByPlan]);

  const todos = useMemo(() => Object.values(todosMap).filter((todo) => todo.weeklyPlanId === id), [todosMap, id]);
  const goalTitles = useMemo(() => new Map(goals.map((goal) => [goal._id, goal.title])), [goals]);
  const counts = countByStatus(todos);

  if (loading) return <p className="text-sm text-slate-500">불러오는 중…</p>;
  if (!plan) {
    return (
      <div>
        <ErrorMessage message={error ?? '주간 계획을 찾을 수 없습니다.'} />
        <Link href="/weekly" className="text-sm text-indigo-600 hover:underline">
          ← 주간 계획 목록
        </Link>
      </div>
    );
  }

  const saveGoals = async (values: { goals: WeeklyGoalInput[] }) => {
    setSubmitting(true);
    setGoalFormError(null);
    try {
      await updatePlan(plan._id, { goals: values.goals });
      setEditingGoals(false);
    } catch (e) {
      setGoalFormError(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePlan = async () => {
    if (!window.confirm('이 주간 계획을 삭제할까요?\n이 주의 할 일은 삭제되지 않고 미연결 상태가 됩니다.')) return;
    try {
      await deletePlan(plan._id);
      router.push('/weekly');
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const changeDay = (todo: Todo, dayOfWeek: number | null) => {
    updateTodo(todo._id, { dayOfWeek }).catch((e) => setError(errorMessage(e)));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/weekly" className="text-sm text-slate-500 hover:underline">
          ← 목록
        </Link>
        <h1 className="mr-auto text-xl font-bold">{formatWeekRange(plan.weekStart)} 주간 계획</h1>
        <Link href="/todos" className="btn-secondary">
          칸반 보드
        </Link>
        <button type="button" className="btn-secondary text-rose-600" onClick={handleDeletePlan}>
          계획 삭제
        </button>
      </div>

      <ErrorMessage message={error} onClose={() => setError(null)} />

      <section className="card space-y-2">
        <ProgressBar value={calcProgress(todos)} label="주간 진행률" />
        <p className="text-xs text-slate-500">
          할 일 {todos.length}개 · 진행 중 {counts.doing} · 완료 {counts.done}
        </p>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">이번 주 목표</h2>
          <button type="button" className="btn-secondary" onClick={() => setEditingGoals(true)}>
            목표 편집
          </button>
        </div>
        {plan.goals.length === 0 ? (
          <p className="text-sm text-slate-500">주간 목표가 없습니다. 목표 편집에서 추가하세요.</p>
        ) : (
          <ul className="grid gap-2 md:grid-cols-2">
            {plan.goals.map((goal) => {
              const linked = todos.filter((todo) => todo.weeklyGoalId === goal._id);
              return (
                <WeeklyGoalItem
                  key={goal._id}
                  goal={goal}
                  goalTitle={goal.goalId ? (goalTitles.get(goal.goalId) ?? null) : null}
                  todoCount={linked.length}
                  doneCount={linked.filter((todo) => todo.status === 'done').length}
                />
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 font-semibold">요일별 할 일</h2>
        <WeekGrid
          weekStart={plan.weekStart}
          todos={todos}
          onAdd={(day) => setTodoModal({ day })}
          onEdit={(todo) => setTodoModal({ todo })}
          onChangeDay={changeDay}
        />
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <TextSection
          id="weekly-memo"
          title="주간 메모"
          value={plan.memo}
          placeholder="이번 주에 기억할 것, 컨디션, 일정 등을 적어 두세요."
          onSave={(memo) => updatePlan(plan._id, { memo })}
        />
        <TextSection
          id="weekly-retrospective"
          title="주간 회고"
          value={plan.retrospective}
          placeholder="잘한 점, 아쉬운 점, 다음 주에 바꿀 점을 적어 보세요."
          onSave={(retrospective) => updatePlan(plan._id, { retrospective })}
        />
      </div>

      <Modal open={editingGoals} title="이번 주 목표 편집" onClose={() => setEditingGoals(false)}>
        <ErrorMessage message={goalFormError} />
        <WeeklyPlanForm
          key={editingGoals ? 'open' : 'closed'}
          goals={goals}
          initialGoals={plan.goals}
          submitting={submitting}
          submitLabel="저장"
          onSubmit={saveGoals}
          onCancel={() => setEditingGoals(false)}
        />
      </Modal>

      <TodoModal
        open={todoModal !== null}
        onClose={() => setTodoModal(null)}
        plan={plan}
        todo={todoModal?.todo}
        defaultDayOfWeek={todoModal?.day ?? null}
      />
    </div>
  );
}
