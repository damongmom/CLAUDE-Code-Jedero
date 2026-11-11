import dns from 'node:dns';
import mongoose from 'mongoose';

const FALLBACK_DNS_SERVERS = ['8.8.8.8', '1.1.1.1'];
const DNS_FAILURE_CODES = new Set(['ECONNREFUSED', 'ETIMEOUT', 'ESERVFAIL', 'ECONNRESET']);

/**
 * Atlas의 mongodb+srv 주소는 연결 전에 DNS SRV 조회가 필요하다.
 * 일부 Windows 환경에서는 Node가 DNS 서버를 127.0.0.1처럼 동작하지 않는 주소로 잡아
 * `querySrv ECONNREFUSED`로 실패한다. 이때만 공개 DNS로 바꿔 다시 조회한다.
 * MONGODB_DNS_SERVERS(쉼표 구분)를 지정하면 그 서버를 사용한다.
 */
async function ensureSrvResolvable(uri: string): Promise<void> {
  if (!uri.startsWith('mongodb+srv://')) return;

  const custom = process.env.MONGODB_DNS_SERVERS?.split(',').map((s) => s.trim()).filter(Boolean);
  if (custom && custom.length > 0) {
    dns.setServers(custom);
    return;
  }

  let host: string;
  try {
    host = new URL(uri).hostname;
  } catch {
    return; // 형식 오류는 드라이버가 보고하게 둔다.
  }
  try {
    await dns.promises.resolveSrv(`_mongodb._tcp.${host}`);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (!code || !DNS_FAILURE_CODES.has(code)) return;
    console.warn(
      `[db] DNS SRV 조회 실패(${code}, 현재 DNS: ${dns.getServers().join(', ')}). 공개 DNS(${FALLBACK_DNS_SERVERS.join(', ')})로 다시 시도합니다.`,
    );
    dns.setServers(FALLBACK_DNS_SERVERS);
  }
}

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

// 개발 모드 HMR로 모듈이 다시 평가돼도 연결을 하나만 유지하도록 global에 캐시한다.
const globalForMongoose = globalThis as unknown as { _mongooseCache?: MongooseCache };
const cache: MongooseCache =
  globalForMongoose._mongooseCache ?? (globalForMongoose._mongooseCache = { conn: null, promise: null });

/** 환경 설정 문제(접속 주소 누락). 사용자가 직접 고쳐야 하므로 메시지를 그대로 보여 준다. */
export class DatabaseConfigError extends Error {
  readonly name = 'DatabaseConfigError';
}

export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;

  // import 시점이 아닌 연결 시점에 검사해야 `next build`가 환경 변수 없이도 통과한다.
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new DatabaseConfigError(
      'DB 접속 설정이 없습니다. .env.local 파일에 MONGODB_URI를 설정한 뒤 개발 서버를 다시 시작하세요. (MongoDB 없이 체험하려면 npm run dev:memory)',
    );
  }

  if (!cache.promise) {
    cache.promise = ensureSrvResolvable(uri).then(() =>
      mongoose.connect(uri, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 5000,
      }),
    );
  }

  try {
    cache.conn = await cache.promise;
  } catch (error) {
    cache.promise = null;
    throw error;
  }
  return cache.conn;
}

/** 테스트 정리용 */
export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  cache.conn = null;
  cache.promise = null;
}
