'use client';

import { useEffect, useState } from 'react';
import { errorMessage } from '@/lib/http';

type Props = {
  id: string;
  title: string;
  value: string;
  placeholder?: string;
  onSave: (value: string) => Promise<unknown>;
};

/** 주간 메모·회고처럼 저장 버튼으로 반영하는 긴 텍스트 */
export default function TextSection({ id, title, value, placeholder, onSave }: Props) {
  const [draft, setDraft] = useState(value);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState('');

  useEffect(() => setDraft(value), [value]);

  const dirty = draft !== value;

  const save = async () => {
    setStatus('saving');
    try {
      await onSave(draft);
      setStatus('saved');
    } catch (e) {
      setError(errorMessage(e));
      setStatus('error');
    }
  };

  return (
    <section className="card">
      <div className="mb-2 flex items-center justify-between">
        <label htmlFor={id} className="font-semibold">
          {title}
        </label>
        <div className="flex items-center gap-2 text-xs">
          {status === 'saved' && !dirty && <span className="text-emerald-600">저장됨</span>}
          {status === 'error' && <span className="text-rose-600">{error}</span>}
          <button type="button" className="btn-primary" onClick={save} disabled={!dirty || status === 'saving'}>
            저장
          </button>
        </div>
      </div>
      <textarea
        id={id}
        className="input"
        rows={4}
        value={draft}
        placeholder={placeholder}
        onChange={(e) => {
          setDraft(e.target.value);
          if (status !== 'saving') setStatus('idle');
        }}
      />
    </section>
  );
}
