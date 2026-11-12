import type { TodoStatus } from '@/types';

type HasStatus = { status: TodoStatus };

/** PRD 4장: done 개수 / 전체 개수 × 100, 할 일 0개면 0% */
export function calcProgress(todos: readonly HasStatus[]): number {
  if (todos.length === 0) return 0;
  const done = todos.filter((todo) => todo.status === 'done').length;
  return Math.round((done / todos.length) * 100);
}

export function countByStatus(todos: readonly HasStatus[]): Record<TodoStatus, number> {
  const counts: Record<TodoStatus, number> = { todo: 0, doing: 0, done: 0 };
  for (const todo of todos) counts[todo.status] += 1;
  return counts;
}
