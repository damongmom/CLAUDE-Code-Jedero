import type { Priority } from '@/types';
import Badge, { type BadgeTone } from './Badge';

export const PRIORITY_LABELS: Record<Priority, string> = { high: 'High', medium: 'Medium', low: 'Low' };
const PRIORITY_TONES: Record<Priority, BadgeTone> = { high: 'rose', medium: 'amber', low: 'slate' };

export default function PriorityBadge({ priority }: { priority: Priority }) {
  return <Badge tone={PRIORITY_TONES[priority]}>{PRIORITY_LABELS[priority]}</Badge>;
}
