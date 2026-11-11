import type { Types } from 'mongoose';
import type { Priority, TodoStatus } from '@/types';

/** lean() 결과 타입. 응답 시 ObjectId는 JSON 직렬화로 문자열이 된다. */
export type LeanGoal = {
  _id: Types.ObjectId;
  title: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
};

export type LeanWeeklyGoal = {
  _id: Types.ObjectId;
  text: string;
  goalId: Types.ObjectId | null;
};

export type LeanWeeklyPlan = {
  _id: Types.ObjectId;
  weekStart: string;
  goals: LeanWeeklyGoal[];
  memo: string;
  retrospective: string;
  createdAt: Date;
  updatedAt: Date;
};

export type LeanTodo = {
  _id: Types.ObjectId;
  title: string;
  description: string;
  status: TodoStatus;
  priority: Priority;
  dueDate: string | null;
  dayOfWeek: number | null;
  order: string;
  weeklyPlanId: Types.ObjectId | null;
  weeklyGoalId: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
};
