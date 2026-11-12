import mongoose, { Types } from 'mongoose';
import { SESSION_COOKIE, clearCookie } from '@/lib/cookies';
import { connectDB, DatabaseConfigError } from '@/lib/mongodb';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** 세션 없음·위조·만료. lib/auth.ts와의 순환 import를 피하려고 여기에 정의한다. */
export class UnauthorizedError extends ApiError {
  constructor(message = '로그인이 필요합니다.') {
    super(401, message);
  }
}

export const badRequest = (message: string) => new ApiError(400, message);
export const notFound = (message = '대상을 찾을 수 없습니다.') => new ApiError(404, message);
export const conflict = (message: string) => new ApiError(409, message);

const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

/** 24자리 hex만 허용한다. (Types.ObjectId.isValid는 임의의 12자 문자열도 통과시킨다) */
export function parseId(value: unknown, field = 'id'): Types.ObjectId {
  if (typeof value !== 'string' || !OBJECT_ID_RE.test(value)) {
    throw badRequest(`${field} 형식이 올바르지 않습니다.`);
  }
  return new Types.ObjectId(value);
}

export async function readBody(request: Request): Promise<Record<string, unknown>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw badRequest('요청 본문이 올바른 JSON이 아닙니다.');
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw badRequest('요청 본문은 객체여야 합니다.');
  }
  return body as Record<string, unknown>;
}

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}

const CONNECTION_ERROR_NAMES = new Set([
  'MongooseServerSelectionError',
  'MongoServerSelectionError',
  'MongoNetworkError',
  'MongoNetworkTimeoutError',
  'MongoParseError',
  'MongoAPIError',
]);

const NETWORK_ERROR_CODES = new Set(['ECONNREFUSED', 'ENOTFOUND', 'ETIMEOUT', 'ETIMEDOUT', 'ESERVFAIL', 'ECONNRESET']);

function isConnectionError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  // mongodb+srv의 DNS 조회 실패는 이름이 그냥 'Error'이고 code/syscall로만 구분된다.
  const { code, syscall } = error as NodeJS.ErrnoException;
  return CONNECTION_ERROR_NAMES.has(error.name) || syscall === 'querySrv' || (code !== undefined && NETWORK_ERROR_CODES.has(code));
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000;
}

/** DB 연결 → 핸들러 실행 → 오류를 HTTP 상태 코드로 변환 */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    await connectDB();
    return await fn();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      // 무효 쿠키가 남아 middleware는 통과하고 API만 401이 나는 리다이렉트 루프를 막는다.
      const response = json({ error: error.message }, 401);
      response.headers.append('Set-Cookie', clearCookie(SESSION_COOKIE));
      return response;
    }
    if (error instanceof ApiError) {
      return json({ error: error.message }, error.status);
    }
    if (error instanceof mongoose.Error.ValidationError) {
      const message = Object.values(error.errors)[0]?.message ?? '입력값이 올바르지 않습니다.';
      return json({ error: message }, 400);
    }
    if (error instanceof mongoose.Error.CastError) {
      return json({ error: `${error.path} 값이 올바르지 않습니다.` }, 400);
    }
    if (isDuplicateKeyError(error)) {
      return json({ error: '이미 존재하는 항목입니다.' }, 409);
    }
    // DB 설정·연결 문제는 사용자가 조치할 수 있도록 원인을 알려 준다.
    if (error instanceof DatabaseConfigError) {
      console.error('[api]', error.message);
      return json({ error: error.message }, 503);
    }
    if (isConnectionError(error)) {
      console.error('[api] MongoDB connection failed', error);
      return json(
        { error: 'MongoDB에 연결할 수 없습니다. .env.local의 MONGODB_URI 주소와 MongoDB 실행 상태(Atlas는 IP 허용 목록)를 확인하세요.' },
        503,
      );
    }
    console.error('[api] unexpected error', error);
    return json({ error: '서버 오류가 발생했습니다.' }, 500);
  }
}

export type RouteContext<P extends string = 'id'> = { params: Record<P, string> };
