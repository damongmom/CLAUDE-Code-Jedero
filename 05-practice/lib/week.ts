// 한국은 서머타임이 없으므로 고정 +9시간 오프셋으로 KST를 계산한다.
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 화면 표시 순서: 월 → 일 (값은 Date.getDay 기준 0=일 ~ 6=토) */
export const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;
export const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;

function toKstShifted(date: Date): Date {
  return new Date(date.getTime() + KST_OFFSET_MS);
}

function parseDate(ymd: string): Date {
  return new Date(`${ymd}T00:00:00Z`);
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** 주어진 시각이 속한 주의 KST 월요일을 YYYY-MM-DD로 반환한다. */
export function getWeekStart(date: Date = new Date()): string {
  const kst = toKstShifted(date);
  const day = kst.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  kst.setUTCDate(kst.getUTCDate() + diff);
  return formatDate(kst);
}

/** 오늘 날짜(KST) YYYY-MM-DD */
export function todayKST(now: Date = new Date()): string {
  return formatDate(toKstShifted(now));
}

export function addWeeks(weekStart: string, weeks: number): string {
  const date = parseDate(weekStart);
  date.setUTCDate(date.getUTCDate() + weeks * 7);
  return formatDate(date);
}

export function isValidDate(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const date = parseDate(value);
  return !Number.isNaN(date.getTime()) && formatDate(date) === value;
}

/** 실제 존재하는 날짜이면서 월요일인지 */
export function isValidWeekStart(value: unknown): value is string {
  return isValidDate(value) && parseDate(value).getUTCDay() === 1;
}

/** 주 시작일과 요일(0=일)로 해당 날짜를 구한다. 일요일은 주의 마지막 날이다. */
export function dateOfDay(weekStart: string, dayOfWeek: number): string {
  const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const date = parseDate(weekStart);
  date.setUTCDate(date.getUTCDate() + offset);
  return formatDate(date);
}

/** "11/9 ~ 11/15" 형식 */
export function formatWeekRange(weekStart: string): string {
  const fmt = (ymd: string) => {
    const [, m, d] = ymd.split('-');
    return `${Number(m)}/${Number(d)}`;
  };
  return `${fmt(weekStart)} ~ ${fmt(dateOfDay(weekStart, 0))}`;
}
