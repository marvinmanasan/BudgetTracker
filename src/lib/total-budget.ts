import type { Ledger } from '../types/wallet';
import { deriveBalances } from './ledger';
import { adjustmentPreview } from './editing';

export type AdjustmentMode = 'add' | 'subtract' | 'exact';

export function adjustmentTarget(current: number, amount: number, mode: AdjustmentMode): number {
  if (!Number.isSafeInteger(current) || !Number.isSafeInteger(amount)) throw new Error('Enter an amount within the safe money range.');
  if (!['add', 'subtract', 'exact'].includes(mode)) throw new Error('Choose an adjustment option.');
  if (mode !== 'exact' && amount <= 0) throw new Error('Enter an amount above zero.');
  const result = mode === 'exact' ? BigInt(amount) : BigInt(current) + (mode === 'add' ? BigInt(amount) : -BigInt(amount));
  if (result > BigInt(Number.MAX_SAFE_INTEGER) || result < BigInt(-Number.MAX_SAFE_INTEGER)) throw new Error('The adjustment is outside the safe money range.');
  return Number(result);
}

export function totalBudgetPreview(data: Ledger, walletId: string, targetCentavos: number) {
  if (!Number.isSafeInteger(targetCentavos)) throw new Error('Enter a supported Total Budget.');
  const before = deriveBalances(data);
  const wallet = before.wallets.find(w => w.id === walletId);
  if (!wallet?.configured || !wallet.included) throw new Error('Choose an included wallet with a starting balance.');
  const delta = BigInt(targetCentavos) - BigInt(before.totalCentavos);
  const walletTargetCentavos = Number(BigInt(wallet.balanceCentavos) + delta);
  if (!Number.isSafeInteger(Number(delta)) || !Number.isSafeInteger(walletTargetCentavos)) throw new Error('The adjustment is outside the safe money range.');
  return { ...adjustmentPreview(data, walletId, walletTargetCentavos), walletTargetCentavos, signature: JSON.stringify(data) };
}
