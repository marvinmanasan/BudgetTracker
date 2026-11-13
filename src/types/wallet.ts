import type { Transaction } from './transaction';

export type Wallet = { id: string; name: string; included: boolean; hidden: boolean };
export type BalanceChange = {
  id: string; walletId: string; kind: 'opening' | 'adjustment';
  deltaCentavos: number; date: string; reason: string; targetCentavos: number | null;
};
export type Transfer = {
  id: string; fromWalletId: string; toWalletId: string;
  amountCentavos: number; date: string; note: string;
};
export type ActivityOrder = { sequence: number; recordType: 'transaction' | 'transfer' | 'change'; recordId: string };
export type Ledger = {
  wallets: Wallet[]; transactions: Transaction[]; transfers: Transfer[]; changes: BalanceChange[];
  activityOrder?: ActivityOrder[];
};
