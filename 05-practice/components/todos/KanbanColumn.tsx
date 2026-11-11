'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { STATUS_LABELS } from '@/lib/kanban';
import type { Todo, TodoStatus } from '@/types';
import TodoCard from './TodoCard';
import type { TodoLinks } from './useLinkLookup';

type CardProps = { todo: Todo; links: TodoLinks; onEdit: (todo: Todo) => void };

function SortableTodoCard({ todo, links, onEdit }: CardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: todo._id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`cursor-grab touch-none active:cursor-grabbing ${isDragging ? 'opacity-40' : ''}`}
      data-testid="todo-card"
      {...attributes}
      {...listeners}
    >
      <TodoCard todo={todo} links={links} onEdit={() => onEdit(todo)} />
    </li>
  );
}

type Props = {
  status: TodoStatus;
  todos: Todo[];
  linksOf: (todo: Todo) => TodoLinks;
  onEdit: (todo: Todo) => void;
};

export default function KanbanColumn({ status, todos, linksOf, onEdit }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section
      ref={setNodeRef}
      aria-label={`${STATUS_LABELS[status]} 컬럼`}
      className={`flex min-h-[320px] flex-col rounded-lg p-3 transition ${isOver ? 'bg-indigo-50' : 'bg-slate-100'}`}
    >
      <h2 className="mb-3 flex items-center justify-between text-sm font-semibold text-slate-700">
        {STATUS_LABELS[status]}
        <span className="rounded-full bg-white px-2 text-xs text-slate-500">{todos.length}</span>
      </h2>
      <SortableContext items={todos.map((todo) => todo._id)} strategy={verticalListSortingStrategy}>
        <ul className="flex flex-1 flex-col gap-2">
          {todos.map((todo) => (
            <SortableTodoCard key={todo._id} todo={todo} links={linksOf(todo)} onEdit={onEdit} />
          ))}
          {todos.length === 0 && (
            <li className="rounded-md border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400">
              여기로 끌어다 놓으세요
            </li>
          )}
        </ul>
      </SortableContext>
    </section>
  );
}
