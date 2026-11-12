import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';
import { formatReport, migrateAddUserId } from '@/lib/migrations/addUserId';
import { GoalModel } from '@/models/Goal';
import { TodoModel } from '@/models/Todo';
import { UserModel } from '@/models/User';
import { WeeklyPlanModel } from '@/models/WeeklyPlan';
import { useTestDB } from '../helpers/db';

useTestDB();

/** 로그인 기능 이전 데이터: userId 없이 컬렉션에 직접 넣는다(required 검증 우회). */
async function seedLegacy(weeks = ['2026-11-02', '2026-11-09']) {
  const goalId = new Types.ObjectId();
  await GoalModel.collection.insertOne({ _id: goalId, title: '레거시 목표', description: '' });
  const plans = weeks.map((weekStart) => ({
    _id: new Types.ObjectId(),
    weekStart,
    goals: [{ _id: new Types.ObjectId(), text: '레거시 주간', goalId }],
    memo: '',
    retrospective: '',
  }));
  await WeeklyPlanModel.collection.insertMany(plans);
  await TodoModel.collection.insertMany(
    plans.map((plan, i) => ({ title: `레거시 할 일 ${i}`, status: 'todo', priority: 'medium', order: `a${i}`, weeklyPlanId: plan._id, weeklyGoalId: plan.goals[0]._id })),
  );
}

const indexNames = async () => (await WeeklyPlanModel.collection.indexes()).map((index) => index.name);

describe('migrateAddUserId', () => {
  it('사용자가 없으면 먼저 로그인하라는 오류', async () => {
    await expect(migrateAddUserId({ username: 'nobody', apply: false })).rejects.toThrow(/먼저 앱에 GitHub로 한 번 로그인/);
  });

  it('dry-run은 대상 수와 인덱스 계획을 보고하고 아무것도 바꾸지 않는다', async () => {
    await UserModel.create({ githubId: 1, username: 'octocat' });
    await seedLegacy();
    await WeeklyPlanModel.collection.createIndex({ weekStart: 1 }, { unique: true, name: 'weekStart_1' });

    const report = await migrateAddUserId({ username: 'octocat', apply: false });
    expect(report.pending).toEqual({ weeklyPlans: 2, goals: 1, todos: 2 });
    expect(report.migrated).toEqual({ weeklyPlans: 0, goals: 0, todos: 0 });
    expect(report.aborted).toBeNull();
    expect(report.indexes.find((i) => i.collection === 'weeklyplans')?.toDrop).toContain('weekStart_1');
    expect(await WeeklyPlanModel.countDocuments({ userId: { $exists: false } })).toBe(2);
    expect(await indexNames()).toContain('weekStart_1');
    expect(formatReport(report)).toContain('dry-run');
  });

  it('apply는 모든 레거시 문서를 대상 사용자로 옮기고 옛 인덱스를 새 복합 인덱스로 교체한다', async () => {
    const user = await UserModel.create({ githubId: 1, username: 'octocat' });
    await seedLegacy();
    await WeeklyPlanModel.collection.createIndex({ weekStart: 1 }, { unique: true, name: 'weekStart_1' });

    const report = await migrateAddUserId({ username: 'octocat', apply: true });
    expect(report.migrated).toEqual({ weeklyPlans: 2, goals: 1, todos: 2 });
    for (const model of [WeeklyPlanModel, GoalModel, TodoModel] as const) {
      expect(await (model as typeof GoalModel).countDocuments({ userId: { $exists: false } })).toBe(0);
      expect(await (model as typeof GoalModel).countDocuments({ userId: user._id })).toBeGreaterThan(0);
    }
    const names = await indexNames();
    expect(names).not.toContain('weekStart_1');
    expect(names).toContain('userId_1_weekStart_1');

    // 옛 인덱스가 사라졌으므로 다른 사용자도 같은 주 계획을 만들 수 있다
    await expect(WeeklyPlanModel.create({ userId: new Types.ObjectId(), weekStart: '2026-11-09' })).resolves.toBeTruthy();
  });

  it('다시 실행해도 변경 0건 (멱등)', async () => {
    await UserModel.create({ githubId: 1, username: 'octocat' });
    await seedLegacy();
    await migrateAddUserId({ username: 'octocat', apply: true });
    const again = await migrateAddUserId({ username: 'octocat', apply: true });
    expect(again.pending).toEqual({ weeklyPlans: 0, goals: 0, todos: 0 });
    expect(again.migrated).toEqual({ weeklyPlans: 0, goals: 0, todos: 0 });
    expect(again.aborted).toBeNull();
  });

  it('대상 사용자가 같은 주 계획을 이미 가지면 충돌을 보고하고 apply여도 아무것도 바꾸지 않는다', async () => {
    const user = await UserModel.create({ githubId: 1, username: 'octocat' });
    // 옛 인덱스가 없는 상태에서 준비해야 같은 주 문서를 함께 넣을 수 있다
    await seedLegacy(['2026-11-02', '2026-11-09']);
    await WeeklyPlanModel.create({ userId: user._id, weekStart: '2026-11-09' });

    const report = await migrateAddUserId({ username: 'octocat', apply: true });
    expect(report.conflicts).toEqual(['2026-11-09']);
    expect(report.aborted).toContain('2026-11-09');
    expect(report.migrated).toEqual({ weeklyPlans: 0, goals: 0, todos: 0 });
    expect(await WeeklyPlanModel.countDocuments({ userId: { $exists: false } })).toBe(2);
    expect(await GoalModel.countDocuments({ userId: { $exists: false } })).toBe(1);
    expect(await TodoModel.countDocuments({ userId: { $exists: false } })).toBe(2);
    expect(formatReport(report)).toContain('변경된 문서는 없습니다');
  });
});
