import { api } from '@/lib/http';
import type { Priority, Todo, TodoStatus } from '@/types';
import type { SliceCreator } from './types';

export type TodoInput = {
  title: string;
  description: string;
  weeklyGoalId: string;
  dayOfWeek: number | null;
  priority: Priority;
  dueDate: string | null;
};
export type TodoPatch = Partial<TodoInput & { status: TodoStatus; order: string }>;

export interface TodoSlice {
  todos: Record<string, Todo>;
  fetchTodosByPlan: (planId: string) => Promise<void>;
  addTodo: (input: TodoInput) => Promise<Todo>;
  updateTodo: (id: string, patch: TodoPatch) => Promise<Todo>;
  /** 드래그앤드랍: 낙관적 업데이트 후 PATCH 1회, 실패하면 롤백하고 오류를 다시 던진다. */
  moveTodo: (id: string, status: TodoStatus, order: string) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
}

export const createTodoSlice: SliceCreator<TodoSlice> = (set, get) => ({
  todos: {},

  fetchTodosByPlan: async (planId) => {
    const list = await api<Todo[]>(`/api/todos?weeklyPlanId=${planId}`);
    set(
      (state) => {
        const todos = Object.fromEntries(Object.entries(state.todos).filter(([, t]) => t.weeklyPlanId !== planId));
        for (const todo of list) todos[todo._id] = todo;
        return { todos };
      },
      false,
      'todos/fetchByPlan',
    );
  },

  addTodo: async (input) => {
    const todo = await api<Todo>('/api/todos', { method: 'POST', body: input });
    set((state) => ({ todos: { ...state.todos, [todo._id]: todo } }), false, 'todos/add');
    return todo;
  },

  updateTodo: async (id, patch) => {
    const todo = await api<Todo>(`/api/todos/${id}`, { method: 'PATCH', body: patch });
    set((state) => ({ todos: { ...state.todos, [todo._id]: todo } }), false, 'todos/update');
    return todo;
  },

  moveTodo: async (id, status, order) => {
    const previous = get().todos[id];
    if (!previous) return;
    set((state) => ({ todos: { ...state.todos, [id]: { ...previous, status, order } } }), false, 'todos/moveOptimistic');
    try {
      const saved = await api<Todo>(`/api/todos/${id}`, { method: 'PATCH', body: { status, order } });
      // 응답 순서가 뒤바뀌어도 더 최근 이동을 덮어쓰지 않는다.
      const current = get().todos[id];
      if (current && current.status === status && current.order === order) {
        set((state) => ({ todos: { ...state.todos, [id]: saved } }), false, 'todos/moveSaved');
      }
    } catch (error) {
      // 그 사이 같은 카드를 다시 옮겼다면 최신 상태를 덮어쓰지 않는다.
      const current = get().todos[id];
      if (current && current.status === status && current.order === order) {
        set((state) => ({ todos: { ...state.todos, [id]: previous } }), false, 'todos/moveRollback');
      }
      throw error;
    }
  },

  deleteTodo: async (id) => {
    await api(`/api/todos/${id}`, { method: 'DELETE' });
    set(
      (state) => {
        const todos = { ...state.todos };
        delete todos[id];
        return { todos };
      },
      false,
      'todos/delete',
    );
  },
});
