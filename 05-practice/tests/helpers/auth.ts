import type { Types } from 'mongoose';
import { createSession } from '@/lib/auth';
import { SESSION_COOKIE } from '@/lib/cookies';
import { UserModel } from '@/models/User';

let githubIdSeq = 1000;

/** 테스트 사용자와 세션을 만들고 요청에 붙일 쿠키를 돌려준다. */
export async function loginAs(username = 'tester'): Promise<{ userId: Types.ObjectId; cookie: string; token: string }> {
  const user = await UserModel.create({ githubId: githubIdSeq++, username, avatarUrl: `https://avatars.example/${username}` });
  const token = await createSession(user._id);
  return { userId: user._id, cookie: `${SESSION_COOKIE}=${encodeURIComponent(token)}`, token };
}
