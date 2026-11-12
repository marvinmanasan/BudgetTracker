import type { Transaction } from '../types/transaction';
type Wallet = { id: string; name: string; configured: boolean; hidden: boolean; balanceCentavos: number };
export function expenseAvailable(wallet: Wallet, original?: Pick<Transaction, 'type'|'walletId'|'amountCentavos'>) {
  const available = BigInt(wallet.balanceCentavos) + (original?.walletId === wallet.id ? BigInt(original.amountCentavos) * (original.type === 'expense' ? 1n : -1n) : 0n);
  const max = BigInt(Number.MAX_SAFE_INTEGER);
  return Number(available > max ? max : available < -max ? -max : available);
}
export function expenseWalletChoices<T extends Wallet>(wallets: T[], original?: Transaction): T[] {
  return wallets.filter(w => w.id === original?.walletId || (!w.hidden && w.configured && w.balanceCentavos > 0))
    .sort((a,b) => Number(b.name.toLowerCase() === 'cash') - Number(a.name.toLowerCase() === 'cash'));
}
