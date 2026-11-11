import { describe, expect, it } from 'vitest';
import {
  addWeeks,
  dateOfDay,
  formatWeekRange,
  getWeekStart,
  isValidDate,
  isValidWeekStart,
  todayKST,
} from '@/lib/week';

describe('getWeekStart (KST 기준 월요일)', () => {
  it('일요일 23:59 KST는 그 주 월요일을 반환한다', () => {
    // 2026-11-15(일) 23:59 KST = 2026-11-15 14:59 UTC
    expect(getWeekStart(new Date('2026-11-15T14:59:00Z'))).toBe('2026-11-09');
  });

  it('월요일 00:00 KST는 당일을 반환한다', () => {
    // 2026-11-16(월) 00:00 KST = 2026-11-15 15:00 UTC
    expect(getWeekStart(new Date('2026-11-15T15:00:00Z'))).toBe('2026-11-16');
  });

  it('주 중간 날짜는 그 주 월요일을 반환한다', () => {
    expect(getWeekStart(new Date('2026-11-11T03:00:00Z'))).toBe('2026-11-09');
  });

  it('연도 경계를 넘는 주를 처리한다', () => {
    // 2027-01-01(금) KST → 2026-12-28(월)
    expect(getWeekStart(new Date('2027-01-01T01:00:00Z'))).toBe('2026-12-28');
  });
});

describe('날짜 유틸', () => {
  it('todayKST는 UTC 15시 이후를 다음 날로 본다', () => {
    expect(todayKST(new Date('2026-11-10T15:00:00Z'))).toBe('2026-11-11');
  });

  it('addWeeks는 주 단위로 이동한다', () => {
    expect(addWeeks('2026-11-09', 1)).toBe('2026-11-16');
    expect(addWeeks('2026-11-09', -2)).toBe('2026-10-26');
  });

  it('isValidWeekStart는 실제 월요일만 허용한다', () => {
    expect(isValidWeekStart('2026-11-09')).toBe(true);
    expect(isValidWeekStart('2026-11-10')).toBe(false);
    expect(isValidWeekStart('2026-02-30')).toBe(false);
    expect(isValidWeekStart('20261109')).toBe(false);
    expect(isValidWeekStart(null)).toBe(false);
  });

  it('isValidDate는 존재하지 않는 날짜를 거부한다', () => {
    expect(isValidDate('2026-11-31')).toBe(false);
    expect(isValidDate('2026-11-30')).toBe(true);
  });

  it('dateOfDay는 일요일을 주의 마지막 날로 계산한다', () => {
    expect(dateOfDay('2026-11-09', 1)).toBe('2026-11-09');
    expect(dateOfDay('2026-11-09', 0)).toBe('2026-11-15');
  });

  it('formatWeekRange는 월~일 범위를 표시한다', () => {
    expect(formatWeekRange('2026-11-09')).toBe('11/9 ~ 11/15');
  });
});
