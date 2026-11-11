import { describe, expect, it } from 'vitest';
import { calcProgress, countByStatus } from '@/lib/progress';
import type { TodoStatus } from '@/types';

const todos = (...statuses: TodoStatus[]) => statuses.map((status) => ({ status }));

describe('calcProgress', () => {
  it('할 일이 0개면 0%', () => {
    expect(calcProgress([])).toBe(0);
  });

  it('4개 중 2개 done이면 50%', () => {
    expect(calcProgress(todos('done', 'done', 'todo', 'doing'))).toBe(50);
  });

  it('doing은 완료로 세지 않는다', () => {
    expect(calcProgress(todos('doing', 'doing'))).toBe(0);
  });

  it('반올림한다 (1/3 → 33, 2/3 → 67)', () => {
    expect(calcProgress(todos('done', 'todo', 'todo'))).toBe(33);
    expect(calcProgress(todos('done', 'done', 'todo'))).toBe(67);
  });
});

describe('countByStatus', () => {
  it('상태별 개수를 센다', () => {
    expect(countByStatus(todos('todo', 'done', 'done'))).toEqual({ todo: 1, doing: 0, done: 2 });
  });
});
