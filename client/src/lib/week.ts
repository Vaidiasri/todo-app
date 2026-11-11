// Week math in the device time zone. Weeks run Monday 00:00 to next Monday 00:00 (spec 0001, AC-6).

export function startOfWeek(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  r.setDate(r.getDate() - ((r.getDay() + 6) % 7));
  return r;
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Local calendar day as YYYY-MM-DD (the value of an <input type="date">). */
export const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** YYYY-MM-DD to local midnight, or null when it is not a valid day. */
export function parseDayKey(s: string | null): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00`);
  return Number.isNaN(d.getTime()) || dayKey(d) !== s ? null : d;
}

/** Local time as "HH:MM" (the value of an <input type="time">). */
export const timeKey = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** Form date + time ("HH:MM") read as local time. */
export const combineDateTime = (date: string, time: string) => new Date(`${date}T${time}`);

const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-GB", o);
const dayMonth = fmt({ day: "numeric", month: "short" });
const dayOnly = fmt({ day: "numeric" });
const weekdayShort = fmt({ weekday: "short" });
const weekdayLong = fmt({ weekday: "long" });
const monthLong = fmt({ month: "long" });
const time = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });

/** "10 to 16 Nov", or "27 Oct to 2 Nov" across months. */
export function weekRangeLabel(weekStart: Date): string {
  const end = addDays(weekStart, 6);
  const first = weekStart.getMonth() === end.getMonth() ? dayOnly.format(weekStart) : dayMonth.format(weekStart);
  return `${first} to ${dayMonth.format(end)}`;
}

/** "Wed, 12 Nov" */
export const dayLabel = (d: Date) => `${weekdayShort.format(d)}, ${dayMonth.format(d)}`;

/** "Friday 14, January" (the Figma's date field format) */
export const longDateLabel = (d: Date) => `${weekdayLong.format(d)} ${d.getDate()}, ${monthLong.format(d)}`;

export const weekdayAbbr = (d: Date) => weekdayShort.format(d);

export const timeLabel = (d: Date) => time.format(d);

export const sameDay = (a: Date, b: Date) => dayKey(a) === dayKey(b);
