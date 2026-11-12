import type { Metadata } from 'next';

export const metadata: Metadata = { title: '로그인 | 할일 + 계획 관리' };

const ERROR_MESSAGES: Record<string, string> = {
  denied: 'GitHub에서 로그인을 취소했습니다. 다시 시도해 주세요.',
  state: '로그인 요청이 만료되었거나 올바르지 않습니다. 다시 시도해 주세요. (APP_BASE_URL과 같은 주소로 접속했는지 확인하세요)',
  token: 'GitHub 인증을 완료하지 못했습니다. OAuth App의 콜백 URL과 Client Secret을 확인하세요.',
  user: 'GitHub 사용자 정보를 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.',
  config: 'GitHub 로그인 설정이 없습니다. .env.local의 GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, APP_BASE_URL을 확인하세요.',
  server: '로그인 처리 중 서버 오류가 발생했습니다. DB 연결을 확인하세요.',
};

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  const error = searchParams.error ? (ERROR_MESSAGES[searchParams.error] ?? '로그인에 실패했습니다.') : null;

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold text-indigo-700">Plan &amp; Do</h1>
        <p className="mt-2 text-sm text-slate-600">할 일, 주간 목표, 1년 목표를 한곳에서 관리하세요.</p>

        {error && (
          <p role="alert" className="mt-6 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" data-testid="login-error">
            {error}
          </p>
        )}

        {/* 서버 라우트로의 전체 페이지 이동이어야 하므로 next/link가 아닌 a 태그를 쓴다 */}
        <a
          href="/auth/github"
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-md bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
          data-testid="github-login"
        >
          <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4 fill-current">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
          GitHub로 로그인
        </a>
      </div>
    </main>
  );
}
