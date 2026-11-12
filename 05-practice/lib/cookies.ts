// 쿠키 이름과 직렬화. 다른 lib 모듈에 의존하지 않아 api.ts·auth.ts 양쪽에서 순환 없이 쓴다.

export const SESSION_COOKIE = 'session';
export const STATE_COOKIE = 'oauth_state';
export const STATE_COOKIE_PATH = '/auth/github';

type CookieOptions = {
  path?: string;
  maxAge?: number;
  httpOnly?: boolean;
  sameSite?: 'Lax' | 'Strict';
  secure?: boolean;
};

const isProduction = () => process.env.NODE_ENV === 'production';

export function serializeCookie(name: string, value: string, options: CookieOptions = {}): string {
  const { path = '/', maxAge, httpOnly = true, sameSite = 'Lax', secure = isProduction() } = options;
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${path}`];
  if (maxAge !== undefined) parts.push(`Max-Age=${maxAge}`);
  if (httpOnly) parts.push('HttpOnly');
  parts.push(`SameSite=${sameSite}`);
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

/** 발급할 때와 같은 path로 만료시켜야 브라우저가 실제로 지운다. */
export function clearCookie(name: string, path = '/'): string {
  return serializeCookie(name, '', { path, maxAge: 0 });
}

export function parseCookies(header: string | null): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!header) return cookies;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    const name = part.slice(0, index).trim();
    if (!name || name in cookies) continue;
    try {
      cookies[name] = decodeURIComponent(part.slice(index + 1).trim());
    } catch {
      // 잘못 인코딩된 값은 무시한다.
    }
  }
  return cookies;
}

/** NextRequest 전용 API 대신 표준 Request의 cookie 헤더를 읽는다 (테스트에서 plain Request로 호출 가능). */
export function readCookie(request: Request, name: string): string | null {
  return parseCookies(request.headers.get('cookie'))[name] ?? null;
}
