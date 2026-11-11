import Badge from '@/components/shared/Badge';
import type { WeeklyGoal } from '@/types';

type Props = {
  goal: WeeklyGoal;
  goalTitle: string | null;
  todoCount: number;
  doneCount: number;
};

export default function WeeklyGoalItem({ goal, goalTitle, todoCount, doneCount }: Props) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-3 py-2" data-testid="weekly-goal">
      <div className="min-w-0">
        <p className="text-sm font-medium">{goal.text}</p>
        <div className="mt-1">
          {goal.goalId ? (
            <Badge tone="emerald">{goalTitle ?? '1년 목표'}</Badge>
          ) : (
            <Badge tone="rose">1년 목표 미연결</Badge>
          )}
        </div>
      </div>
      <span className="text-xs text-slate-500">
        할 일 {doneCount}/{todoCount}
      </span>
    </li>
  );
}
