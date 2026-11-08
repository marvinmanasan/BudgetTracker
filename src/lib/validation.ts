import type { Transaction } from '../types/transaction';

export function validateDate(date: string): void {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Use a date in YYYY-MM-DD format.');
  const [year, month, day] = date.split('-').map(Number);
  const calendar = new Date(0);
  calendar.setUTCHours(0, 0, 0, 0);
  calendar.setUTCFullYear(year, month - 1, day);
  if (year < 1 || calendar.getUTCFullYear() !== year || calendar.getUTCMonth() !== month - 1 || calendar.getUTCDate() !== day) throw new Error('Choose a real calendar date.');
}

export function validateCentavos(value: number, positive = false): void {
  if (!Number.isSafeInteger(value) || (positive && value <= 0)) throw new Error('Use whole, safe centavos' + (positive ? ' greater than zero.' : '.'));
}

export function validateTransaction(record: Transaction): void {
  if (!record || ![record.id, record.category, record.paymentMethod].every(value => typeof value === 'string' && value.trim().length > 0)) throw new Error('ID, category and payment method are required.');
  if (record.type !== 'expense' && record.type !== 'income') throw new Error('Choose expense or income.');
  validateCentavos(record.amountCentavos, true);
  validateDate(record.date);
  if (record.note !== undefined && typeof record.note !== 'string') throw new Error('Note must be text.');
  if (record.walletId != null && (typeof record.walletId !== 'string' || !record.walletId.trim())) throw new Error('Choose a valid wallet or Not specified.');
}

export function localDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
