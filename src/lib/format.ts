import type { CurrencySymbol } from '@/types';

export const CURRENCY_OPTIONS: CurrencySymbol[] = ['RM', '$', 'NT$', 'IDR'];

export function formatAmount(n: number, symbol: string): string {
  return `${symbol} ${(n || 0).toFixed(2)}`;
}

export function formatDateTime(ts: number): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ts));
}

export function formatDate(ts: number): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(ts));
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export type TimeRange = 'today' | 'week' | 'month' | 'year' | 'all';

export function filterByTimeRange<T extends { createdAt: number }>(items: T[], range: TimeRange): T[] {
  if (range === 'all') return items;
  const now = new Date();
  const start = new Date();
  if (range === 'today') {
    start.setHours(0, 0, 0, 0);
  } else if (range === 'week') {
    const day = now.getDay();
    const diff = day === 0 ? 6 : day - 1;
    start.setDate(now.getDate() - diff);
    start.setHours(0, 0, 0, 0);
  } else if (range === 'month') {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  } else if (range === 'year') {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
  }
  return items.filter((i) => i.createdAt >= start.getTime());
}

export const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  today: '今天',
  week: '本周',
  month: '本月',
  year: '今年',
  all: '全部',
};

export type ChurnStatus = 'active' | 'review' | 'risk';

export const CHURN_LABELS: Record<ChurnStatus, string> = {
  active: '活跃',
  review: '需回访',
  risk: '高危流失',
};

export const CHURN_STYLES: Record<ChurnStatus, string> = {
  active: 'bg-emerald-50 text-emerald-600',
  review: 'bg-amber-50 text-amber-600',
  risk: 'bg-rose-50 text-rose-600',
};

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
const FIFTEEN_DAYS = 15 * 24 * 60 * 60 * 1000;

export function getChurnStatus(lastOrderTime: number | null): ChurnStatus {
  if (!lastOrderTime) return 'risk';
  const diff = Date.now() - lastOrderTime;
  if (diff <= SEVEN_DAYS) return 'active';
  if (diff <= FIFTEEN_DAYS) return 'review';
  return 'risk';
}

export function formatDaysAgo(ts: number): string {
  const days = Math.floor((Date.now() - ts) / (24 * 60 * 60 * 1000));
  if (days === 0) return '今天';
  if (days === 1) return '昨天';
  return `${days}天前`;
}

export function getWeekRange(ts: number): { start: number; end: number } {
  const date = new Date(ts);
  const day = date.getDay();
  const diffToSat = day === 6 ? 0 : day + 1;
  const start = new Date(date);
  start.setDate(date.getDate() - diffToSat);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start: start.getTime(), end: end.getTime() };
}

export function getCurrentWeekRange(): { start: number; end: number } {
  return getWeekRange(Date.now());
}

export function formatWeekLabel(weekStart: number, english = false): string {
  const date = new Date(weekStart);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const jan1 = new Date(year, 0, 1);
  const daysSinceJan1 = Math.floor((weekStart - jan1.getTime()) / (24 * 60 * 60 * 1000));
  const weekNum = Math.ceil((daysSinceJan1 + jan1.getDay() + 1) / 7);
  return english ? `${year}/${month} Week ${weekNum}` : `${year}年${month}月第${weekNum}周`;
}

export function formatDateRange(start: number, end: number): string {
  const s = formatDate(start);
  const e = formatDate(end);
  return `${s} ~ ${e}`;
}
