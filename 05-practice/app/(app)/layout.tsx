import AppShell from '@/components/layout/AppShell';

/** 로그인이 필요한 앱 화면 공통 레이아웃 (URL에는 (app)이 나타나지 않는다) */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
