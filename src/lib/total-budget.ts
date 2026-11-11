import type { Ledger } from '../types/wallet';
import { deriveBalances } from './ledger';
import { adjustmentPreview } from './editing';

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
