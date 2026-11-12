import { generateToken } from '@/lib/auth';
import { STATE_COOKIE, STATE_COOKIE_PATH, serializeCookie } from '@/lib/cookies';
import { callbackUrl, getOAuthConfig, OAuthConfigError, redirectResponse } from '@/lib/oauth';

// Next 14는 동적 API를 쓰지 않는 GET을 빌드 때 정적으로 만든다. 그러면 state가 고정되므로 반드시 동적으로.
export const dynamic = 'force-dynamic';

const STATE_MAX_AGE = 10 * 60;

/** GitHub 로그인 시작 (AC2) */
export async function GET(request: Request) {
  let config;
  try {
    config = getOAuthConfig();
  } catch (error) {
    if (error instanceof OAuthConfigError) {
      console.error('[auth]', error.message);
      return Response.json({ error: error.message }, { status: 503 });
    }
    throw error;
  }

  // state 쿠키는 브라우저가 접속한 호스트에 저장되므로, 콜백 주소(APP_BASE_URL)와 호스트가 다르면 먼저 맞춘다.
  // Next dev는 request.url의 호스트를 자기 설정값으로 바꾸므로 실제 접속 호스트는 Host 헤더로 판단한다.
  const requestHost = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? new URL(request.url).host;
  if (requestHost !== config.baseUrl.host) {
    return redirectResponse(new URL('/auth/github', config.baseUrl));
  }

  const state = generateToken();
  const authorize = new URL('https://github.com/login/oauth/authorize');
  authorize.searchParams.set('client_id', config.clientId);
  authorize.searchParams.set('redirect_uri', callbackUrl(config));
  authorize.searchParams.set('scope', 'read:user');
  authorize.searchParams.set('state', state);

  return redirectResponse(authorize, [
    serializeCookie(STATE_COOKIE, state, { path: STATE_COOKIE_PATH, maxAge: STATE_MAX_AGE }),
  ]);
}
