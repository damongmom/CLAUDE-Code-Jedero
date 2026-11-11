import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as goals from '@/app/api/goals/route';
import { disconnectDB } from '@/lib/mongodb';
import { call } from '../helpers/http';

// DB 설정·연결 문제는 공통 500 대신 원인이 담긴 503으로 응답해야 한다.
describe('DB 설정·연결 오류 응답', () => {
  const original = process.env.MONGODB_URI;

  beforeEach(async () => {
    await disconnectDB();
  });

  afterEach(async () => {
    await disconnectDB();
    if (original === undefined) delete process.env.MONGODB_URI;
    else process.env.MONGODB_URI = original;
  });

  it('MONGODB_URI가 없으면 설정 방법을 알려 주는 503', async () => {
    delete process.env.MONGODB_URI;
    const res = await call(goals.GET);
    expect(res.status).toBe(503);
    expect(res.body.error).toContain('.env.local');
    expect(res.body.error).toContain('MONGODB_URI');
  });

  it('MongoDB에 연결할 수 없으면 연결 확인을 안내하는 503', async () => {
    process.env.MONGODB_URI = 'mongodb://127.0.0.1:1/unreachable';
    const res = await call(goals.GET);
    expect(res.status).toBe(503);
    expect(res.body.error).toContain('MongoDB에 연결할 수 없습니다');
  }, 20000);

  it('주소 형식이 잘못되면 503', async () => {
    process.env.MONGODB_URI = 'not-a-mongo-uri';
    const res = await call(goals.GET);
    expect(res.status).toBe(503);
  });
});
