import { Text, View } from 'react-native';
import type { deriveBalances } from '../lib/ledger';
import { formatCentavos } from '../lib/money';
import { orderWallets } from '../lib/wallet-order';
import { useBulsaTheme } from '../hooks/use-bulsa-theme';
import { useUI } from './bulsa-form';

type Balances = ReturnType<typeof deriveBalances>;
export function MoneyReview({ before, after, walletIds, negativeExplanation = 'Corrected records exceed recorded funding. You can save this correction. Existing transfers and adjustments stay unchanged.' }: { before: Balances; after: Balances; walletIds: (string | null | undefined)[]; negativeExplanation?: string }) {
  const ui = useUI();
  const { preferences } = useBulsaTheme();
  const previous = new Map(before.wallets.map(w => [w.id, w.balanceCentavos]));
  return <>
    <View style={ui.soft}><Text style={ui.heading}>Total Budget</Text><Text style={ui.body}>{formatCentavos(before.totalCentavos)} → {formatCentavos(after.totalCentavos)}</Text></View>
    <View style={ui.card}><Text style={ui.heading}>General</Text><Text style={ui.body}>{formatCentavos(before.generalCentavos)} → {formatCentavos(after.generalCentavos)}</Text>{after.generalCentavos < 0 && <Text style={ui.caption}>General contains transactions without a wallet and can be negative.</Text>}</View>
    {orderWallets(after.wallets.filter(w => walletIds.includes(w.id)), preferences.walletOrder).map(wallet => <View key={wallet.id} style={ui.card}>
      <Text style={ui.heading}>{wallet.name}</Text>
      <Text style={wallet.balanceCentavos < 0 ? ui.error : ui.body}>{formatCentavos(previous.get(wallet.id)!)} → {formatCentavos(wallet.balanceCentavos)}</Text>
      {!wallet.configured && <Text style={ui.caption}>Starting balance setup required.</Text>}
      {wallet.balanceCentavos < 0 && <Text style={ui.error}>{negativeExplanation}</Text>}
    </View>)}
  </>;
}
