import { describe, expect, it } from 'vitest';
import { compareTodos, computeMovedOrder, generateKeyBetween } from '@/lib/fractionalIndex';
import type { Priority } from '@/types';

type Card = { id: string; priority: Priority; order: string };

function makeColumn(specs: Array<[string, Priority]>): Card[] {
  let last: string | null = null;
  return specs.map(([id, priority]) => {
    last = generateKeyBetween(last, null);
    return { id, priority, order: last };
  });
}

/** 카드를 옮긴 뒤 화면 순서(id 배열)를 돌려준다. */
function moveAndRender(column: Card[], movedId: string, targetIndex: number): string[] {
  const moved = column.find((c) => c.id === movedId)!;
  const rest = column.filter((c) => c.id !== movedId).sort(compareTodos);
  const order = computeMovedOrder(rest, targetIndex, moved);
  return [...rest, { ...moved, order }].sort(compareTodos).map((c) => c.id);
}

describe('computeMovedOrder', () => {
  it('맨 앞, 중간, 맨 끝으로 옮길 수 있다', () => {
    const col = makeColumn([['a', 'medium'], ['b', 'medium'], ['c', 'medium']]);
    expect(moveAndRender(col, 'c', 0)).toEqual(['c', 'a', 'b']);
    expect(moveAndRender(col, 'a', 1)).toEqual(['b', 'a', 'c']);
    expect(moveAndRender(col, 'a', 2)).toEqual(['b', 'c', 'a']);
  });

  it('잘못된 키가 섞여 있어도 예외 없이 유효한 키를 만든다', () => {
    const key = computeMovedOrder([{ priority: 'medium', order: 'zzzz' }], 1, { priority: 'medium', order: 'a0' });
    expect(() => generateKeyBetween(key, null)).not.toThrow();
  });

  it('빈 컬럼에 놓으면 유효한 키를 만든다', () => {
    expect(computeMovedOrder([], 0, { priority: 'low', order: 'a0' })).toBeTypeOf('string');
  });

  it('High 카드는 항상 상단에 고정된다', () => {
    const col = makeColumn([['h1', 'high'], ['m1', 'medium'], ['m2', 'medium']]);
    // medium 카드를 맨 위(High 영역)에 놓아도 High 아래 첫 자리로 붙는다
    expect(moveAndRender(col, 'm2', 0)).toEqual(['h1', 'm2', 'm1']);
    // High 카드를 맨 아래에 놓아도 High 그룹 끝(=맨 위)에 남는다
    expect(moveAndRender(col, 'h1', 2)).toEqual(['h1', 'm1', 'm2']);
  });

  it('생성된 키는 이웃 사이에 엄격히 위치한다', () => {
    const col = makeColumn([['a', 'medium'], ['b', 'medium']]);
    const key = computeMovedOrder(col, 1, { priority: 'medium', order: 'zz' });
    expect(key > col[0].order && key < col[1].order).toBe(true);
  });
});
