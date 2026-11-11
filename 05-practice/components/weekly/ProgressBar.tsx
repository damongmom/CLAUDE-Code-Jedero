export default function ProgressBar({ value, label }: { value: number; label?: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div>
      {label && (
        <div className="mb-1 flex justify-between text-xs text-slate-500">
          <span>{label}</span>
          <span className="font-semibold text-slate-700">{clamped}%</span>
        </div>
      )}
      <div
        className="h-2 overflow-hidden rounded-full bg-slate-200"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? '진행률'}
      >
        <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}
