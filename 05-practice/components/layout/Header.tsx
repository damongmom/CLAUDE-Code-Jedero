'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/http';
import { formatWeekRange, getWeekStart } from '@/lib/week';

type Me = { username: string; avatarUrl: string };

export default function Header() {
  // 정적 프리렌더 시점의 날짜가 굳지 않도록 브라우저에서 계산한다.
  const [weekLabel, setWeekLabel] = useState('');
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    setWeekLabel(formatWeekRange(getWeekStart()));
    // 401이면 lib/http.ts가 /login으로 보낸다.
    api<Me>('/api/auth/me').then(setMe).catch(() => setMe(null));
  }, []);

  return (
    <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
      <span className="text-sm font-semibold text-slate-700 md:hidden">Plan &amp; Do</span>
      <span className="ml-auto text-sm text-slate-500">{weekLabel && `이번 주 ${weekLabel}`}</span>
      {me && (
        <div className="flex items-center gap-2" data-testid="account">
          {me.avatarUrl && (
            // 외부 GitHub 아바타 한 장이라 next/image 도메인 설정 없이 img를 쓴다.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={me.avatarUrl} alt="" className="h-7 w-7 rounded-full border border-slate-200" />
          )}
          <span className="hidden text-sm font-medium text-slate-700 sm:inline" data-testid="username">
            {me.username}
          </span>
          <form action="/auth/logout" method="post">
            <button type="submit" className="btn-secondary px-2 py-1 text-xs">
              로그아웃
            </button>
          </form>
        </div>
      )}
    </header>
  );
}
