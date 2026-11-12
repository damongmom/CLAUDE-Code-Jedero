import { describe, expect, it } from 'vitest';
import { generateToken, hashToken, safeEqual } from '@/lib/auth';
import { clearCookie, parseCookies, readCookie, serializeCookie } from '@/lib/cookies';

describe('세션 토큰', () => {
  it('32바이트 이상 무작위 토큰을 만든다', () => {
    const a = generateToken();
    const b = generateToken();
    expect(Buffer.from(a, 'base64url').length).toBeGreaterThanOrEqual(32);
    expect(a).not.toBe(b);
  });

  it('같은 토큰은 같은 해시이고 해시는 원문과 다르다', () => {
    const token = generateToken();
    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).not.toBe(token);
    expect(hashToken(token)).toMatch(/^[a-f\d]{64}$/);
  });
});

describe('safeEqual (state 비교)', () => {
  it('같으면 true', () => expect(safeEqual('abc', 'abc')).toBe(true));
  it('다르면 false', () => expect(safeEqual('abc', 'abd')).toBe(false));
  it('누락이면 false', () => {
    expect(safeEqual(null, 'abc')).toBe(false);
    expect(safeEqual('abc', undefined)).toBe(false);
    expect(safeEqual('', '')).toBe(false);
  });
  it('길이가 달라도 예외 없이 false', () => expect(safeEqual('abc', 'abcd')).toBe(false));
});

describe('쿠키', () => {
  it('여러 쿠키 중 session을 읽는다', () => {
    const request = new Request('http://localhost/', { headers: { cookie: 'a=1; session=tok%3D; b=2' } });
    expect(readCookie(request, 'session')).toBe('tok=');
    expect(readCookie(new Request('http://localhost/'), 'session')).toBeNull();
  });

  it('잘못된 쿠키 조각은 무시한다', () => {
    expect(parseCookies('novalue; x=%E0%A4%A; ok=1')).toEqual({ ok: '1' });
  });

  it('httpOnly·SameSite=Lax 쿠키를 만들고 같은 path로 지운다', () => {
    expect(serializeCookie('session', 'v', { maxAge: 10 })).toBe('session=v; Path=/; Max-Age=10; HttpOnly; SameSite=Lax');
    expect(clearCookie('oauth_state', '/auth/github')).toBe('oauth_state=; Path=/auth/github; Max-Age=0; HttpOnly; SameSite=Lax');
  });
});
