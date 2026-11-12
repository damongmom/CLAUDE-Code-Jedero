import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { createGoalSlice } from './goalSlice';
import { createTodoSlice } from './todoSlice';
import type { AppState } from './types';
import { createWeeklySlice } from './weeklySlice';

export type { AppState };

export const useAppStore = create<AppState>()(
  devtools(
    (...args) => ({
      ...createGoalSlice(...args),
      ...createWeeklySlice(...args),
      ...createTodoSlice(...args),
    }),
    { name: 'todo-goal-app', enabled: process.env.NODE_ENV !== 'production' },
  ),
);
