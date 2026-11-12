import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '할일 + 계획 관리',
  description: '할 일, 주간 목표, 1년 목표를 연결해 관리하는 앱',
};

// 앱 화면의 사이드바·헤더는 app/(app)/layout.tsx에 있다. 로그인 페이지는 그 밖에 있어 단독으로 보인다.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
