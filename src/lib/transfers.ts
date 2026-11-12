import type { Ledger, Transfer } from '../types/wallet';
import { deriveBalances } from './ledger';
import { validateCentavos, validateDate } from './validation';

export function transferPreview(data: Ledger, record: Transfer) {
  validateCentavos(record.amountCentavos, true); validateDate(record.date);
  if (record.fromWalletId === record.toWalletId) throw new Error('Choose two different wallets.');
  const before = deriveBalances(data);
  const source = before.wallets.find(w => w.id === record.fromWalletId);
  const destination = before.wallets.find(w => w.id === record.toWalletId);
  if (!source?.configured || !destination?.configured || source.hidden || destination.hidden) throw new Error('Choose two visible wallets with starting balances.');
  if (source.balanceCentavos < record.amountCentavos) throw new Error('Not enough money in the source wallet.');
  return { before, after: deriveBalances({ ...data, transfers: [...data.transfers, record] }), signature: JSON.stringify(data) };
}
