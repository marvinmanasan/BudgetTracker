import type { Ledger } from '../types/wallet';

function exact(value: number): bigint {
  if (!Number.isSafeInteger(value)) throw new Error('Money is outside the safe range.');
  return BigInt(value);
}

function safe(value: bigint): number {
  const number = Number(value);
  if (!Number.isSafeInteger(number)) throw new Error('The balance is too large for the supported range.');
  return number;
}

// Work from history rather than keeping a second mutable balance/total.
export function deriveBalances(data: Ledger) {
  const amounts = new Map(data.wallets.map(wallet => [wallet.id, 0n]));
  let general = 0n;
  const add = (id: string, value: bigint) => {
    if (!amounts.has(id)) throw new Error('A money record refers to a missing wallet.');
    amounts.set(id, amounts.get(id)! + value);
  };
  for (const change of data.changes) add(change.walletId, exact(change.deltaCentavos));
  for (const record of data.transactions) {
    const effect = exact(record.amountCentavos) * (record.type === 'income' ? 1n : -1n);
    if (record.walletId == null) general += effect;
    else add(record.walletId, effect);
  }
  for (const transfer of data.transfers) {
    add(transfer.fromWalletId, -exact(transfer.amountCentavos));
    add(transfer.toWalletId, exact(transfer.amountCentavos));
  }
  let total = general;
  const wallets = data.wallets.map(wallet => {
    const balance = amounts.get(wallet.id)!;
    if (wallet.included) total += balance;
    return { ...wallet, balanceCentavos: safe(balance), configured: data.changes.some(c => c.walletId === wallet.id && c.kind === 'opening') };
  });
  return { wallets, generalCentavos: safe(general), totalCentavos: safe(total) };
}

export function monthlyTotals(data: Ledger, month: string) {
  let income = 0n, expenses = 0n;
  for (const record of data.transactions.filter(r => r.date.startsWith(month + '-'))) {
    if (record.type === 'income') income += exact(record.amountCentavos);
    else expenses += exact(record.amountCentavos);
  }
  return { incomeCentavos: safe(income), expenseCentavos: safe(expenses) };
}
