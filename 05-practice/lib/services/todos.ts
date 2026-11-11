import type { Types } from 'mongoose';
import { badRequest, notFound, parseId } from '@/lib/api';
import { generateKeyBetween } from '@/lib/fractionalIndex';
import {
  parseDayOfWeek,
  parseDueDate,
  parseOptionalText,
  parseOrder,
  parsePriority,
  parseRequiredText,
  parseStatus,
} from '@/lib/validation';
import { GoalModel } from '@/models/Goal';
import { TodoModel } from '@/models/Todo';
import { WeeklyPlanModel } from '@/models/WeeklyPlan';
import type { TodoStatus } from '@/types';
import type { LeanTodo, LeanWeeklyPlan } from './types';
import { findPlanIdByWeeklyGoal } from './weekly';

/** 컬럼 맨 끝 키. 상태별 전역 최댓값 뒤에 붙여 키가 겹치지 않게 한다. */
async function nextOrder(status: TodoStatus): Promise<string> {
  const last = await TodoModel.findOne({ status }, { order: 1 }).sort({ order: -1 }).lean<Pick<LeanTodo, 'order'>>();
  return generateKeyBetween(last?.order ?? null, null);
}

function parseWeeklyGoalLink(value: unknown): Types.ObjectId {
  if (value === undefined || value === null || value === '') {
    throw badRequest('할 일은 주간 목표와 연결해야 합니다.');
  }
  return parseId(value, 'weeklyGoalId');
}

export async function listTodos(url: URL) {
  const params = url.searchParams;
  const filter: Record<string, unknown> = {};
  if (params.has('weeklyPlanId')) filter.weeklyPlanId = parseId(params.get('weeklyPlanId'), 'weeklyPlanId');
  if (params.has('weeklyGoalId')) filter.weeklyGoalId = parseId(params.get('weeklyGoalId'), 'weeklyGoalId');
  if (params.has('status')) filter.status = parseStatus(params.get('status'));
  if (params.get('unlinked') === 'true') filter.weeklyGoalId = null;
  return TodoModel.find(filter).sort({ order: 1 }).lean<LeanTodo[]>();
}

export async function getTodo(id: Types.ObjectId) {
  const todo = await TodoModel.findById(id).lean<LeanTodo>();
  if (!todo) throw notFound('할 일을 찾을 수 없습니다.');
  return todo;
}

export async function createTodo(body: Record<string, unknown>) {
  const title = parseRequiredText(body.title, '제목');
  const weeklyGoalId = parseWeeklyGoalLink(body.weeklyGoalId);
  const weeklyPlanId = await findPlanIdByWeeklyGoal(weeklyGoalId);
  // PRD 4장: 생성 시 기본값 todo
  const status = body.status === undefined ? 'todo' : parseStatus(body.status);

  const todo = await TodoModel.create({
    title,
    description: parseOptionalText(body.description, '설명'),
    status,
    priority: body.priority === undefined ? 'medium' : parsePriority(body.priority),
    dueDate: body.dueDate === undefined ? null : parseDueDate(body.dueDate),
    dayOfWeek: body.dayOfWeek === undefined ? null : parseDayOfWeek(body.dayOfWeek),
    order: await nextOrder(status),
    weeklyPlanId,
    weeklyGoalId,
  });
  return todo.toObject();
}

/** 부분 수정. 상태와 순서는 한 번의 요청으로 함께 바꿀 수 있다 (드래그앤드랍 PATCH 1회). */
export async function updateTodo(id: Types.ObjectId, body: Record<string, unknown>) {
  const todo = await TodoModel.findById(id);
  if (!todo) throw notFound('할 일을 찾을 수 없습니다.');

  if ('title' in body) todo.title = parseRequiredText(body.title, '제목');
  if ('description' in body) todo.description = parseOptionalText(body.description, '설명');
  if ('priority' in body) todo.priority = parsePriority(body.priority);
  if ('dueDate' in body) todo.dueDate = parseDueDate(body.dueDate);
  if ('dayOfWeek' in body) todo.dayOfWeek = parseDayOfWeek(body.dayOfWeek);
  if ('weeklyGoalId' in body) {
    const weeklyGoalId = parseWeeklyGoalLink(body.weeklyGoalId);
    todo.weeklyPlanId = await findPlanIdByWeeklyGoal(weeklyGoalId);
    todo.weeklyGoalId = weeklyGoalId;
  }

  const statusChanged = 'status' in body && parseStatus(body.status) !== todo.status;
  if ('status' in body) todo.status = parseStatus(body.status);
  if ('order' in body) {
    todo.order = parseOrder(body.order);
  } else if (statusChanged) {
    todo.order = await nextOrder(todo.status);
  }

  await todo.save();
  return todo.toObject();
}

export async function deleteTodo(id: Types.ObjectId) {
  const deleted = await TodoModel.findByIdAndDelete(id).lean<LeanTodo>();
  if (!deleted) throw notFound('할 일을 찾을 수 없습니다.');
  return { ok: true };
}

/**
 * PRD 4장: 미연결 항목 목록.
 * null뿐 아니라 이미 사라진 대상을 가리키는 참조도 미연결로 본다.
 * (연결 확인과 삭제가 동시에 일어나면 끊긴 참조가 남을 수 있다)
 */
export async function listUnlinked() {
  const [weeklyGoalIds, goalIds] = await Promise.all([
    WeeklyPlanModel.distinct('goals._id'),
    GoalModel.distinct('_id'),
  ]);
  const todos = await TodoModel.find({ $or: [{ weeklyGoalId: null }, { weeklyGoalId: { $nin: weeklyGoalIds } }] })
    .sort({ updatedAt: -1 })
    .lean<LeanTodo[]>();

  const existingGoals = new Set(goalIds.map(String));
  const plans = await WeeklyPlanModel.find({ 'goals.0': { $exists: true } }).sort({ weekStart: -1 }).lean<LeanWeeklyPlan[]>();
  const weeklyGoals = plans.flatMap((plan) =>
    plan.goals
      .filter((goal) => goal.goalId === null || !existingGoals.has(String(goal.goalId)))
      .map((goal) => ({ _id: goal._id, text: goal.text, planId: plan._id, weekStart: plan.weekStart })),
  );
  return { todos, weeklyGoals };
}
