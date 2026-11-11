import ProgressBar from '@/components/weekly/ProgressBar';
import type { GoalWithProgress } from '@/types';

/** PRD P1: 1년 목표 단위 진행률 (연결된 주간 목표들의 할 일 기준) */
export default function GoalProgress({ goal }: { goal: GoalWithProgress }) {
  return (
    <div>
      <ProgressBar value={goal.progress} label="진행률" />
      <p className="mt-1 text-xs text-slate-500">
        연결된 할 일 {goal.todoCount}개 중 {goal.doneCount}개 완료
      </p>
    </div>
  );
}
