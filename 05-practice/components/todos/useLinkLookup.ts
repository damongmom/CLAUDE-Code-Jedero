'use client';

import { useCallback, useMemo } from 'react';
import { useAppStore } from '@/store';
import type { Todo } from '@/types';

export type TodoLinks = { weeklyGoalText: string | null; goalTitle: string | null };

/** 할 일 → 주간 목표 → 1년 목표 이름을 찾는다 (PRD 연결 구조 표시용). */
export function useLinkLookup(): (todo: Todo) => TodoLinks {
  const plans = useAppStore((state) => state.plans);
  const goals = useAppStore((state) => state.goals);

  const index = useMemo(() => {
    const goalTitles = new Map(goals.map((goal) => [goal._id, goal.title]));
    const weeklyGoals = new Map<string, TodoLinks>();
    for (const plan of Object.values(plans)) {
      for (const weeklyGoal of plan.goals) {
        weeklyGoals.set(weeklyGoal._id, {
          weeklyGoalText: weeklyGoal.text,
          goalTitle: weeklyGoal.goalId ? (goalTitles.get(weeklyGoal.goalId) ?? null) : null,
        });
      }
    }
    return weeklyGoals;
  }, [plans, goals]);

  return useCallback(
    (todo: Todo) =>
      (todo.weeklyGoalId && index.get(todo.weeklyGoalId)) || { weeklyGoalText: null, goalTitle: null },
    [index],
  );
}
