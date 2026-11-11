import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '@/store';
import type { Todo } from '@/types';

const base: Todo = {
  _id: 't1',
  title: '할 일',
  description: '',
  status: 'todo',
  priority: 'medium',
  dueDate: null,
  dayOfWeek: null,
  order: 'a0',
  weeklyPlanId: 'p1',
  weeklyGoalId: 'g1',
  createdAt: '',
  updatedAt: '',
};

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  useAppStore.setState({ todos: { t1: base } });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('moveTodo', () => {
  it('PATCH 1회로 status와 order를 함께 보내고 서버 응답을 반영한다', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ...base, status: 'done', order: 'a5' }), { status: 200 }));
    const pending = useAppStore.getState().moveTodo('t1', 'done', 'a5');
    // 응답 전에도 화면은 이미 옮겨져 있다 (낙관적 업데이트)
    expect(useAppStore.getState().todos.t1.status).toBe('done');
    await pending;

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/todos/t1');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body)).toEqual({ status: 'done', order: 'a5' });
    expect(useAppStore.getState().todos.t1).toMatchObject({ status: 'done', order: 'a5' });
  });

  it('API가 실패하면 이전 상태로 롤백하고 서버 메시지로 오류를 던진다', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: '서버 오류가 발생했습니다.' }), { status: 500 }));
    await expect(useAppStore.getState().moveTodo('t1', 'doing', 'a3')).rejects.toThrow('서버 오류가 발생했습니다.');
    expect(useAppStore.getState().todos.t1).toEqual(base);
  });

  it('늦게 실패한 이동은 그 사이 다시 옮긴 최신 상태를 덮어쓰지 않는다', async () => {
    let failFirst!: (r: Response) => void;
    fetchMock
      .mockImplementationOnce(() => new Promise<Response>((resolve) => (failFirst = resolve)))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ...base, status: 'done', order: 'a7' }), { status: 200 }));
    const store = useAppStore.getState();
    const first = store.moveTodo('t1', 'doing', 'a3');
    await store.moveTodo('t1', 'done', 'a7');
    failFirst(new Response(JSON.stringify({ error: '늦은 실패' }), { status: 500 }));
    await expect(first).rejects.toThrow('늦은 실패');
    expect(useAppStore.getState().todos.t1).toMatchObject({ status: 'done', order: 'a7' });
  });

  it('네트워크 오류에도 롤백한다', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(useAppStore.getState().moveTodo('t1', 'doing', 'a3')).rejects.toThrow();
    expect(useAppStore.getState().todos.t1).toEqual(base);
  });
});
