import { generateKeyBetween } from 'fractional-indexing';
import type { Priority, Todo } from '@/types';

export { generateKeyBetween };

/** High만 컬럼 상단에 고정한다 (PLAN Phase 7). 나머지는 order 순서를 그대로 따른다. */
function priorityRank(priority: Priority): number {
  return priority === 'high' ? 0 : 1;
}

/** fractional index는 코드 포인트 순서로 비교해야 한다 (localeCompare 사용 금지). */
function compareOrder(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

type Sortable = Pick<Todo, 'priority' | 'order'>;

export function compareTodos(a: Sortable, b: Sortable): number {
  return priorityRank(a.priority) - priorityRank(b.priority) || compareOrder(a.order, b.order);
}

/**
 * 카드를 화면상 targetIndex 위치로 옮겼을 때의 새 order를 계산한다.
 *
 * @param rest 대상 컬럼의 카드들(옮기는 카드 제외), compareTodos로 정렬된 상태
 * @param targetIndex rest 기준 삽입 위치
 * @param moved 옮기는 카드
 *
 * 화면은 (우선순위 그룹, order)로 정렬되므로 같은 그룹 안에서만 이웃을 찾는다.
 * 다른 그룹 영역에 놓으면 자기 그룹의 가장 가까운 끝으로 붙는다.
 */
export function computeMovedOrder(rest: readonly Sortable[], targetIndex: number, moved: Sortable): string {
  const rank = priorityRank(moved.priority);
  const group = rest.filter((todo) => priorityRank(todo.priority) === rank);
  const before = rest.slice(0, targetIndex).filter((todo) => priorityRank(todo.priority) === rank).length;
  const prev = group[before - 1]?.order ?? null;
  const next = group[before]?.order ?? null;
  try {
    return generateKeyBetween(prev, next);
  } catch {
    // 중복 키(prev >= next)나 잘못된 키가 섞인 경우: 그룹 끝으로 보내고, 그것도 안 되면 새 키를 만든다.
    try {
      return generateKeyBetween(group[group.length - 1]?.order ?? null, null);
    } catch {
      return generateKeyBetween(null, null);
    }
  }
}
