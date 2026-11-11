const TONES = {
  slate: 'bg-slate-100 text-slate-700',
  indigo: 'bg-indigo-50 text-indigo-700',
  amber: 'bg-amber-50 text-amber-700',
  rose: 'bg-rose-50 text-rose-700',
  emerald: 'bg-emerald-50 text-emerald-700',
} as const;

export type BadgeTone = keyof typeof TONES;

export default function Badge({ tone = 'slate', children }: { tone?: BadgeTone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex max-w-full items-center truncate rounded px-1.5 py-0.5 text-xs font-medium ${TONES[tone]}`}>
      {children}
    </span>
  );
}
