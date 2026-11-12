'use client';

import { useState } from 'react';
import ErrorMessage from '@/components/shared/ErrorMessage';
import Modal from '@/components/shared/Modal';
import { errorMessage } from '@/lib/http';
import { useAppStore } from '@/store';
import type { Todo, WeeklyPlan } from '@/types';
import TodoForm, { type TodoFormValues } from './TodoForm';

type Props = {
  open: boolean;
  onClose: () => void;
  plan: WeeklyPlan;
  todo?: Todo;
  defaultDayOfWeek?: number | null;
};

/** 할 일 생성/수정/삭제 모달 */
export default function TodoModal({ open, onClose, plan, todo, defaultDayOfWeek }: Props) {
  const addTodo = useAppStore((state) => state.addTodo);
  const updateTodo = useAppStore((state) => state.updateTodo);
  const deleteTodo = useAppStore((state) => state.deleteTodo);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<unknown>) => {
    setSubmitting(true);
    setError(null);
    try {
      await action();
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (values: TodoFormValues) => {
    const { status, ...input } = values;
    void run(() => (todo ? updateTodo(todo._id, { ...input, status }) : addTodo(input)));
  };

  const handleDelete = () => {
    if (!todo || !window.confirm(`'${todo.title}' 할 일을 삭제할까요?`)) return;
    void run(() => deleteTodo(todo._id));
  };

  return (
    <Modal open={open} title={todo ? '할 일 수정' : '새 할 일'} onClose={onClose}>
      <ErrorMessage message={error} />
      {plan.goals.length === 0 ? (
        <p className="text-sm text-slate-600">이 주의 주간 목표가 없습니다. 주간 계획에서 주간 목표를 먼저 추가하세요.</p>
      ) : (
        <TodoForm
          // 다른 할 일을 열면 폼 상태를 새로 만든다.
          key={todo?._id ?? `new-${defaultDayOfWeek ?? 'none'}`}
          plan={plan}
          initial={todo}
          defaultDayOfWeek={defaultDayOfWeek}
          submitting={submitting}
          onSubmit={handleSubmit}
          onCancel={onClose}
          onDelete={todo ? handleDelete : undefined}
        />
      )}
    </Modal>
  );
}
