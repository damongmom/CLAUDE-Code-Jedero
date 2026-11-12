import { PHASE_DEVELOPMENT_SERVER } from 'next/constants.js';

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
    // NEXT_DIST_DIR로 덮어쓸 수 있다(예: E2E용 dev 서버를 평소 dev 서버와 동시에 띄울 때 .next-e2e).
    distDir: process.env.NEXT_DIST_DIR || (phase === PHASE_DEVELOPMENT_SERVER ? '.next' : '.next-build'),
    experimental: {
      serverComponentsExternalPackages: ['mongoose'],
    },
  };
}
