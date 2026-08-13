const pad = (n: number) => String(n).padStart(2, '0');

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function todayKey(): string {
  return dateKey(new Date());
}

export function addDays(key: string, n: number): string {
  const d = parseKey(key);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function addMonths(key: string, n: number): string {
  const d = parseKey(key);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  d.setDate(Math.min(day, daysInMonth(d.getFullYear(), d.getMonth())));
  return dateKey(d);
}

export function weekdayOf(key: string): number {
  return parseKey(key).getDay() + 1;
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parseKey(b).getTime() - parseKey(a).getTime()) / 86_400_000);
}

export function startOfWeek(key: string, weekStart = 0): string {
  return addDays(key, -((parseKey(key).getDay() - weekStart + 7) % 7));
}

export function startOfMonth(key: string): string {
  return `${key.slice(0, 7)}-01`;
}

export function monthMatrix(key: string, weekStart = 0): string[][] {
  const first = startOfWeek(startOfMonth(key), weekStart);
  return Array.from({ length: 6 }, (_, row) =>
    Array.from({ length: 7 }, (_, col) => addDays(first, row * 7 + col))
  );
}

export function isSameMonth(a: string, b: string): boolean {
  return a.slice(0, 7) === b.slice(0, 7);
}

export function minutesNow(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

export function formatMinutes(min: number): string {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

export function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAY_INITIAL = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function weekdayShort(key: string): string {
  return WEEKDAY_SHORT[parseKey(key).getDay()];
}

export function weekdayInitials(weekStart = 0): string[] {
  return Array.from({ length: 7 }, (_, i) => WEEKDAY_INITIAL[(i + weekStart) % 7]);
}

export function monthLabel(key: string): string {
  const d = parseKey(key);
  return `${MONTH_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

export function dayOfMonth(key: string): number {
  return parseKey(key).getDate();
}

export function longDateLabel(key: string): string {
  const d = parseKey(key);
  return `${WEEKDAY_SHORT[d.getDay()]}, ${MONTH_LONG[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
}

export function shortDateLabel(key: string): string {
  const d = parseKey(key);
  return `${MONTH_LONG[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
}

export function endOfDaySeconds(key: string): number {
  const d = parseKey(key);
  d.setHours(23, 59, 59, 0);
  return Math.floor(d.getTime() / 1000);
}

export function keyFromSeconds(seconds: number): string {
  return dateKey(new Date(seconds * 1000));
}
