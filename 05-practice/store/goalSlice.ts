import { api } from '@/lib/http';
import type { Goal, GoalWithProgress } from '@/types';
import type { SliceCreator } from './types';

export type GoalInput = { title: string; description: string };

export interface GoalSlice {
  goals: GoalWithProgress[];
  goalsLoaded: boolean;
  fetchGoals: () => Promise<void>;
  addGoal: (input: GoalInput) => Promise<void>;
  updateGoal: (id: string, input: GoalInput) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
}

export const createGoalSlice: SliceCreator<GoalSlice> = (set, get) => ({
  goals: [],
  goalsLoaded: false,

  fetchGoals: async () => {
    const goals = await api<GoalWithProgress[]>('/api/goals');
    set({ goals, goalsLoaded: true }, false, 'goals/fetch');
  },

  addGoal: async (input) => {
    const goal = await api<Goal>('/api/goals', { method: 'POST', body: input });
    set(
      (state) => ({ goals: [...state.goals, { ...goal, progress: 0, todoCount: 0, doneCount: 0 }] }),
      false,
      'goals/add',
    );
  },

  updateGoal: async (id, input) => {
    const goal = await api<Goal>(`/api/goals/${id}`, { method: 'PUT', body: input });
    set(
      (state) => ({ goals: state.goals.map((g) => (g._id === id ? { ...g, ...goal } : g)) }),
      false,
      'goals/update',
    );
  },

  deleteGoal: async (id) => {
    await api(`/api/goals/${id}`, { method: 'DELETE' });
    // 서버와 같은 삭제 규칙을 스토어에도 반영한다: 연결된 주간 목표는 미연결로 전환.
    const plans = Object.fromEntries(
      Object.entries(get().plans).map(([planId, plan]) => [
        planId,
        { ...plan, goals: plan.goals.map((g) => (g.goalId === id ? { ...g, goalId: null } : g)) },
      ]),
    );
    set((state) => ({ goals: state.goals.filter((g) => g._id !== id), plans }), false, 'goals/delete');
  },
});
