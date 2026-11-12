// GitHub OAuth 설정·통신과 리다이렉트 응답 헬퍼.
// 비밀값(client secret, code, access token)은 절대 로그나 응답에 남기지 않는다.

type OAuthConfig = { clientId: string; clientSecret: string; baseUrl: URL };

export class OAuthConfigError extends Error {
  readonly name = 'OAuthConfigError';
}

/** /login?error= 코드. 메시지는 app/login/page.tsx에 있다. */
export type LoginErrorCode = 'denied' | 'state' | 'token' | 'user' | 'config' | 'server';

export function getOAuthConfig(): OAuthConfig {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const base = process.env.APP_BASE_URL;
  const missing = [
    !clientId && 'GITHUB_CLIENT_ID',
    !clientSecret && 'GITHUB_CLIENT_SECRET',
    !base && 'APP_BASE_URL',
  ].filter(Boolean);
  if (missing.length > 0) {
    throw new OAuthConfigError(
      `GitHub 로그인 설정이 없습니다. .env.local에 ${missing.join(', ')}를 설정한 뒤 개발 서버를 다시 시작하세요. (docs/GITHUB_OAUTH.md 참고)`,
    );
  }
  let baseUrl: URL;
  try {
    baseUrl = new URL(base as string);
  } catch {
    throw new OAuthConfigError('APP_BASE_URL 형식이 올바르지 않습니다. 예: http://localhost:3000');
  }
  return { clientId: clientId as string, clientSecret: clientSecret as string, baseUrl };
}

export function callbackUrl(config: OAuthConfig): string {
  return new URL('/auth/github/callback', config.baseUrl).toString();
}

/** APP_BASE_URL이 없으면 요청 출처를 기준으로 쓴다(설정 오류 화면으로 보내기 위해). */
export function redirectBase(request: Request): URL {
  try {
    return getOAuthConfig().baseUrl;
  } catch {
    return new URL(new URL(request.url).origin);
  }
}

/** Response.redirect는 헤더를 바꿀 수 없으므로 Set-Cookie를 붙일 수 있게 직접 만든다. */
export function redirectResponse(location: string | URL, cookies: string[] = [], status = 302): Response {
  const headers = new Headers({ Location: location.toString() });
  for (const cookie of cookies) headers.append('Set-Cookie', cookie);
  return new Response(null, { status, headers });
}

type GithubUser = { id: number; login: string; avatar_url: string };

/** code → access token. 실패하면 null. */
export async function exchangeCode(config: OAuthConfig, code: string): Promise<string | null> {
  try {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: callbackUrl(config),
      }),
      cache: 'no-store',
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { access_token?: unknown };
    return typeof data.access_token === 'string' && data.access_token ? data.access_token : null;
  } catch {
    return null;
  }
}

/** access token → GitHub 사용자. 실패하면 null. */
export async function fetchGithubUser(accessToken: string): Promise<GithubUser | null> {
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'todo-goal-app',
      },
      cache: 'no-store',
    });
    if (!response.ok) return null;
    const data = (await response.json()) as Partial<GithubUser>;
    if (typeof data.id !== 'number' || typeof data.login !== 'string') return null;
    return { id: data.id, login: data.login, avatar_url: typeof data.avatar_url === 'string' ? data.avatar_url : '' };
  } catch {
    return null;
  }
}
