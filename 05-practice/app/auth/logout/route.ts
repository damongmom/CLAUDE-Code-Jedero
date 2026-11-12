import { deleteSession } from '@/lib/auth';
import { SESSION_COOKIE, clearCookie, readCookie } from '@/lib/cookies';
import { connectDB } from '@/lib/mongodb';
import { redirectBase, redirectResponse } from '@/lib/oauth';

export const dynamic = 'force-dynamic';

/** 로그아웃: 서버 세션 문서 삭제 + 쿠키 만료 (AC6). sameSite=Lax라 교차 사이트 POST에는 쿠키가 실리지 않는다. */
export async function POST(request: Request) {
  const token = readCookie(request, SESSION_COOKIE);
  try {
    await connectDB();
    await deleteSession(token);
    console.info('[auth] logout');
  } catch (error) {
    // DB 오류여도 브라우저 쿠키는 지운다.
    console.error('[auth] logout failed', { error: error instanceof Error ? error.name : 'unknown' });
  }
  return redirectResponse(new URL('/login', redirectBase(request)), [clearCookie(SESSION_COOKIE)], 303);
}
