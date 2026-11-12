import { validateDate } from './validation';

// Stored dates remain ISO strings, so existing sorting and monthly totals are unchanged.
export function displayDate(iso: string): string {
  return `${iso.slice(5, 7)}-${iso.slice(8, 10)}-${iso.slice(0, 4)}`;
}

export function parseDisplayDate(input: string): string {
  if (!/^\d{2}-\d{2}-\d{4}$/.test(input)) throw new Error('Enter a valid date in MM-DD-YYYY format.');
  const iso = `${input.slice(6, 10)}-${input.slice(0, 2)}-${input.slice(3, 5)}`;
  try { validateDate(iso); }
  catch { throw new Error('Enter a valid date in MM-DD-YYYY format.'); }
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
