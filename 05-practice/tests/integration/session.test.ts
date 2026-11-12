import { describe, expect, it } from 'vitest';
import { handle, json } from '@/lib/api';
import { hashToken, requireUserId } from '@/lib/auth';
import { SessionModel } from '@/models/Session';
import { useTestDB } from '../helpers/db';
import { loginAs } from '../helpers/auth';

useTestDB();

const req = (cookie?: string) => new Request('http://localhost/api/x', { headers: cookie ? { cookie } : {} });

/** handle() 안에서 requireUserId를 호출하는 최소 라우트 */
const protectedRoute = (request: Request) =>
  handle(async () => json({ userId: String(await requireUserId(request)) }));

describe('requireUserId', () => {
  it('유효한 세션이면 userId를 돌려준다', async () => {
    const { userId, cookie } = await loginAs('alice');
    expect(String(await requireUserId(req(cookie)))).toBe(String(userId));
  });

  it('DB에는 토큰 원문이 아니라 해시만 저장된다', async () => {
    const { token } = await loginAs('alice');
    const session = await SessionModel.findOne().lean();
    expect(session?.tokenHash).toBe(hashToken(token));
    expect(JSON.stringify(session)).not.toContain(token);
  });

  it('쿠키 없음·위조·만료면 401과 session 쿠키 삭제 헤더', async () => {
    const { token } = await loginAs('alice');
    await SessionModel.updateOne({ tokenHash: hashToken(token) }, { expiresAt: new Date(Date.now() - 1000) });

    for (const cookie of [undefined, 'session=forged-token', `session=${token}`]) {
      const response = await protectedRoute(req(cookie));
      expect(response.status, String(cookie)).toBe(401);
      expect(await response.json()).toEqual({ error: '로그인이 필요합니다.' });
      expect(response.headers.get('set-cookie')).toBe('session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax');
    }
  });

  it('세션 문서를 지우면 같은 쿠키도 401', async () => {
    const { cookie } = await loginAs('alice');
    expect((await protectedRoute(req(cookie))).status).toBe(200);
    await SessionModel.deleteMany({});
    expect((await protectedRoute(req(cookie))).status).toBe(401);
  });
});
