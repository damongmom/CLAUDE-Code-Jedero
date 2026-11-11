'use client';

import { useState } from 'react';
import type { WeeklyGoalInput } from '@/store/weeklySlice';
import { MAX_WEEKLY_GOALS, type Goal, type WeeklyGoal } from '@/types';

type Row = { key: string; _id?: string; text: string; goalId: string; wasUnlinked: boolean };

type Props = {
  goals: Pick<Goal, '_id' | 'title'>[];
  initialGoals?: WeeklyGoal[];
  /** 생성 모드에서만 메모 입력을 함께 받는다. */
  withMemo?: boolean;
  submitting: boolean;
  submitLabel: string;
  onSubmit: (values: { goals: WeeklyGoalInput[]; memo: string }) => void;
  onCancel: () => void;
};

let rowSeq = 0;
const newRow = (): Row => ({ key: `new-${rowSeq++}`, text: '', goalId: '', wasUnlinked: false });

export default function WeeklyPlanForm({ goals, initialGoals, withMemo, submitting, submitLabel, onSubmit, onCancel }: Props) {
  const [rows, setRows] = useState<Row[]>(() =>
    initialGoals && initialGoals.length > 0
      ? initialGoals.map((g) => {
          // 목록에 없는 1년 목표(삭제된 목표)를 가리키면 미연결로 보여 준다.
          const linked = g.goalId !== null && goals.some((goal) => goal._id === g.goalId);
          return { key: g._id, _id: g._id, text: g.text, goalId: linked ? (g.goalId as string) : '', wasUnlinked: !linked };
        })
      : [newRow()],
  );
  const [memo, setMemo] = useState('');
  const [touched, setTouched] = useState(false);

  const removedCount = (initialGoals ?? []).filter((g) => !rows.some((r) => r._id === g._id)).length;
  const rowError = (row: Row) => {
    if (row.text.trim() === '') return '주간 목표를 입력하세요.';
    // 이미 미연결 상태였던 기존 주간 목표만 연결 없이 저장할 수 있다 (PRD: 주간 목표 → 1년 목표 필수)
    if (row.goalId === '' && !row.wasUnlinked) return '1년 목표를 선택하세요.';
    return null;
  };
  const hasError = rows.some((row) => rowError(row) !== null);

  const update = (key: string, patch: Partial<Row>) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (hasError) return;
    onSubmit({
      goals: rows.map((row) => ({ ...(row._id ? { _id: row._id } : {}), text: row.text.trim(), goalId: row.goalId || null })),
      memo,
    });
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
      <fieldset className="space-y-3">
        <legend className="label">
          이번 주 목표 ({rows.length}/{MAX_WEEKLY_GOALS})
        </legend>
        {rows.map((row, index) => {
          const error = touched ? rowError(row) : null;
          return (
            <div key={row.key} className="rounded-md border border-slate-200 p-3" data-testid="weekly-goal-row">
              <div className="flex gap-2">
                <input
                  className="input"
                  placeholder={`주간 목표 ${index + 1}`}
                  aria-label={`주간 목표 ${index + 1} 내용`}
                  value={row.text}
                  maxLength={200}
                  onChange={(e) => update(row.key, { text: e.target.value })}
                />
                <button
                  type="button"
                  className="btn-secondary shrink-0"
                  onClick={() => setRows((current) => current.filter((r) => r.key !== row.key))}
                  aria-label={`주간 목표 ${index + 1} 삭제`}
                >
                  삭제
                </button>
              </div>
              <select
                className="input mt-2"
                aria-label={`주간 목표 ${index + 1}의 1년 목표`}
                value={row.goalId}
                onChange={(e) => update(row.key, { goalId: e.target.value })}
              >
                <option value="">{row.wasUnlinked ? '미연결 (1년 목표 선택 권장)' : '1년 목표 선택'}</option>
                {goals.map((goal) => (
                  <option key={goal._id} value={goal._id}>
                    {goal.title}
                  </option>
                ))}
              </select>
              {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
            </div>
          );
        })}
        <button
          type="button"
          className="btn-secondary w-full"
          onClick={() => setRows((current) => [...current, newRow()])}
          disabled={rows.length >= MAX_WEEKLY_GOALS}
        >
          {rows.length >= MAX_WEEKLY_GOALS ? `최대 ${MAX_WEEKLY_GOALS}개까지 추가할 수 있습니다` : '+ 주간 목표 추가'}
        </button>
        {removedCount > 0 && (
          <p className="text-xs text-amber-700">
            삭제한 주간 목표 {removedCount}개에 연결된 할 일은 삭제되지 않고 &apos;미연결&apos; 상태가 됩니다.
          </p>
        )}
      </fieldset>

      {withMemo && (
        <div>
          <label className="label" htmlFor="plan-memo">주간 메모</label>
          <textarea id="plan-memo" className="input" rows={3} value={memo} onChange={(e) => setMemo(e.target.value)} />
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={submitting}>
          취소
        </button>
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
