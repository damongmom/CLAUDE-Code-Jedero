import Link from 'next/link';
import { calcProgress } from '@/lib/progress';
import { formatWeekRange } from '@/lib/week';
import type { Todo, WeeklyPlan } from '@/types';
import ProgressBar from './ProgressBar';

type Props = { plan: WeeklyPlan; todos: Todo[]; isThisWeek: boolean };

export default function WeeklyPlanCard({ plan, todos, isThisWeek }: Props) {
  return (
    <Link href={`/weekly/${plan._id}`} className="card block transition hover:border-indigo-300" data-testid="weekly-plan-card">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-semibold">
          {formatWeekRange(plan.weekStart)}
          {isThisWeek && <span className="ml-2 rounded bg-indigo-600 px-1.5 py-0.5 text-xs text-white">이번 주</span>}
        </h2>
        <span className="text-xs text-slate-500">할 일 {todos.length}개</span>
      </div>
      {plan.goals.length > 0 ? (
        <ul className="mb-3 list-inside list-disc text-sm text-slate-600">
          {plan.goals.map((goal) => (
            <li key={goal._id} className="truncate">
              {goal.text}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-3 text-sm text-slate-400">주간 목표 없음</p>
      )}
      <ProgressBar value={calcProgress(todos)} label="주간 진행률" />
    </Link>
  );
}
