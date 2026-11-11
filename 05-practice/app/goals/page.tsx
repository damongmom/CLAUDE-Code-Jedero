'use client';

import { useEffect, useState } from 'react';
import GoalCard from '@/components/goals/GoalCard';
import GoalForm from '@/components/goals/GoalForm';
import ErrorMessage from '@/components/shared/ErrorMessage';
import Modal from '@/components/shared/Modal';
import { errorMessage } from '@/lib/http';
import { useAppStore } from '@/store';
import type { GoalInput } from '@/store/goalSlice';
import type { GoalWithProgress } from '@/types';

export default function GoalsPage() {
  const goals = useAppStore((state) => state.goals);
  const goalsLoaded = useAppStore((state) => state.goalsLoaded);
  const fetchGoals = useAppStore((state) => state.fetchGoals);
  const addGoal = useAppStore((state) => state.addGoal);
  const updateGoal = useAppStore((state) => state.updateGoal);
  const deleteGoal = useAppStore((state) => state.deleteGoal);

  const [modal, setModal] = useState<{ goal?: GoalWithProgress } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    // 다른 화면에서 할 일이 바뀌었을 수 있으므로 진입할 때마다 진행률을 새로 받는다.
    fetchGoals().catch((e) => setError(errorMessage(e)));
  }, [fetchGoals]);

  const closeModal = () => {
    setModal(null);
    setFormError(null);
  };

  const handleSubmit = async (values: GoalInput) => {
    setSubmitting(true);
    setFormError(null);
    try {
      if (modal?.goal) await updateGoal(modal.goal._id, values);
      else await addGoal(values);
      closeModal();
    } catch (e) {
      setFormError(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (goal: GoalWithProgress) => {
    const ok = window.confirm(
      `'${goal.title}' 목표를 삭제할까요?\n이 목표에 연결된 주간 목표는 삭제되지 않고 '미연결' 상태로 바뀝니다.`,
    );
    if (!ok) return;
    try {
      await deleteGoal(goal._id);
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">1년 목표</h1>
        <button type="button" className="btn-primary" onClick={() => setModal({})}>
          + 목표 추가
        </button>
      </div>

      <ErrorMessage message={error} onClose={() => setError(null)} />

      {!goalsLoaded && !error && <p className="text-sm text-slate-500">불러오는 중…</p>}

      {goalsLoaded && goals.length === 0 && (
        <div className="card text-sm text-slate-600">
          아직 1년 목표가 없습니다. 올해 이루고 싶은 목표를 먼저 만들고, 이를 바탕으로 주간 계획을 세워 보세요.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {goals.map((goal) => (
          <GoalCard key={goal._id} goal={goal} onEdit={() => setModal({ goal })} onDelete={() => handleDelete(goal)} />
        ))}
      </div>

      <Modal open={modal !== null} title={modal?.goal ? '목표 수정' : '새 1년 목표'} onClose={closeModal}>
        <ErrorMessage message={formError} />
        <GoalForm
          key={modal?.goal?._id ?? 'new'}
          initial={modal?.goal ? { title: modal.goal.title, description: modal.goal.description } : undefined}
          submitting={submitting}
          onSubmit={handleSubmit}
          onCancel={closeModal}
        />
      </Modal>
    </div>
  );
}
