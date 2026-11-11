'use client';

import Badge from '@/components/shared/Badge';
import PriorityBadge from '@/components/shared/PriorityBadge';
import { todayKST } from '@/lib/week';
import type { Todo } from '@/types';
import type { TodoLinks } from './useLinkLookup';

export function isOverdue(todo: Pick<Todo, 'dueDate' | 'status'>, today: string = todayKST()): boolean {
  return todo.status !== 'done' && todo.dueDate !== null && todo.dueDate < today;
}

type Props = {
  todo: Todo;
  links: TodoLinks;
  onEdit?: () => void;
};

export default function TodoCard({ todo, links, onEdit }: Props) {
  const overdue = isOverdue(todo);
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className={`text-sm font-medium ${todo.status === 'done' ? 'text-slate-400 line-through' : ''}`}>
          {todo.title}
        </p>
        {onEdit && (
          <button
            type="button"
            className="shrink-0 rounded px-1 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            onClick={(event) => {
              event.stopPropagation();
              onEdit();
            }}
            // 카드 전체가 드래그 핸들이므로 버튼의 키 입력이 드래그 시작으로 번지지 않게 막는다.
            onKeyDown={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
            aria-label={`${todo.title} 수정`}
          >
            수정
          </button>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1">
        <PriorityBadge priority={todo.priority} />
        {todo.dueDate && (
          <span className={`text-xs ${overdue ? 'font-semibold text-rose-600' : 'text-slate-500'}`}>
            {overdue ? '마감 지남 ' : '마감 '}
            {todo.dueDate}
          </span>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {links.weeklyGoalText ? <Badge tone="indigo">{links.weeklyGoalText}</Badge> : <Badge tone="rose">주간 목표 미연결</Badge>}
        {links.goalTitle && <Badge tone="emerald">{links.goalTitle}</Badge>}
      </div>
    </div>
  );
}
