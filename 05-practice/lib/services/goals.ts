import type { Types } from 'mongoose';
import { badRequest, notFound } from '@/lib/api';
import { calcProgress, countByStatus } from '@/lib/progress';
import { parseOptionalText, parseRequiredText } from '@/lib/validation';
import { GoalModel } from '@/models/Goal';
import { TodoModel } from '@/models/Todo';
import { WeeklyPlanModel } from '@/models/WeeklyPlan';
import type { LeanGoal, LeanTodo, LeanWeeklyPlan } from './types';

// 모든 함수의 첫 인자 userId는 세션에서 얻은 값이며, 모든 쿼리를 이 사용자 범위로 제한한다.

/** 목표 목록 + 연결된 주간 목표들의 할 일 기준 진행률 (PRD P1: 1년 목표 단위 집계) */
export async function listGoalsWithProgress(userId: Types.ObjectId) {
  const goals = await GoalModel.find({ userId }).sort({ createdAt: 1 }).lean<LeanGoal[]>();
  const goalIds = goals.map((goal) => goal._id);

  const plans = await WeeklyPlanModel.find({ userId, 'goals.goalId': { $in: goalIds } }, { goals: 1 }).lean<
    Pick<LeanWeeklyPlan, '_id' | 'goals'>[]
  >();
  const weeklyGoalToGoal = new Map<string, string>();
  const weeklyGoalIds: Types.ObjectId[] = [];
  for (const plan of plans) {
    for (const weeklyGoal of plan.goals) {
      if (!weeklyGoal.goalId) continue;
      weeklyGoalToGoal.set(String(weeklyGoal._id), String(weeklyGoal.goalId));
      weeklyGoalIds.push(weeklyGoal._id);
    }
  }

  const todos = await TodoModel.find({ userId, weeklyGoalId: { $in: weeklyGoalIds } }, { status: 1, weeklyGoalId: 1 }).lean<
    Pick<LeanTodo, 'status' | 'weeklyGoalId'>[]
  >();
  const todosByGoal = new Map<string, Pick<LeanTodo, 'status'>[]>();
  for (const todo of todos) {
    const goalId = weeklyGoalToGoal.get(String(todo.weeklyGoalId));
    if (!goalId) continue;
    const list = todosByGoal.get(goalId) ?? [];
    list.push(todo);
    todosByGoal.set(goalId, list);
  }

  return goals.map((goal) => {
    const list = todosByGoal.get(String(goal._id)) ?? [];
    return {
      ...goal,
      progress: calcProgress(list),
      todoCount: list.length,
      doneCount: countByStatus(list).done,
    };
  });
}

export async function getGoal(userId: Types.ObjectId, id: Types.ObjectId) {
  const goal = await GoalModel.findOne({ _id: id, userId }).lean<LeanGoal>();
  if (!goal) throw notFound('1년 목표를 찾을 수 없습니다.');
  return goal;
}

export async function createGoal(userId: Types.ObjectId, body: Record<string, unknown>) {
  const goal = await GoalModel.create({
    userId,
    title: parseRequiredText(body.title, '제목'),
    description: parseOptionalText(body.description, '설명'),
  });
  return goal.toObject();
}

export async function updateGoal(userId: Types.ObjectId, id: Types.ObjectId, body: Record<string, unknown>) {
  const update: Record<string, string> = {};
  if ('title' in body) update.title = parseRequiredText(body.title, '제목');
  if ('description' in body) update.description = parseOptionalText(body.description, '설명');
  if (Object.keys(update).length === 0) throw badRequest('수정할 항목이 없습니다.');

  const goal = await GoalModel.findOneAndUpdate({ _id: id, userId }, update, { new: true, runValidators: true }).lean<LeanGoal>();
  if (!goal) throw notFound('1년 목표를 찾을 수 없습니다.');
  return goal;
}

/** 삭제 규칙: 연결된 주간 목표는 지우지 않고 미연결(goalId=null)로 전환한다. */
export async function deleteGoal(userId: Types.ObjectId, id: Types.ObjectId) {
  const deleted = await GoalModel.findOneAndDelete({ _id: id, userId }).lean<LeanGoal>();
  if (!deleted) throw notFound('1년 목표를 찾을 수 없습니다.');

  const result = await WeeklyPlanModel.updateMany(
    { userId, 'goals.goalId': id },
    { $set: { 'goals.$[g].goalId': null } },
    { arrayFilters: [{ 'g.goalId': id }] },
  );
  return { ok: true, unlinkedPlans: result.modifiedCount };
}

export async function assertGoalsExist(userId: Types.ObjectId, ids: Types.ObjectId[]) {
  const unique = [...new Set(ids.map(String))];
  if (unique.length === 0) return;
  const count = await GoalModel.countDocuments({ _id: { $in: unique }, userId });
  if (count !== unique.length) throw badRequest('존재하지 않는 1년 목표입니다.');
}
