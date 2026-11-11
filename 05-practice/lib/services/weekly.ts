import { Types } from 'mongoose';
import { badRequest, conflict, notFound, parseId } from '@/lib/api';
import { parseOptionalText, parseRequiredText } from '@/lib/validation';
import { isValidWeekStart } from '@/lib/week';
import { GoalModel } from '@/models/Goal';
import { TodoModel } from '@/models/Todo';
import { WeeklyPlanModel } from '@/models/WeeklyPlan';
import { MAX_WEEKLY_GOALS } from '@/types';
import { assertGoalsExist } from './goals';
import type { LeanWeeklyGoal, LeanWeeklyPlan } from './types';

/**
 * 주간 목표 배열을 검증한다.
 * - 최대 5개 (PRD 4장)
 * - 새 주간 목표는 1년 목표 연결이 필수 (N:1 필수)
 * - 이미 미연결 상태인 기존 주간 목표만 goalId=null을 유지할 수 있다
 *   (삭제된 1년 목표를 가리키는 끊긴 참조도 미연결로 본다. 동시 요청 경합으로 생길 수 있다)
 */
async function parseWeeklyGoals(value: unknown, existing: LeanWeeklyGoal[] = []): Promise<LeanWeeklyGoal[]> {
  if (!Array.isArray(value)) throw badRequest('goals는 배열이어야 합니다.');
  if (value.length > MAX_WEEKLY_GOALS) {
    throw badRequest(`주간 목표는 최대 ${MAX_WEEKLY_GOALS}개까지 만들 수 있습니다.`);
  }

  const existingById = new Map(existing.map((goal) => [String(goal._id), goal]));
  const seen = new Set<string>();

  const rows = value.map((item) => {
    if (!item || typeof item !== 'object') throw badRequest('주간 목표 형식이 올바르지 않습니다.');
    const input = item as Record<string, unknown>;
    const text = parseRequiredText(input.text, '주간 목표');
    const current = typeof input._id === 'string' ? existingById.get(input._id) : undefined;
    if (current) {
      if (seen.has(String(current._id))) throw badRequest('같은 주간 목표가 중복되었습니다.');
      seen.add(String(current._id));
    }
    const empty = input.goalId === null || input.goalId === undefined || input.goalId === '';
    return { text, current, goalId: empty ? null : parseId(input.goalId, 'goalId') };
  });

  // 요청한 id와 기존 연결 id 중 실제로 존재하는 1년 목표를 한 번에 확인한다.
  const candidateIds = rows.flatMap((row) => [row.goalId, row.current?.goalId ?? null]).filter((id) => id !== null);
  const existingGoalIds = new Set(
    (await GoalModel.find({ _id: { $in: candidateIds } }, { _id: 1 }).lean<{ _id: Types.ObjectId }[]>()).map((g) => String(g._id)),
  );
  const isUnlinked = (goal: LeanWeeklyGoal) => goal.goalId === null || !existingGoalIds.has(String(goal.goalId));

  return rows.map(({ text, current, goalId }): LeanWeeklyGoal => {
    if (goalId === null) {
      if (!current || !isUnlinked(current)) throw badRequest('주간 목표는 1년 목표와 연결해야 합니다.');
      return { _id: current._id, text, goalId: null };
    }
    if (!existingGoalIds.has(String(goalId))) {
      // 끊긴 참조를 그대로 다시 보낸 경우는 미연결로 정리하고, 그 외에는 잘못된 요청이다.
      if (current && String(current.goalId) === String(goalId)) return { _id: current._id, text, goalId: null };
      throw badRequest('존재하지 않는 1년 목표입니다.');
    }
    return { _id: current?._id ?? new Types.ObjectId(), text, goalId };
  });
}

export async function listPlans(url: URL) {
  const weekStart = url.searchParams.get('weekStart');
  if (weekStart !== null) {
    if (!isValidWeekStart(weekStart)) throw badRequest('weekStart는 월요일 날짜(YYYY-MM-DD)여야 합니다.');
    return WeeklyPlanModel.find({ weekStart }).lean<LeanWeeklyPlan[]>();
  }
  const limitParam = url.searchParams.get('limit');
  const limit = limitParam === null ? 0 : Number(limitParam);
  if (!Number.isInteger(limit) || limit < 0 || limit > 100) throw badRequest('limit은 0~100 정수여야 합니다.');
  return WeeklyPlanModel.find().sort({ weekStart: -1 }).limit(limit).lean<LeanWeeklyPlan[]>();
}

