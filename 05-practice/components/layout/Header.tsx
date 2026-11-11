'use client';

import { useEffect, useState } from 'react';
import { formatWeekRange, getWeekStart } from '@/lib/week';

export default function Header() {
  // 정적 프리렌더 시점의 날짜가 굳지 않도록 브라우저에서 계산한다.
  const [weekLabel, setWeekLabel] = useState('');
  useEffect(() => {
    setWeekLabel(formatWeekRange(getWeekStart()));
  }, []);

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
      <span className="text-sm font-semibold text-slate-700 md:hidden">Plan &amp; Do</span>
      <span className="ml-auto text-sm text-slate-500">{weekLabel && `이번 주 ${weekLabel}`}</span>
    </header>
  );
}
