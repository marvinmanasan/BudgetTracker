import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { BackButton, ReadState, ui } from '../../components/bulsa-form';
import { PocketButton } from '../../components/pocket-button';
import { PocketScreen } from '../../components/pocket-screen';
import { useLedger } from '../../hooks/use-ledger';
import { formatCentavos } from '../../lib/money';

export default function Wallets() {
  const { view } = useLocalSearchParams<{ view?: string }>();
  const [showHidden, setShowHidden] = useState(view === 'hidden');
  const { balances, error, loading, reload } = useLedger();
  const hiddenCount = balances?.wallets.filter(w => w.hidden && w.included).length ?? 0;
  return <PocketScreen>
    <BackButton /><Text style={ui.title}>{showHidden ? 'Hidden wallets' : 'Wallets'}</Text>
    <Text style={ui.caption}>Recorded money, in one place. No bank connection.</Text>
    {loading || error || !balances ? <ReadState loading={loading} error={error} retry={() => void reload()} /> : <>
      <View style={ui.soft}><Text style={ui.body}>Total balance</Text><Text style={ui.money}>{formatCentavos(balances.totalCentavos)}</Text><Text style={ui.caption}>Included wallets + General</Text>
        {hiddenCount > 0 && <PocketButton secondary title={`Includes ${hiddenCount} hidden wallet${hiddenCount === 1 ? '' : 's'}`} onPress={() => setShowHidden(true)} />}
      </View>
      {!showHidden && <View style={ui.card}><Text style={ui.heading}>General · Always included</Text><Text style={ui.money}>{formatCentavos(balances.generalCentavos)}</Text><Text style={ui.caption}>Transactions without a wallet. General can be negative and always counts in Total balance.</Text></View>}
      {balances.wallets.filter(w => w.hidden === showHidden).map(wallet => <Pressable key={wallet.id} accessibilityRole="button" onPress={() => router.push({ pathname: '/wallets/[id]', params: { id: wallet.id } })} style={ui.card}>
        <Text style={ui.heading}>{wallet.name}  ›</Text><Text style={wallet.balanceCentavos < 0 ? ui.error : ui.body}>{wallet.configured ? formatCentavos(wallet.balanceCentavos) : 'Starting balance not set'}</Text>
        <Text style={ui.caption}>{wallet.included ? 'Included in total balance' : 'Not included'}{wallet.hidden ? ' · Hidden' : ''}</Text>
      </Pressable>)}
      {!balances.wallets.some(w => w.hidden === showHidden) && <Text style={ui.body}>{showHidden ? 'No hidden wallets.' : 'No visible wallets. Add one or restore a hidden wallet.'}</Text>}
      {!showHidden && <PocketButton title="Add wallet" onPress={() => router.push('/wallets/add')} />}
      <PocketButton secondary title={showHidden ? 'Show visible wallets' : 'Manage hidden wallets'} onPress={() => setShowHidden(value => !value)} />
    </>}
  </PocketScreen>;
}
