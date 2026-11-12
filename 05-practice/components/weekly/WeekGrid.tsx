'use client';

import { STATUS_LABELS } from '@/lib/kanban';
import { compareTodos } from '@/lib/fractionalIndex';
import { DAY_LABELS, DAY_ORDER, dateOfDay } from '@/lib/week';
import type { Todo } from '@/types';

type Props = {
  weekStart: string;
  todos: Todo[];
  onAdd: (dayOfWeek: number | null) => void;
  onEdit: (todo: Todo) => void;
  onChangeDay: (todo: Todo, dayOfWeek: number | null) => void;
};

const STATUS_DOT = { todo: 'bg-slate-400', doing: 'bg-amber-500', done: 'bg-emerald-500' } as const;

const COLUMNS: Array<{ day: number | null; label: string }> = [
  ...DAY_ORDER.map((day) => ({ day, label: DAY_LABELS[day] })),
  { day: null, label: '미지정' },
];

/** 요일별 할 일 배치 (PRD P0). 월~일 7열 + 요일 미지정 */
export default function WeekGrid({ weekStart, todos, onAdd, onEdit, onChangeDay }: Props) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-8">
      {COLUMNS.map(({ day, label }) => {
        const cellTodos = todos.filter((todo) => todo.dayOfWeek === day).sort(compareTodos);
        const date = day === null ? null : dateOfDay(weekStart, day).slice(5).replace('-', '/');
        return (
          <section key={label} className="flex min-h-[140px] flex-col rounded-lg bg-slate-100 p-2" aria-label={`${label} 칸`}>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                {label}
                {date && <span className="ml-1 text-xs font-normal text-slate-500">{date}</span>}
              </h3>
              <button
                type="button"
                className="rounded px-1.5 text-sm text-indigo-600 hover:bg-white"
                onClick={() => onAdd(day)}
                aria-label={`${label}에 할 일 추가`}
              >
                +
              </button>
            </div>
            <ul className="flex flex-col gap-1.5">
              {cellTodos.map((todo) => (
                <li key={todo._id} className="rounded border border-slate-200 bg-white p-2" data-testid="grid-todo">
                  <button type="button" className="flex w-full items-start gap-1.5 text-left" onClick={() => onEdit(todo)}>
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[todo.status]}`} title={STATUS_LABELS[todo.status]} />
                    <span className={`text-xs ${todo.status === 'done' ? 'text-slate-400 line-through' : ''}`}>{todo.title}</span>
                  </button>
                  <select
                    className="mt-1 w-full rounded border border-slate-200 bg-slate-50 px-1 py-0.5 text-xs"
                    aria-label={`${todo.title} 요일`}
                    value={todo.dayOfWeek ?? ''}
                    onChange={(e) => onChangeDay(todo, e.target.value === '' ? null : Number(e.target.value))}
                  >
                    <option value="">미지정</option>
                    {DAY_ORDER.map((d) => (
                      <option key={d} value={d}>
                        {DAY_LABELS[d]}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
