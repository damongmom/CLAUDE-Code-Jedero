import type { StateCreator } from 'zustand';
import type { GoalSlice } from './goalSlice';
import type { TodoSlice } from './todoSlice';
import type { WeeklySlice } from './weeklySlice';

export type AppState = GoalSlice & WeeklySlice & TodoSlice;

export type SliceCreator<T> = StateCreator<AppState, [['zustand/devtools', never]], [], T>;
