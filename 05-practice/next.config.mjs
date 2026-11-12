import { PHASE_DEVELOPMENT_SERVER } from 'next/constants.js';

/** @param {string} phase */
function resolveDistDir(phase) {
  // NEXT_DIST_DIR로 덮어쓸 수 있다(예: E2E용 dev 서버를 평소 dev 서버와 동시에 띄울 때 .next-e2e).
  if (process.env.NEXT_DIST_DIR) return process.env.NEXT_DIST_DIR;
  // Vercel 같은 배포 환경은 dev 서버와 충돌할 일이 없고 기본 출력 폴더(.next)를 기대하므로 그대로 둔다.
  if (process.env.VERCEL || phase === PHASE_DEVELOPMENT_SERVER) return '.next';
  return '.next-build';
}

/**
 * 개발 서버(next dev)와 프로덕션 빌드(next build/start)의 출력 폴더를 분리한다.
 * 같은 .next를 함께 쓰면 dev 서버가 켜진 채 빌드할 때 "Cannot find module for page" 같은
 * 간헐적 빌드 실패와 dev 서버 화면 깨짐이 생긴다.
 *
 * @param {string} phase
 * @returns {import('next').NextConfig}
 */
export default function nextConfig(phase) {
  return {
    distDir: resolveDistDir(phase),
    experimental: {
      serverComponentsExternalPackages: ['mongoose'],
    },
  };
}
