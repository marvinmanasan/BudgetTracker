import { validateDate } from './validation';

// Stored dates remain ISO strings, so existing sorting and monthly totals are unchanged.
export function displayDate(iso: string): string {
  return `${iso.slice(5, 7)}-${iso.slice(8, 10)}-${iso.slice(0, 4)}`;
}

// Written dates for summaries only; manual inputs keep MM-DD-YYYY.
export function readableDateRange(start: string, end: string): string {
  validateDate(start);
  validateDate(end);
  if (end < start) throw new Error('Choose an end date on or after the start date.');
  const parts = (date: string) => ({
    month: monthName(date.slice(0, 7)).split(' ')[0],
    day: Number(date.slice(8, 10)), year: date.slice(0, 4),
  });
  const from = parts(start), to = parts(end);
  if (start === end) return `${from.month} ${from.day}, ${from.year}`;
  if (start.slice(0, 7) === end.slice(0, 7)) return `${from.month} ${from.day}–${to.day}, ${from.year}`;
  if (from.year === to.year) return `${from.month} ${from.day} – ${to.month} ${to.day}, ${from.year}`;
  return `${from.month} ${from.day}, ${from.year} – ${to.month} ${to.day}, ${to.year}`;
}

export function parseDisplayDate(input: string): string {
  if (!/^\d{2}-\d{2}-\d{4}$/.test(input)) throw new Error('Enter a valid date in MM-DD-YYYY format.');
  const iso = `${input.slice(6, 10)}-${input.slice(0, 2)}-${input.slice(3, 5)}`;
  try { validateDate(iso); }
  catch { throw new Error('That date doesn’t exist. Check the month and day.'); }
  return iso;
}

export function displayMonth(isoMonth: string): string {
  return `${isoMonth.slice(5, 7)}-${isoMonth.slice(0, 4)}`;
}

export function monthName(month: string): string {
  const names = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return `${names[Number(month.slice(5,7))-1]} ${month.slice(0,4)}`;
}
export function shiftMonth(month: string, delta: number): string {
  const index = Math.max(12, Math.min(9999 * 12 + 11, Number(month.slice(0,4)) * 12 + Number(month.slice(5,7)) - 1 + delta));
  return `${String(Math.floor(index/12)).padStart(4,'0')}-${String(index%12+1).padStart(2,'0')}`;
}
