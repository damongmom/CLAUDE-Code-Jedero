// 기존 데이터를 GitHub 사용자에게 귀속시키는 마이그레이션 CLI.
// 사용법: npm run migrate:user-id -- --username <GitHub 사용자명> [--apply]
// 기본은 dry-run(변경 없음). 실행 전 DB를 백업하세요. 자세한 순서는 docs/GITHUB_OAUTH.md.
import mongoose from 'mongoose';
import { formatReport, migrateAddUserId } from '@/lib/migrations/addUserId';
import { disconnectDB } from '@/lib/mongodb';

// 연결 시 자동 인덱스 생성을 끈다. 켜 두면 dry-run 중에도 인덱스가 만들어지고 보고 목록이 부정확해진다.
// 인덱스 변경은 --apply의 syncIndexes에서만 일어난다.
mongoose.set('autoIndex', false);

function parseArgs(argv: string[]): { username: string; apply: boolean } {
  let username = '';
  let apply = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--apply') apply = true;
    else if (arg === '--username') username = argv[++i] ?? '';
    else if (arg.startsWith('--username=')) username = arg.slice('--username='.length);
  }
  return { username, apply };
}

async function main() {
  try {
    const report = await migrateAddUserId(parseArgs(process.argv.slice(2)));
    console.log(formatReport(report));
    process.exitCode = report.aborted ? 2 : 0;
  } catch (error) {
    console.error(`[migrate] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  } finally {
    // mongoose 연결이 남으면 프로세스가 끝나지 않는다.
    await disconnectDB();
  }
}

void main();
