import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as me from '@/app/api/auth/me/route';
import * as callback from '@/app/auth/github/callback/route';
import * as start from '@/app/auth/github/route';
import * as logout from '@/app/auth/logout/route';
import { hashToken } from '@/lib/auth';
import { SessionModel } from '@/models/Session';
import { UserModel } from '@/models/User';
import { useTestDB } from '../helpers/db';
import { call } from '../helpers/http';

useTestDB();

const SECRET = 'test-client-secret-must-not-leak';
const ACCESS_TOKEN = 'gho_test_access_token_must_not_leak';
const CODE = 'test-oauth-code-must-not-leak';
const ENV_KEYS = ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET', 'APP_BASE_URL'] as const;
const savedEnv: Partial<Record<(typeof ENV_KEYS)[number], string>> = {};

type GithubMock = { token?: 'ok' | 'fail'; user?: 'ok' | 'fail'; login?: string; avatar?: string; id?: number };

function mockGithub({ token = 'ok', user = 'ok', login = 'octocat', avatar = 'https://avatars.example/octo', id = 42 }: GithubMock = {}) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url === 'https://github.com/login/oauth/access_token') {
      const body = JSON.parse(String(init?.body));
      expect(body).toMatchObject({ client_id: 'test-client-id', client_secret: SECRET, code: CODE });
      return token === 'ok'
        ? Response.json({ access_token: ACCESS_TOKEN, token_type: 'bearer' })
        : Response.json({ error: 'bad_verification_code' });
    }
    if (url === 'https://api.github.com/user') {
      expect(new Headers(init?.headers).get('authorization')).toBe(`Bearer ${ACCESS_TOKEN}`);
      return user === 'ok' ? Response.json({ id, login, avatar_url: avatar }) : new Response('nope', { status: 401 });
    }
    throw new Error(`unexpected fetch ${url}`);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

/** /auth/github로 state를 받아 콜백 요청에 쓸 쿠키·쿼리를 만든다. */
async function beginLogin() {
  const res = await call(start.GET, { path: '/auth/github' });
  const state = new URL(res.headers.get('location')!).searchParams.get('state')!;
  return { state, stateCookie: `oauth_state=${encodeURIComponent(state)}` };
}

const setCookies = (headers: Headers) => headers.getSetCookie();
const sessionTokenFrom = (headers: Headers) =>
  decodeURIComponent(setCookies(headers).find((c) => c.startsWith('session=') && !c.includes('Max-Age=0'))!.split(';')[0].slice(8));

let logs: string[] = [];

