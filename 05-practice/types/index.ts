export const TODO_STATUSES = ['todo', 'doing', 'done'] as const;
export type TodoStatus = (typeof TODO_STATUSES)[number];

/** 주당 주간 목표 상한 (PRD 4장). 서버 모델과 클라이언트 폼이 함께 쓴다. */
export const MAX_WEEKLY_GOALS = 5;

export const PRIORITIES = ['high', 'medium', 'low'] as const;
export type Priority = (typeof PRIORITIES)[number];

export interface Goal {
  _id: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

/** GET /api/goals 응답: 목표 + 연결된 할 일 기준 진행률 */
export interface GoalWithProgress extends Goal {
  progress: number;
  todoCount: number;
  doneCount: number;
}

export interface WeeklyGoal {
  _id: string;
  text: string;
  /** null이면 1년 목표와 미연결 상태 */
  goalId: string | null;
}

export interface WeeklyPlan {
  _id: string;
  /** KST 기준 월요일, YYYY-MM-DD */
  weekStart: string;
  goals: WeeklyGoal[];
  memo: string;
  retrospective: string;
  createdAt: string;
  updatedAt: string;
}

export interface Todo {
  _id: string;
  title: string;
  description: string;
  status: TodoStatus;
  priority: Priority;
  /** YYYY-MM-DD 또는 null */
  dueDate: string | null;
  /** 0(일)~6(토), null이면 요일 미지정 */
  dayOfWeek: number | null;
  /** fractional index 문자열, 사전순 정렬 */
  order: string;
  weeklyPlanId: string | null;
  /** null이면 주간 목표와 미연결 상태 */
  weeklyGoalId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UnlinkedWeeklyGoal {
  _id: string;
  text: string;
  planId: string;
  weekStart: string;
}

export interface UnlinkedResponse {
  todos: Todo[];
  weeklyGoals: UnlinkedWeeklyGoal[];
}
