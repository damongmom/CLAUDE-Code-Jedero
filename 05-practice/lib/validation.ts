import { generateKeyBetween } from 'fractional-indexing';
import { badRequest } from '@/lib/api';
import { isValidDate } from '@/lib/week';
import { PRIORITIES, TODO_STATUSES, type Priority, type TodoStatus } from '@/types';

export function parseRequiredText(value: unknown, field: string, max = 200): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw badRequest(`${field}은(는) 필수입니다.`);
  }
  const text = value.trim();
  if (text.length > max) throw badRequest(`${field}은(는) ${max}자 이하여야 합니다.`);
  return text;
}

export function parseOptionalText(value: unknown, field: string, max = 2000): string {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') throw badRequest(`${field}은(는) 문자열이어야 합니다.`);
  if (value.length > max) throw badRequest(`${field}은(는) ${max}자 이하여야 합니다.`);
  return value;
}

export function parseStatus(value: unknown): TodoStatus {
  if (!TODO_STATUSES.includes(value as TodoStatus)) {
    throw badRequest(`status는 ${TODO_STATUSES.join(', ')} 중 하나여야 합니다.`);
  }
  return value as TodoStatus;
}

export function parsePriority(value: unknown): Priority {
  if (!PRIORITIES.includes(value as Priority)) {
    throw badRequest(`priority는 ${PRIORITIES.join(', ')} 중 하나여야 합니다.`);
  }
  return value as Priority;
}

export function parseDayOfWeek(value: unknown): number | null {
  if (value === null) return null;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 6) {
    throw badRequest('dayOfWeek는 0(일)~6(토) 정수 또는 null이어야 합니다.');
  }
  return value;
}

export function parseDueDate(value: unknown): string | null {
  if (value === null || value === '') return null;
  if (!isValidDate(value)) throw badRequest('dueDate는 YYYY-MM-DD 형식이어야 합니다.');
  return value;
}

export function parseOrder(value: unknown): string {
  if (typeof value !== 'string' || !/^[0-9A-Za-z]+$/.test(value) || value.length > 100) {
    throw badRequest('order 형식이 올바르지 않습니다.');
  }
  // base62 문자만으로는 부족하다("zzzz", "a10" 등은 라이브러리가 키로 받지 않는다).
  // 잘못된 키가 저장되면 이후 nextOrder가 계속 실패하므로 라이브러리로 직접 검증한다.
  try {
    generateKeyBetween(value, null);
  } catch {
    throw badRequest('order 형식이 올바르지 않습니다.');
  }
  return value;
}
