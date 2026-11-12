import { compareTodos, computeMovedOrder } from '@/lib/fractionalIndex';
import { TODO_STATUSES, type Todo, type TodoStatus } from '@/types';

export type Columns = Record<TodoStatus, Todo[]>;

export const STATUS_LABELS: Record<TodoStatus, string> = { todo: '할 일', doing: '진행 중', done: '완료' };

function isStatus(value: string): value is TodoStatus {
  return (TODO_STATUSES as readonly string[]).includes(value);
}

/** 상태별 컬럼으로 나누고 (High 우선, order) 순으로 정렬한다. */
export function groupColumns(todos: readonly Todo[]): Columns {
  const columns: Columns = { todo: [], doing: [], done: [] };
  for (const todo of todos) columns[todo.status].push(todo);
  for (const status of TODO_STATUSES) columns[status].sort(compareTodos);
  return columns;
}

/**
 * 드롭 결과를 { status, order }로 변환한다. 변화가 없으면 null.
 * @param overId 놓은 대상: 카드 id 또는 컬럼 id(todo/doing/done)
 */
export function resolveDrop(
  columns: Columns,
  movedId: string,
  overId: string,
): { status: TodoStatus; order: string } | null {
  const all = TODO_STATUSES.flatMap((status) => columns[status]);
  const moved = all.find((todo) => todo._id === movedId);
  if (!moved) return null;
  const sourceIndex = columns[moved.status].findIndex((todo) => todo._id === movedId);

  let status: TodoStatus;
  let targetIndex: number;
  if (isStatus(overId)) {
    // 컬럼 빈 영역에 놓으면 맨 끝
    status = overId;
    targetIndex = columns[status].filter((todo) => todo._id !== movedId).length;
  } else {
    const overTodo = all.find((todo) => todo._id === overId);
    if (!overTodo) return null;
    status = overTodo.status;
    // 같은 컬럼: 놓은 카드의 자리를 차지(arrayMove). 다른 컬럼: 그 카드 앞에 끼운다.
    targetIndex = columns[status].findIndex((todo) => todo._id === overId);
  }

  if (status === moved.status && targetIndex === sourceIndex) return null;

  const rest = columns[status].filter((todo) => todo._id !== movedId);
  return { status, order: computeMovedOrder(rest, targetIndex, moved) };
}
