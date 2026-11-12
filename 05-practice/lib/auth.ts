import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Types } from 'mongoose';
import { UnauthorizedError } from '@/lib/api';
import { SESSION_COOKIE, readCookie, serializeCookie } from '@/lib/cookies';
import { SessionModel } from '@/models/Session';
import { UserModel } from '@/models/User';

const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

/** 32바이트 무작위 토큰 (base64url) */
export function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** 길이가 달라도 예외 없이 false를 돌려주는 timing-safe 비교 */
export function safeEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function sessionCookie(token: string): string {
  return serializeCookie(SESSION_COOKIE, token, { maxAge: SESSION_TTL_SECONDS });
}

export async function createSession(userId: Types.ObjectId): Promise<string> {
  const token = generateToken();
  await SessionModel.create({
    tokenHash: hashToken(token),
    userId,
    expiresAt: new Date(Date.now() + SESSION_TTL_SECONDS * 1000),
  });
  return token;
}

export async function deleteSession(token: string | null): Promise<void> {
  if (!token) return;
  await SessionModel.deleteOne({ tokenHash: hashToken(token) });
}

/** 데이터 API용: Session 1회 조회로 userId만 얻는다. 반드시 handle() 안(connectDB 뒤)에서 호출한다. */
export async function requireUserId(request: Request): Promise<Types.ObjectId> {
  const token = readCookie(request, SESSION_COOKIE);
  if (!token) throw new UnauthorizedError();
  const session = await SessionModel.findOne(
    { tokenHash: hashToken(token), expiresAt: { $gt: new Date() } },
    { userId: 1 },
  ).lean<{ userId: Types.ObjectId }>();
  if (!session) throw new UnauthorizedError();
  return session.userId;
}

/** /api/auth/me 전용 */
export async function getSessionUser(request: Request) {
  const userId = await requireUserId(request);
  const user = await UserModel.findById(userId, { username: 1, avatarUrl: 1 }).lean<{
    username: string;
    avatarUrl: string;
  }>();
  if (!user) throw new UnauthorizedError();
  return { username: user.username, avatarUrl: user.avatarUrl };
}
