import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';
import { GoalModel } from '@/models/Goal';
import { TodoModel } from '@/models/Todo';
import { WeeklyPlanModel } from '@/models/WeeklyPlan';
import { useTestDB } from '../helpers/db';

useTestDB();

// 입력 주입: 모든 문서에 userId를 넣는다. 기대값은 로그인 기능 추가 전과 같다.
const userId = new Types.ObjectId();

describe('모델 검증', () => {
  it('WeeklyPlan은 주간 목표 6개를 거부한다', async () => {
    const goal = await GoalModel.create({ userId, title: '취업' });
    const goals = Array.from({ length: 6 }, (_, i) => ({ text: `목표 ${i}`, goalId: goal._id }));
    await expect(WeeklyPlanModel.create({ userId, weekStart: '2026-11-09', goals })).rejects.toThrow(/최대 5개/);
  });

  it('WeeklyPlan은 같은 사용자의 같은 weekStart를 중복 저장하지 않는다', async () => {
    await WeeklyPlanModel.create({ userId, weekStart: '2026-11-09' });
    await expect(WeeklyPlanModel.create({ userId, weekStart: '2026-11-09' })).rejects.toMatchObject({ code: 11000 });
  });

  it('다른 사용자는 같은 weekStart로 각자 계획을 만들 수 있다', async () => {
    await WeeklyPlanModel.create({ userId, weekStart: '2026-11-09' });
    await expect(WeeklyPlanModel.create({ userId: new Types.ObjectId(), weekStart: '2026-11-09' })).resolves.toBeTruthy();
  });

  it('주간 목표의 goalId는 null(미연결)을 허용한다', async () => {
    const plan = await WeeklyPlanModel.create({ userId, weekStart: '2026-11-09', goals: [{ text: '알고리즘' }] });
    expect(plan.goals[0].goalId).toBeNull();
  });

  it('Todo의 기본 상태는 todo이고 weeklyGoalId는 null을 허용한다', async () => {
    const todo = await TodoModel.create({ userId, title: '문제 풀기', order: 'a0' });
    expect(todo.status).toBe('todo');
    expect(todo.priority).toBe('medium');
    expect(todo.weeklyGoalId).toBeNull();
  });

  it('Todo는 정의되지 않은 상태 값을 거부한다', async () => {
    await expect(TodoModel.create({ userId, title: 'x', order: 'a0', status: 'archived' })).rejects.toThrow();
  });

  it('userId 없이는 Goal·WeeklyPlan·Todo를 만들 수 없다', async () => {
    await expect(GoalModel.create({ title: 'x' })).rejects.toThrow(/userId/);
    await expect(WeeklyPlanModel.create({ weekStart: '2026-11-09' })).rejects.toThrow(/userId/);
    await expect(TodoModel.create({ title: 'x', order: 'a0' })).rejects.toThrow(/userId/);
  });
});
