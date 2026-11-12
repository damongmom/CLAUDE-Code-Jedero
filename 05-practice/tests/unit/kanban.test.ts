import { describe, expect, it } from 'vitest';
import { generateKeyBetween } from '@/lib/fractionalIndex';
import { groupColumns, resolveDrop } from '@/lib/kanban';
import type { Priority, Todo, TodoStatus } from '@/types';

let lastKey: string | null = null;
function todo(id: string, status: TodoStatus, priority: Priority = 'medium'): Todo {
  lastKey = generateKeyBetween(lastKey, null);
  return {
    _id: id,
    title: id,
    description: '',
    status,
    priority,
    dueDate: null,
    dayOfWeek: null,
    order: lastKey,
    weeklyPlanId: 'p',
    weeklyGoalId: 'g',
    createdAt: '',
    updatedAt: '',
  };
}

/** 드롭을 적용한 뒤 각 컬럼의 id 순서를 반환한다. */
function apply(todos: Todo[], movedId: string, overId: string) {
  const result = resolveDrop(groupColumns(todos), movedId, overId);
  if (!result) return null;
  const next = todos.map((t) => (t._id === movedId ? { ...t, ...result } : t));
  const columns = groupColumns(next);
  return {
    todo: columns.todo.map((t) => t._id),
    doing: columns.doing.map((t) => t._id),
    done: columns.done.map((t) => t._id),
  };
}

describe('resolveDrop', () => {
  const base = () => [todo('a', 'todo'), todo('b', 'todo'), todo('c', 'todo'), todo('x', 'doing')];

  it('같은 컬럼 아래로 이동 (a를 c 위에 놓으면 c 뒤로)', () => {
    expect(apply(base(), 'a', 'c')?.todo).toEqual(['b', 'c', 'a']);
  });

  it('같은 컬럼 위로 이동 (c를 a 위에 놓으면 맨 앞)', () => {
    expect(apply(base(), 'c', 'a')?.todo).toEqual(['c', 'a', 'b']);
  });

  it('다른 컬럼 카드 위에 놓으면 그 카드 앞에 들어가고 상태가 바뀐다', () => {
    const result = apply(base(), 'b', 'x');
    expect(result?.todo).toEqual(['a', 'c']);
    expect(result?.doing).toEqual(['b', 'x']);
  });

  it('컬럼 빈 영역에 놓으면 맨 끝에 들어간다', () => {
    expect(apply(base(), 'a', 'doing')?.doing).toEqual(['x', 'a']);
    expect(apply(base(), 'a', 'done')?.done).toEqual(['a']);
  });

  it('제자리에 놓으면 null (PATCH를 보내지 않는다)', () => {
    const todos = base();
    expect(resolveDrop(groupColumns(todos), 'a', 'a')).toBeNull();
    expect(resolveDrop(groupColumns(todos), 'c', 'todo')).toBeNull();
  });

  it('알 수 없는 대상이면 null', () => {
    expect(resolveDrop(groupColumns(base()), 'a', 'nope')).toBeNull();
  });

  it('High 카드는 컬럼 상단에 고정된다', () => {
    const todos = [todo('m1', 'todo'), todo('h1', 'todo', 'high'), todo('m2', 'done')];
    expect(groupColumns(todos).todo.map((t) => t._id)).toEqual(['h1', 'm1']);
    expect(apply(todos, 'm2', 'h1')?.todo).toEqual(['h1', 'm2', 'm1']);
  });
});
