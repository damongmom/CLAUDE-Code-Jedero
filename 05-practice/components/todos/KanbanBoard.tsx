'use client';

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useMemo, useState } from 'react';
import { groupColumns, resolveDrop } from '@/lib/kanban';
import { TODO_STATUSES, type Todo, type TodoStatus } from '@/types';
import KanbanColumn from './KanbanColumn';
import TodoCard from './TodoCard';
import type { TodoLinks } from './useLinkLookup';

type Props = {
  todos: Todo[];
  linksOf: (todo: Todo) => TodoLinks;
  onMove: (id: string, status: TodoStatus, order: string) => void;
  onEdit: (todo: Todo) => void;
};

export default function KanbanBoard({ todos, linksOf, onMove, onEdit }: Props) {
  const columns = useMemo(() => groupColumns(todos), [todos]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeTodo = activeId ? todos.find((todo) => todo._id === activeId) : undefined;

  const sensors = useSensors(
    // 5px 이상 움직여야 드래그로 본다. 그래야 카드 안의 버튼 클릭이 동작한다.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragStart = ({ active }: DragStartEvent) => setActiveId(String(active.id));

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    if (!over) return;
    let result: ReturnType<typeof resolveDrop>;
    try {
      result = resolveDrop(columns, String(active.id), String(over.id));
    } catch (error) {
      // 순서 키 계산이 실패해도 보드가 깨지지 않게 이동만 취소한다.
      console.warn('[kanban] drop ignored', error);
      return;
    }
    if (result) onMove(String(active.id), result.status, result.order);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="grid gap-4 md:grid-cols-3">
        {TODO_STATUSES.map((status) => (
          <KanbanColumn key={status} status={status} todos={columns[status]} linksOf={linksOf} onEdit={onEdit} />
        ))}
      </div>
      <DragOverlay>{activeTodo ? <TodoCard todo={activeTodo} links={linksOf(activeTodo)} /> : null}</DragOverlay>
    </DndContext>
  );
}
