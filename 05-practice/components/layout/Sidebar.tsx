'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', label: '대시보드' },
  { href: '/todos', label: '할 일 보드' },
  { href: '/weekly', label: '주간 계획' },
  { href: '/goals', label: '1년 목표' },
  { href: '/unlinked', label: '미연결 항목' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <nav className="border-b border-slate-200 bg-white md:w-52 md:shrink-0 md:border-b-0 md:border-r">
      <div className="hidden px-5 py-5 text-lg font-bold text-indigo-700 md:block">Plan &amp; Do</div>
      <ul className="flex gap-1 overflow-x-auto px-2 py-2 md:flex-col md:px-3">
        {NAV_ITEMS.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className={`block whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium ${
                isActive(item.href) ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
