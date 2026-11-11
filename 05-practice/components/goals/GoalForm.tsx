'use client';

import { useState } from 'react';
import type { GoalInput } from '@/store/goalSlice';

type Props = {
  initial?: GoalInput;
  submitting: boolean;
  onSubmit: (values: GoalInput) => void;
  onCancel: () => void;
};

export default function GoalForm({ initial, submitting, onSubmit, onCancel }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [touched, setTouched] = useState(false);
  const titleError = title.trim() === '' ? '제목을 입력하세요.' : null;

  return (
    <form
      className="space-y-3"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setTouched(true);
        if (!titleError) onSubmit({ title: title.trim(), description });
      }}
    >
      <div>
        <label className="label" htmlFor="goal-title">제목 *</label>
        <input id="goal-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} autoFocus />
        {touched && titleError && <p className="mt-1 text-xs text-rose-600">{titleError}</p>}
      </div>
      <div>
        <label className="label" htmlFor="goal-description">설명</label>
        <textarea
          id="goal-description"
          className="input"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="이 목표를 왜 이루고 싶은지, 무엇을 달성하면 성공인지 적어 보세요."
        />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={submitting}>
          취소
        </button>
        <button type="submit" className="btn-primary" disabled={submitting}>
          {initial ? '저장' : '추가'}
        </button>
      </div>
    </form>
  );
}
