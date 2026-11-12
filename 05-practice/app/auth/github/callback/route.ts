import { createSession, deleteSession, safeEqual, sessionCookie } from '@/lib/auth';
import { SESSION_COOKIE, STATE_COOKIE, STATE_COOKIE_PATH, clearCookie, readCookie } from '@/lib/cookies';
import { connectDB } from '@/lib/mongodb';
import {
  exchangeCode,
  fetchGithubUser,
  getOAuthConfig,
  redirectBase,
  redirectResponse,
  type LoginErrorCode,
} from '@/lib/oauth';
import { UserModel } from '@/models/User';

export const dynamic = 'force-dynamic';

/** GitHub 콜백: state 검증 → code 교환 → 사용자 저장(AC3) → 세션 발급 */
export async function GET(request: Request) {
  const base = redirectBase(request);
  const clearState = clearCookie(STATE_COOKIE, STATE_COOKIE_PATH);
  // 리다이렉트 대상은 고정 경로만 사용한다(외부 입력을 따르지 않음 → open redirect 없음).
  const fail = (code: LoginErrorCode) => {
    console.warn('[auth] login failed', { reason: code });
    return redirectResponse(new URL(`/login?error=${code}`, base), [clearState]);
  };

  let config;
  try {
    config = getOAuthConfig();
  } catch {
    return fail('config');
  }

  const params = new URL(request.url).searchParams;
  if (params.get('error')) return fail('denied');
  if (!safeEqual(params.get('state'), readCookie(request, STATE_COOKIE))) return fail('state');

  const code = params.get('code');
  if (!code) return fail('token');
  const accessToken = await exchangeCode(config, code);
  if (!accessToken) return fail('token');
  const githubUser = await fetchGithubUser(accessToken);
  if (!githubUser) return fail('user');

  try {
    await connectDB();
    const upsertUser = () =>
      UserModel.findOneAndUpdate(
        { githubId: githubUser.id },
        { username: githubUser.login, avatarUrl: githubUser.avatar_url },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    // 같은 사용자의 첫 로그인이 동시에 들어오면 upsert끼리 githubId unique에서 경합할 수 있다. 한 번 재시도하면 기존 문서를 갱신한다.
    const user = await upsertUser().catch((error: { code?: number }) => {
      if (error?.code === 11000) return upsertUser();
      throw error;
    });
    // 같은 브라우저의 이전 세션은 고아로 남기지 않는다.
    await deleteSession(readCookie(request, SESSION_COOKIE));
    const token = await createSession(user._id);
    console.info('[auth] login success', { githubId: githubUser.id, username: githubUser.login });
    return redirectResponse(new URL('/', base), [sessionCookie(token), clearState]);
  } catch (error) {
    console.error('[auth] login failed', { reason: 'server', error: error instanceof Error ? error.name : 'unknown' });
    return fail('server');
  }
}
