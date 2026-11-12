import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from '@/lib/cookies';

/**
 * 세션 쿠키가 없는 페이지 요청을 /login으로 보낸다.
 * Edge 런타임에서는 DB를 조회할 수 없어 쿠키 존재만 본다. 위조·만료 쿠키는 데이터 API가 401로 막고,
 * 그 응답이 쿠키를 지우므로 다음 이동부터 여기서 걸러진다.
 * 리다이렉트 대상은 고정 경로(/login)이며 next 같은 외부 입력을 붙이지 않는다.
 */
export function middleware(request: NextRequest) {
  if (request.cookies.get(SESSION_COOKIE)?.value) return NextResponse.next();
  return NextResponse.redirect(new URL('/login', request.url));
}

export const config = {
  // api·auth·login은 경로 경계까지 확인해 제외한다(/authors 같은 경로가 보호에서 빠지지 않게).
  matcher: ['/((?!(?:api|auth|login)(?:/|$)|_next/|favicon\\.ico$).*)'],
};
