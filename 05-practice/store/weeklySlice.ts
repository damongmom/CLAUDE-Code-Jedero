import { api } from '@/lib/http';
import type { WeeklyGoal, WeeklyPlan } from '@/types';
import type { SliceCreator } from './types';

export type WeeklyGoalInput = Pick<WeeklyGoal, 'text' | 'goalId'> & { _id?: string };
export type WeeklyPlanInput = { weekStart: string; goals: WeeklyGoalInput[]; memo: string };
export type WeeklyPlanPatch = Partial<{ goals: WeeklyGoalInput[]; memo: string; retrospective: string }>;

export interface WeeklySlice {
  plans: Record<string, WeeklyPlan>;
  fetchRecentPlans: (limit: number) => Promise<WeeklyPlan[]>;
  fetchPlanByWeek: (weekStart: string) => Promise<WeeklyPlan | null>;
  fetchPlan: (id: string) => Promise<WeeklyPlan>;
  createPlan: (input: WeeklyPlanInput) => Promise<WeeklyPlan>;
  updatePlan: (id: string, patch: WeeklyPlanPatch) => Promise<WeeklyPlan>;
  deletePlan: (id: string) => Promise<void>;
}

const byId = (plans: WeeklyPlan[]) => Object.fromEntries(plans.map((plan) => [plan._id, plan]));

export const createWeeklySlice: SliceCreator<WeeklySlice> = (set, get) => ({
  plans: {},

  fetchRecentPlans: async (limit) => {
    const plans = await api<WeeklyPlan[]>(`/api/weekly?limit=${limit}`);
    set((state) => ({ plans: { ...state.plans, ...byId(plans) } }), false, 'weekly/fetchRecent');
    return plans;
  },

  fetchPlanByWeek: async (weekStart) => {
    const [plan] = await api<WeeklyPlan[]>(`/api/weekly?weekStart=${weekStart}`);
    if (plan) set((state) => ({ plans: { ...state.plans, [plan._id]: plan } }), false, 'weekly/fetchByWeek');
    return plan ?? null;
  },

  fetchPlan: async (id) => {
    const plan = await api<WeeklyPlan>(`/api/weekly/${id}`);
    set((state) => ({ plans: { ...state.plans, [plan._id]: plan } }), false, 'weekly/fetch');
    return plan;
  },

  createPlan: async (input) => {
    const plan = await api<WeeklyPlan>('/api/weekly', { method: 'POST', body: input });
    set((state) => ({ plans: { ...state.plans, [plan._id]: plan } }), false, 'weekly/create');
    return plan;
  },

  updatePlan: async (id, patch) => {
    const before = get().plans[id];
    const plan = await api<WeeklyPlan>(`/api/weekly/${id}`, { method: 'PUT', body: patch });
    // 제거된 주간 목표에 연결된 할 일은 미연결로 전환 (서버 규칙과 동일)
    const kept = new Set(plan.goals.map((g) => g._id));
    const removed = new Set((before?.goals ?? []).filter((g) => !kept.has(g._id)).map((g) => g._id));
    set(
      (state) => ({
        plans: { ...state.plans, [plan._id]: plan },
        todos:
          removed.size === 0
            ? state.todos
            : Object.fromEntries(
                Object.entries(state.todos).map(([todoId, todo]) => [
                  todoId,
                  todo.weeklyGoalId && removed.has(todo.weeklyGoalId) ? { ...todo, weeklyGoalId: null } : todo,
                ]),
              ),
      }),
      false,
      'weekly/update',
    );
    return plan;
  },

  deletePlan: async (id) => {
    await api(`/api/weekly/${id}`, { method: 'DELETE' });
    set(
      (state) => {
        const plans = { ...state.plans };
        delete plans[id];
        const todos = Object.fromEntries(
          Object.entries(state.todos).map(([todoId, todo]) => [
            todoId,
            todo.weeklyPlanId === id ? { ...todo, weeklyPlanId: null, weeklyGoalId: null } : todo,
          ]),
        );
        return { plans, todos };
      },
      false,
      'weekly/delete',
    );
  },
});
