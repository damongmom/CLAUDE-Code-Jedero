import type { Model, Types } from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { GoalModel } from '@/models/Goal';
import { TodoModel } from '@/models/Todo';
import { UserModel } from '@/models/User';
import { WeeklyPlanModel } from '@/models/WeeklyPlan';

// 로그인 기능 이전에 만든 문서(userId 없음)를 지정한 GitHub 사용자에게 귀속시키고 인덱스를 교체한다.
// 처리 순서는 충돌 가능성이 있는 WeeklyPlan을 먼저 둔다. 조건이 `userId $exists:false`라
// 중간에 실패해도 다시 실행하면 남은 문서만 처리된다(멱등).

class MigrationError extends Error {
  readonly name = 'MigrationError';
}

type Counts = { weeklyPlans: number; goals: number; todos: number };
type IndexPlan = { collection: string; toDrop: string[]; toCreate: string[] };

type MigrationReport = {
  username: string;
  userId: string;
  apply: boolean;
  pending: Counts;
  conflicts: string[];
  indexes: IndexPlan[];
  migrated: Counts;
  /** 쓰기 전에 중단한 이유. 있으면 아무것도 바꾸지 않았다. */
  aborted: string | null;
};

const LEGACY = { userId: { $exists: false } };

// 처리 순서: WeeklyPlan → Goal → Todo
const TARGETS: Array<{ key: keyof Counts; model: Model<any> }> = [
  { key: 'weeklyPlans', model: WeeklyPlanModel },
  { key: 'goals', model: GoalModel },
  { key: 'todos', model: TodoModel },
];

function describeIndex(spec: unknown): string {
  const fields = Array.isArray(spec) ? spec[0] : spec;
  return typeof fields === 'string' ? fields : JSON.stringify(fields);
}

/** syncIndexes가 실제로 삭제·생성할 인덱스 목록 (syncIndexes 내부도 diffIndexes를 쓴다) */
async function planIndexes(model: Model<any>): Promise<IndexPlan> {
  const collection = model.collection.collectionName;
  try {
    const diff = (await model.diffIndexes()) as { toDrop: unknown[]; toCreate: unknown[] };
    return { collection, toDrop: diff.toDrop.map(describeIndex), toCreate: diff.toCreate.map(describeIndex) };
  } catch {
    // 컬렉션이 아직 없으면 목록을 읽을 수 없다. 그 경우 syncIndexes가 스키마 인덱스를 새로 만든다.
    return { collection, toDrop: [], toCreate: ['(컬렉션 없음: 스키마 인덱스를 새로 생성)'] };
  }
}

export async function migrateAddUserId({ username, apply }: { username: string; apply: boolean }): Promise<MigrationReport> {
  if (!username) throw new MigrationError('--username <GitHub 사용자명>을 지정하세요.');
  await connectDB();

  const user = await UserModel.findOne({ username }, { _id: 1 }).lean<{ _id: Types.ObjectId }>();
  if (!user) {
    throw new MigrationError(`GitHub 사용자 '${username}'를 찾을 수 없습니다. 먼저 앱에 GitHub로 한 번 로그인하세요.`);
  }

  const pending: Counts = { weeklyPlans: 0, goals: 0, todos: 0 };
  for (const { key, model } of TARGETS) pending[key] = await model.countDocuments(LEGACY);

  // 대상 사용자가 이미 가진 주와 겹치는 기존 주간 계획이 있으면 { userId, weekStart } unique 충돌이 난다.
  const legacyWeeks: string[] = await WeeklyPlanModel.distinct('weekStart', LEGACY);
  const conflicts: string[] = legacyWeeks.length
    ? (await WeeklyPlanModel.distinct('weekStart', { userId: user._id, weekStart: { $in: legacyWeeks } })).sort()
    : [];

  const indexes: IndexPlan[] = [];
  for (const { model } of TARGETS) indexes.push(await planIndexes(model));

  const report: MigrationReport = {
    username,
    userId: String(user._id),
    apply,
    pending,
    conflicts,
    indexes,
    migrated: { weeklyPlans: 0, goals: 0, todos: 0 },
    aborted: null,
  };

  if (conflicts.length > 0) {
    report.aborted = `'${username}'에게 이미 같은 주의 주간 계획이 있습니다: ${conflicts.join(', ')}. 해당 계획을 정리한 뒤 다시 실행하세요.`;
    return report;
  }
  if (!apply) return report;

  for (const { key, model } of TARGETS) {
    const result = await model.updateMany(LEGACY, { $set: { userId: user._id } });
    report.migrated[key] = result.modifiedCount;
  }
  for (const { model } of TARGETS) await model.syncIndexes();
  return report;
}

export function formatReport(report: MigrationReport): string {
  const lines = [
    `대상 사용자: ${report.username} (${report.userId})`,
    `모드: ${report.apply ? 'apply (실제 변경)' : 'dry-run (변경 없음)'}`,
    `userId 없는 문서: 주간 계획 ${report.pending.weeklyPlans}, 1년 목표 ${report.pending.goals}, 할 일 ${report.pending.todos}`,
  ];
  for (const index of report.indexes) {
    lines.push(
      `인덱스 ${index.collection}: 삭제 [${index.toDrop.join(', ') || '없음'}] / 생성 [${index.toCreate.join(', ') || '없음'}]`,
    );
  }
  if (report.aborted) {
    lines.push(`중단: ${report.aborted}`, '변경된 문서는 없습니다.');
  } else if (report.apply) {
    lines.push(
      `변경: 주간 계획 ${report.migrated.weeklyPlans}, 1년 목표 ${report.migrated.goals}, 할 일 ${report.migrated.todos}`,
      '인덱스 동기화 완료.',
    );
  } else {
    lines.push('실제로 적용하려면 --apply를 붙여 다시 실행하세요.');
  }
  return lines.join('\n');
}
