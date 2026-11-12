import { handle, json } from '@/lib/api';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** 로그인한 사용자 정보 { username, avatarUrl } 또는 401 */
export async function GET(request: Request) {
  return handle(async () => json(await getSessionUser(request)));
}