export async function getPlan(id: Types.ObjectId) {
  const plan = await WeeklyPlanModel.findById(id).lean<LeanWeeklyPlan>();
  if (!plan) throw notFound('주간 계획을 찾을 수 없습니다.');
  return plan;
}

export async function createPlan(body: Record<string, unknown>) {
  if (!isValidWeekStart(body.weekStart)) {
    throw badRequest('weekStart는 월요일 날짜(YYYY-MM-DD)여야 합니다.');
  }
  const weekStart = body.weekStart;
  if (await WeeklyPlanModel.exists({ weekStart })) {
    throw conflict('이 주의 주간 계획이 이미 있습니다.');
  }
  const goals = body.goals === undefined ? [] : await parseWeeklyGoals(body.goals);
  const plan = await WeeklyPlanModel.create({
    weekStart,
    goals,
    memo: parseOptionalText(body.memo, '메모', 5000),
    retrospective: parseOptionalText(body.retrospective, '회고', 5000),
  });
  return plan.toObject();
}

/** 삭제 규칙: 목록에서 빠진 주간 목표의 할 일은 미연결(weeklyGoalId=null)로 전환한다. */
export async function updatePlan(id: Types.ObjectId, body: Record<string, unknown>) {
  const plan = await WeeklyPlanModel.findById(id);
  if (!plan) throw notFound('주간 계획을 찾을 수 없습니다.');

  let removedGoalIds: Types.ObjectId[] = [];
  if ('goals' in body) {
    const existing = plan.toObject().goals as LeanWeeklyGoal[];
    const goals = await parseWeeklyGoals(body.goals, existing);
    const keep = new Set(goals.map((goal) => String(goal._id)));
    removedGoalIds = existing.filter((goal) => !keep.has(String(goal._id))).map((goal) => goal._id);
    plan.set('goals', goals);
  }
  if ('memo' in body) plan.memo = parseOptionalText(body.memo, '메모', 5000);
  if ('retrospective' in body) plan.retrospective = parseOptionalText(body.retrospective, '회고', 5000);

  await plan.save();
  if (removedGoalIds.length > 0) {
    await TodoModel.updateMany({ weeklyGoalId: { $in: removedGoalIds } }, { $set: { weeklyGoalId: null } });
  }
  return plan.toObject();
}

/** 주간 계획 자체를 지우면 그 주의 할 일은 남기고 연결만 끊는다. */
export async function deletePlan(id: Types.ObjectId) {
  const deleted = await WeeklyPlanModel.findByIdAndDelete(id).lean<LeanWeeklyPlan>();
  if (!deleted) throw notFound('주간 계획을 찾을 수 없습니다.');
  const result = await TodoModel.updateMany(
    { weeklyPlanId: id },
    { $set: { weeklyPlanId: null, weeklyGoalId: null } },
  );
  return { ok: true, unlinkedTodos: result.modifiedCount };
}

/** 미연결 주간 목표를 1년 목표에 다시 연결한다. */
export async function linkWeeklyGoal(weeklyGoalId: Types.ObjectId, goalId: Types.ObjectId) {
  await assertGoalsExist([goalId]);
  const plan = await WeeklyPlanModel.findOneAndUpdate(
    { 'goals._id': weeklyGoalId },
    { $set: { 'goals.$.goalId': goalId } },
    { new: true },
  ).lean<LeanWeeklyPlan>();
  if (!plan) throw notFound('주간 목표를 찾을 수 없습니다.');
  return plan;
}

/** 주간 목표 id로 소속 주간 계획 id를 찾는다. */
export async function findPlanIdByWeeklyGoal(weeklyGoalId: Types.ObjectId): Promise<Types.ObjectId> {
  const plan = await WeeklyPlanModel.findOne({ 'goals._id': weeklyGoalId }, { _id: 1 }).lean<{ _id: Types.ObjectId }>();
  if (!plan) throw badRequest('존재하지 않는 주간 목표입니다.');
  return plan._id;
}