beforeEach(() => {
  for (const key of ENV_KEYS) savedEnv[key] = process.env[key];
  process.env.GITHUB_CLIENT_ID = 'test-client-id';
  process.env.GITHUB_CLIENT_SECRET = SECRET;
  process.env.APP_BASE_URL = 'http://localhost';
  logs = [];
  for (const method of ['log', 'info', 'warn', 'error'] as const) {
    vi.spyOn(console, method).mockImplementation((...args: unknown[]) => {
      logs.push(args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' '));
    });
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('GET /auth/github', () => {
  it('GitHub 인증 화면으로 302하고 state 쿠키를 /auth/github 경로로 설정한다', async () => {
    const res = await call(start.GET, { path: '/auth/github' });
    expect(res.status).toBe(302);
    const location = new URL(res.headers.get('location')!);
    expect(location.origin + location.pathname).toBe('https://github.com/login/oauth/authorize');
    expect(location.searchParams.get('client_id')).toBe('test-client-id');
    expect(location.searchParams.get('redirect_uri')).toBe('http://localhost/auth/github/callback');
    const state = location.searchParams.get('state')!;
    expect(state.length).toBeGreaterThanOrEqual(43);
    const cookie = setCookies(res.headers).find((c) => c.startsWith('oauth_state='))!;
    expect(cookie).toContain(`oauth_state=${encodeURIComponent(state)}`);
    expect(cookie).toContain('Path=/auth/github');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
  });

  it('요청마다 state가 다르다 (정적 캐시 아님)', async () => {
    const a = await beginLogin();
    const b = await beginLogin();
    expect(a.state).not.toBe(b.state);
  });

  it('설정이 없으면 503과 안내 메시지', async () => {
    delete process.env.GITHUB_CLIENT_SECRET;
    const res = await call(start.GET, { path: '/auth/github' });
    expect(res.status).toBe(503);
    expect(res.body.error).toContain('GITHUB_CLIENT_SECRET');
  });

  it('접속 호스트가 APP_BASE_URL과 다르면 APP_BASE_URL로 먼저 맞춘다', async () => {
    process.env.APP_BASE_URL = 'http://localhost:3000';
    const res = await call(start.GET, { path: '/auth/github' });
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('http://localhost:3000/auth/github');
    expect(setCookies(res.headers)).toHaveLength(0);
  });
});

describe('GET /auth/github/callback', () => {
  it('성공하면 사용자를 저장하고 세션을 발급한 뒤 /로 302', async () => {
    mockGithub();
    const { state, stateCookie } = await beginLogin();
    const res = await call(callback.GET, { path: `/auth/github/callback?code=${CODE}&state=${state}`, cookie: stateCookie });

    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('http://localhost/');
    const user = await UserModel.findOne({ githubId: 42 }).lean();
    expect(user).toMatchObject({ username: 'octocat', avatarUrl: 'https://avatars.example/octo' });

    const cookies = setCookies(res.headers);
    const session = cookies.find((c) => c.startsWith('session='))!;
    expect(session).toContain('HttpOnly');
    expect(session).toContain('SameSite=Lax');
    expect(cookies).toContain('oauth_state=; Path=/auth/github; Max-Age=0; HttpOnly; SameSite=Lax');
    const token = sessionTokenFrom(res.headers);
    expect(await SessionModel.countDocuments({ tokenHash: hashToken(token), userId: user!._id })).toBe(1);
  });

  it('재로그인하면 username·avatarUrl을 갱신하고 이전 세션을 삭제한다', async () => {
    mockGithub();
    let login = await beginLogin();
    const first = await call(callback.GET, { path: `/auth/github/callback?code=${CODE}&state=${login.state}`, cookie: login.stateCookie });
    const oldToken = sessionTokenFrom(first.headers);

    mockGithub({ login: 'octo-renamed', avatar: 'https://avatars.example/new' });
    login = await beginLogin();
    const second = await call(callback.GET, {
      path: `/auth/github/callback?code=${CODE}&state=${login.state}`,
      cookie: `${login.stateCookie}; session=${encodeURIComponent(oldToken)}`,
    });

    expect(second.status).toBe(302);
    expect(await UserModel.countDocuments()).toBe(1);
    expect(await UserModel.findOne({ githubId: 42 }).lean()).toMatchObject({ username: 'octo-renamed', avatarUrl: 'https://avatars.example/new' });
    expect(await SessionModel.countDocuments({ tokenHash: hashToken(oldToken) })).toBe(0);
    expect(await SessionModel.countDocuments()).toBe(1);
  });

  const failures: Array<[string, (s: { state: string; stateCookie: string }) => { path: string; cookie?: string }, GithubMock, string]> = [
    ['사용자가 거부(access_denied)', (s) => ({ path: `/auth/github/callback?error=access_denied&state=${s.state}`, cookie: s.stateCookie }), {}, 'denied'],
    ['state 쿠키 없음', (s) => ({ path: `/auth/github/callback?code=${CODE}&state=${s.state}` }), {}, 'state'],
    ['state 불일치', (s) => ({ path: `/auth/github/callback?code=${CODE}&state=forged`, cookie: s.stateCookie }), {}, 'state'],
    ['토큰 교환 실패', (s) => ({ path: `/auth/github/callback?code=${CODE}&state=${s.state}`, cookie: s.stateCookie }), { token: 'fail' }, 'token'],
    ['사용자 조회 실패', (s) => ({ path: `/auth/github/callback?code=${CODE}&state=${s.state}`, cookie: s.stateCookie }), { user: 'fail' }, 'user'],
  ];

  for (const [name, build, mock, code] of failures) {
    it(`${name} → /login?error=${code}, 세션·사용자 미생성`, async () => {
      mockGithub(mock);
      const s = await beginLogin();
      const res = await call(callback.GET, build(s));
      expect(res.status).toBe(302);
      expect(res.headers.get('location')).toBe(`http://localhost/login?error=${code}`);
      expect(setCookies(res.headers).some((c) => c.startsWith('session=') && !c.includes('Max-Age=0'))).toBe(false);
      expect(await SessionModel.countDocuments()).toBe(0);
      expect(await UserModel.countDocuments()).toBe(0);
    });
  }

  it('로그인 흐름의 로그에 secret·access token·code가 남지 않는다', async () => {
    mockGithub();
    const ok = await beginLogin();
    await call(callback.GET, { path: `/auth/github/callback?code=${CODE}&state=${ok.state}`, cookie: ok.stateCookie });
    mockGithub({ token: 'fail' });
    const bad = await beginLogin();
    await call(callback.GET, { path: `/auth/github/callback?code=${CODE}&state=${bad.state}`, cookie: bad.stateCookie });

    const all = logs.join('\n');
    expect(all).toContain('[auth] login success');
    expect(all).toContain('[auth] login failed');
    for (const secret of [SECRET, ACCESS_TOKEN, CODE]) expect(all).not.toContain(secret);
  });
});

describe('로그아웃과 /api/auth/me', () => {
  async function loginViaOAuth() {
    mockGithub();
    const s = await beginLogin();
    const res = await call(callback.GET, { path: `/auth/github/callback?code=${CODE}&state=${s.state}`, cookie: s.stateCookie });
    return `session=${encodeURIComponent(sessionTokenFrom(res.headers))}`;
  }

  it('로그인하면 me가 username·avatarUrl을 돌려준다', async () => {
    const cookie = await loginViaOAuth();
    const res = await call(me.GET, { path: '/api/auth/me', cookie });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ username: 'octocat', avatarUrl: 'https://avatars.example/octo' });
  });

  it('세션 없이 me는 401', async () => {
    expect((await call(me.GET, { path: '/api/auth/me' })).status).toBe(401);
  });

  it('로그아웃은 세션 문서를 삭제하고 쿠키를 만료시켜 /login으로 303, 같은 쿠키는 401', async () => {
    const cookie = await loginViaOAuth();
    expect(await SessionModel.countDocuments()).toBe(1);

    const res = await call(logout.POST, { path: '/auth/logout', method: 'POST', cookie });
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('http://localhost/login');
    expect(setCookies(res.headers)).toContain('session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax');
    expect(await SessionModel.countDocuments()).toBe(0);
    expect((await call(me.GET, { path: '/api/auth/me', cookie })).status).toBe(401);
  });
});
