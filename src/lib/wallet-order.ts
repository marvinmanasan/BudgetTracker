export const cashWalletId = 'wallet-cash';

export function orderWallets<T extends { id: string }>(wallets: T[], saved: string[] = []): T[] {
  const rank = new Map(saved.map((id, index) => [id, index]));
  const position = (id: string) => id === cashWalletId ? -1 : rank.get(id) ?? saved.length;
  return [...wallets].sort((a, b) => position(a.id) - position(b.id));
}
