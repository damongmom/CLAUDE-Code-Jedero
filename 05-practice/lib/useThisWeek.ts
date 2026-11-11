'use client';

import { useEffect, useState } from 'react';
import { getWeekStart } from '@/lib/week';

/**
 * 이번 주 월요일(KST). 정적 프리렌더 시점 날짜가 굳지 않도록 마운트 후에 계산하며,
 * 계산 전에는 null이다.
 */
export function useThisWeek(): string | null {
  const [weekStart, setWeekStart] = useState<string | null>(null);
  useEffect(() => setWeekStart(getWeekStart()), []);
  return weekStart;
}
