import type { ActivityOrder, Ledger } from '../types/wallet';
import { formatCentavos } from './money';

export type ActivityRow = {
  key: string; date: string; title: string; detail: string; amount: number;
  type: 'expense' | 'income' | 'transfer' | 'opening' | 'adjustment';
  fields: { label: string; value: string }[];
};
export type ActivitySection = { date: string; data: ActivityRow[] };

// A detail view needs one record, not a rebuilt/sorted copy of the whole feed.
export function activityRecord(data: Ledger, key: string): ActivityRow | undefined {
  const selected: Ledger = { wallets: data.wallets, transactions: [], transfers: [], changes: [], activityOrder: data.activityOrder };
  if (key.startsWith('transaction-')) {
    const row = data.transactions.find(t => t.id === key.slice('transaction-'.length));
    if (row) selected.transactions = [row];
  } else if (key.startsWith('transfer-')) {
    const row = data.transfers.find(t => t.id === key.slice('transfer-'.length));
    if (row) selected.transfers = [row];
  } else if (key.startsWith('change-')) {
    const row = data.changes.find(t => t.id === key.slice('change-'.length));
    if (row) selected.changes = [row];
  }
  return activitySections(selected)[0]?.data[0];
}

export function spendingSummary(data: Ledger, month: string) {
  let total = 0n, count = 0;
  for (const record of data.transactions) {
    if (record.type === 'expense' && record.date.startsWith(month + '-')) {
      total += BigInt(record.amountCentavos); count++;
    }
  }
  const expenseCentavos = Number(total);
  if (!Number.isSafeInteger(expenseCentavos)) throw new Error('Monthly spending is outside the safe range.');
  return { expenseCentavos, count };
}

export type ActivityFilters = { wallet?: string; query?: string; month?: string; type?: ActivityRow['type']; category?: string; payment?: string };
export function parseActivityMonth(input: string): string | undefined {
  if (!input.trim()) return undefined;
  if (!/^(0[1-9]|1[0-2])-\d{4}$/.test(input) || input.endsWith('-0000')) throw new Error('Use a valid month in MM-YYYY format.');
  return `${input.slice(3)}-${input.slice(0, 2)}`;
}
export function filterActivitySections(data: Ledger, filters: ActivityFilters): ActivitySection[] {
  const query = filters.query?.trim().toLocaleLowerCase();
  return activitySections(data, filters.wallet).map(section => ({ ...section, data: section.data.filter(row => {
    if (filters.month && row.date.slice(0, 7) !== filters.month) return false;
    if (filters.type && row.type !== filters.type) return false;
    if (filters.category && (!['expense', 'income'].includes(row.type) || row.title !== filters.category)) return false;
    if (filters.payment && !row.fields.some(f => f.label === 'Payment Method' && f.value === filters.payment)) return false;
    return !query || [row.title, row.detail, ...row.fields.map(f => f.value)].join(' ').toLocaleLowerCase().includes(query);
  }) })).filter(section => section.data.length > 0);
}

// Presentation only: never mutate records or recalculate financial balances here.
export function activitySections(ledger: Ledger, wallet?: string): ActivitySection[] {
  const names = new Map(ledger.wallets.map(w => [w.id, w.name]));
  const name = (id?: string | null) => id == null ? 'General' : names.get(id) ?? 'Unknown Wallet';
  const rows: ActivityRow[] = [];
  for (const t of ledger.transactions) {
    if (wallet && t.walletId !== wallet) continue;
    rows.push({ key: `transaction-${t.id}`, date: t.date, title: t.category,
      detail: `${t.type === 'income' ? 'Income' : 'Expense'} · ${name(t.walletId)}`,
      amount: t.amountCentavos * (t.type === 'income' ? 1 : -1), type: t.type,
      fields: [
        { label: 'Wallet', value: name(t.walletId) },
        { label: 'Payment Method', value: t.paymentMethod },
        ...(t.note ? [{ label: 'Note', value: t.note }] : []),
      ],
    });
  }
  for (const t of ledger.transfers) {
    if (wallet && t.fromWalletId !== wallet && t.toWalletId !== wallet) continue;
    rows.push({ key: `transfer-${t.id}`, date: t.date, title: 'Transfer',
      detail: `${name(t.fromWalletId)} → ${name(t.toWalletId)}`, amount: t.amountCentavos, type: 'transfer',
      fields: [
        { label: 'From', value: name(t.fromWalletId) }, { label: 'To', value: name(t.toWalletId) },
        { label: 'Money Rule', value: 'A transfer is not income or spending.' },
        ...(t.note ? [{ label: 'Note', value: t.note }] : []),
      ],
    });
  }
  for (const c of ledger.changes) {
    if (wallet && c.walletId !== wallet) continue;
    rows.push({ key: `change-${c.id}`, date: c.date,
      title: c.kind === 'opening' ? 'Starting Balance' : 'Balance Adjustment',
      detail: name(c.walletId), amount: c.deltaCentavos, type: c.kind,
      fields: [
        { label: 'Wallet', value: name(c.walletId) },
        { label: 'Money Rule', value: c.kind === 'opening' ? 'Starting balance is not income.' : 'This fixed balance change is not income or spending.' },
        ...(c.targetCentavos !== null ? [{ label: 'Recorded Target', value: formatCentavos(c.targetCentavos) }] : []),
        ...(c.reason ? [{ label: 'Reason', value: c.reason }] : []),
      ],
    });
  }
  const savedOrder = new Map(ledger.activityOrder?.map(row => [`${row.recordType}-${row.recordId}`, row.sequence]));
  rows.sort((a, b) => b.date.localeCompare(a.date) || (savedOrder.get(b.key) ?? 0) - (savedOrder.get(a.key) ?? 0) || a.key.localeCompare(b.key));
  const sections: ActivitySection[] = [];
  for (const row of rows) {
    const previous = sections[sections.length - 1];
    if (previous?.date === row.date) previous.data.push(row);
    else sections.push({ date: row.date, data: [row] });
  }
  return sections;
}

// Older records did not save a global insertion order. Recover recognized app
// ID timestamps or native creation timestamps where available; unknown/tied
// records use a stable table/row fallback, not an invented exact chronology.
export function legacyActivityOrder(data: { transactions: { id: string; createdAt?: string }[]; transfers: { id: string; createdAt?: string }[]; changes: { id: string; createdAt?: string }[] }): ActivityOrder[] {
  const rows: (Omit<ActivityOrder, 'sequence'> & { timestamp: number; position: number })[] = [];
  for (const [recordType, records] of [['transaction', data.transactions], ['transfer', data.transfers], ['change', data.changes]] as const) {
    records.forEach((record, position) => {
      const match = typeof record.id === 'string' ? /(?:^|-)([a-z0-9]+)-[a-z0-9]+-[a-z0-9]+$/i.exec(record.id) : null;
      const generated = match ? Number.parseInt(match[1], 36) : 0;
      const validGenerated = Number.isSafeInteger(generated) && generated >= 946684800000 && generated <= 4133980800000;
      const created = typeof record.createdAt === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(record.createdAt) ? Date.parse(record.createdAt.replace(' ', 'T') + 'Z') : 0;
      rows.push({ recordType, recordId: record.id, timestamp: validGenerated ? generated : Number.isFinite(created) ? created : 0, position });
    });
  }
  rows.sort((a, b) => a.timestamp - b.timestamp || a.recordType.localeCompare(b.recordType) || a.position - b.position || a.recordId.localeCompare(b.recordId));
  return rows.map(({ recordType, recordId }, index) => ({ sequence: index + 1, recordType, recordId }));
}
