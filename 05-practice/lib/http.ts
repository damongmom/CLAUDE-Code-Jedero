let redirectingToLogin = false;

/** 클라이언트용 fetch 래퍼. 실패하면 서버가 준 오류 메시지로 Error를 던진다. */
export async function api<T>(url: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const { method = 'GET', body } = options;
  const response = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });
  const data: unknown = await response.json().catch(() => null);
  // 세션이 없거나 만료되면 로그인 화면으로 한 번만 보낸다(서버가 무효 쿠키는 이미 지웠다).
  // 여러 요청이 동시에 401을 받아도 이동은 한 번이다.
  if (response.status === 401 && typeof window !== 'undefined' && !redirectingToLogin && window.location.pathname !== '/login') {
    redirectingToLogin = true;
    window.location.replace('/login');
  }
  if (!response.ok) {
    const message = (data as { error?: string } | null)?.error;
    throw new Error(message ?? `요청에 실패했습니다. (${response.status})`);
  }
  return data as T;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
}
