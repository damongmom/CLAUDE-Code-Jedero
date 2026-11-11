import { describe, expect, it } from 'vitest';
import { GoalModel } from '@/models/Goal';
import { TodoModel } from '@/models/Todo';
import { WeeklyPlanModel } from '@/models/WeeklyPlan';
import { useTestDB } from '../helpers/db';

useTestDB();

describe('모델 검증', () => {
  it('WeeklyPlan은 주간 목표 6개를 거부한다', async () => {
    const goal = await GoalModel.create({ title: '취업' });
    const goals = Array.from({ length: 6 }, (_, i) => ({ text: `목표 ${i}`, goalId: goal._id }));
    await expect(WeeklyPlanModel.create({ weekStart: '2026-11-09', goals })).rejects.toThrow(/최대 5개/);
  });

  it('WeeklyPlan은 같은 weekStart를 중복 저장하지 않는다', async () => {
    await WeeklyPlanModel.create({ weekStart: '2026-11-09' });
    await expect(WeeklyPlanModel.create({ weekStart: '2026-11-09' })).rejects.toMatchObject({ code: 11000 });
  });

  it('주간 목표의 goalId는 null(미연결)을 허용한다', async () => {
    const plan = await WeeklyPlanModel.create({ weekStart: '2026-11-09', goals: [{ text: '알고리즘' }] });
    expect(plan.goals[0].goalId).toBeNull();
  });

  it('Todo의 기본 상태는 todo이고 weeklyGoalId는 null을 허용한다', async () => {
    const todo = await TodoModel.create({ title: '문제 풀기', order: 'a0' });
    expect(todo.status).toBe('todo');
    expect(todo.priority).toBe('medium');
    expect(todo.weeklyGoalId).toBeNull();
  });

  it('Todo는 정의되지 않은 상태 값을 거부한다', async () => {
    await expect(TodoModel.create({ title: 'x', order: 'a0', status: 'archived' })).rejects.toThrow();
  });
});
