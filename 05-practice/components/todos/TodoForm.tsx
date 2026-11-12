'use client';

import { useState } from 'react';
import { PRIORITY_LABELS } from '@/components/shared/PriorityBadge';
import { STATUS_LABELS } from '@/lib/kanban';
import { DAY_LABELS, DAY_ORDER } from '@/lib/week';
import type { TodoInput } from '@/store/todoSlice';
import { PRIORITIES, TODO_STATUSES, type Todo, type TodoStatus, type WeeklyPlan } from '@/types';

export type TodoFormValues = TodoInput & { status: TodoStatus };

type Props = {
  plan: WeeklyPlan;
  initial?: Todo;
  defaultDayOfWeek?: number | null;
  submitting: boolean;
  onSubmit: (values: TodoFormValues) => void;
  onCancel: () => void;
  onDelete?: () => void;
};

export default function TodoForm({ plan, initial, defaultDayOfWeek = null, submitting, onSubmit, onCancel, onDelete }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [weeklyGoalId, setWeeklyGoalId] = useState(
    initial ? (initial.weeklyGoalId ?? '') : plan.goals.length === 1 ? plan.goals[0]._id : '',
  );
  const [dayOfWeek, setDayOfWeek] = useState<number | null>(initial ? initial.dayOfWeek : defaultDayOfWeek);
  const [priority, setPriority] = useState(initial?.priority ?? 'medium');
  const [dueDate, setDueDate] = useState(initial?.dueDate ?? '');
  const [status, setStatus] = useState<TodoStatus>(initial?.status ?? 'todo');
  const [touched, setTouched] = useState(false);

  const titleError = title.trim() === '' ? '제목을 입력하세요.' : null;
  const goalError = weeklyGoalId === '' ? '주간 목표를 선택하세요.' : null;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (titleError || goalError) return;
    onSubmit({
      title: title.trim(),
      description,
      weeklyGoalId,
      dayOfWeek,
      priority,
      dueDate: dueDate || null,
      status,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      <div>
        <label className="label" htmlFor="todo-title">제목 *</label>
        <input id="todo-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus maxLength={200} />
        {touched && titleError && <p className="mt-1 text-xs text-rose-600">{titleError}</p>}
      </div>

      <div>
        <label className="label" htmlFor="todo-weekly-goal">주간 목표 *</label>
        <select id="todo-weekly-goal" className="input" value={weeklyGoalId} onChange={(e) => setWeeklyGoalId(e.target.value)}>
          <option value="">선택하세요</option>
          {plan.goals.map((goal) => (
            <option key={goal._id} value={goal._id}>
              {goal.text}
            </option>
          ))}
        </select>
        {touched && goalError && <p className="mt-1 text-xs text-rose-600">{goalError}</p>}
      </div>

      <div>
        <label className="label" htmlFor="todo-description">설명</label>
        <textarea id="todo-description" className="input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="todo-day">요일</label>
          <select
            id="todo-day"
            className="input"
            value={dayOfWeek ?? ''}
            onChange={(e) => setDayOfWeek(e.target.value === '' ? null : Number(e.target.value))}
          >
            <option value="">미지정</option>
            {DAY_ORDER.map((day) => (
              <option key={day} value={day}>
                {DAY_LABELS[day]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="todo-priority">우선순위</label>
          <select id="todo-priority" className="input" value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)}>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="todo-due">마감일</label>
          <input id="todo-due" type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        {initial && (
          <div>
            <label className="label" htmlFor="todo-status">상태</label>
            <select id="todo-status" className="input" value={status} onChange={(e) => setStatus(e.target.value as TodoStatus)}>
              {TODO_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-2">
        {onDelete ? (
          <button type="button" className="btn-danger" onClick={onDelete} disabled={submitting}>
            삭제
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={submitting}>
            취소
          </button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {initial ? '저장' : '추가'}
          </button>
        </div>
      </div>
    </form>
  );
}
