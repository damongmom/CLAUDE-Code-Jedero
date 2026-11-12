import type { GoalWithProgress } from '@/types';
import GoalProgress from './GoalProgress';

type Props = {
  goal: GoalWithProgress;
  onEdit: () => void;
  onDelete: () => void;
};

export default function GoalCard({ goal, onEdit, onDelete }: Props) {
  return (
    <article className="card flex flex-col gap-3" data-testid="goal-card">
      <div className="flex items-start justify-between gap-2">
        <h2 className="font-semibold">{goal.title}</h2>
        <div className="flex shrink-0 gap-1">
          <button type="button" className="btn-secondary px-2 py-1 text-xs" onClick={onEdit} aria-label={`${goal.title} 수정`}>
            수정
          </button>
          <button type="button" className="btn-secondary px-2 py-1 text-xs text-rose-600" onClick={onDelete} aria-label={`${goal.title} 삭제`}>
            삭제
          </button>
        </div>
      </div>
      {goal.description ? (
        <p className="whitespace-pre-wrap text-sm text-slate-600">{goal.description}</p>
      ) : (
        <p className="text-sm text-slate-400">설명 없음</p>
      )}
      <GoalProgress goal={goal} />
    </article>
  );
}
