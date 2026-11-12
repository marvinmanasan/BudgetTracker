import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { BackButton, ReadState, ui } from '../../components/bulsa-form';
import { PocketButton } from '../../components/pocket-button';
import { PocketScreen } from '../../components/pocket-screen';
import { PocketColors as C } from '../../constants/pocket';
import { useLedger, useSaveAction } from '../../hooks/use-ledger';
import { formatCentavos } from '../../lib/money';
import { setWalletFlags } from '../../storage/wallets';

export default function Wallets() {
  const { view } = useLocalSearchParams<{ view?: string }>();
  const [showHidden, setShowHidden] = useState(view === 'hidden');
  const { balances, error, loading, reload } = useLedger();
  const { busy, error: saveError, run } = useSaveAction();
  const hiddenCount = balances?.wallets.filter(w => w.hidden && w.included).length ?? 0;
  async function include(id: string, included: boolean) {
    await run(async () => {
      await setWalletFlags(id, { included });
      await reload(true);
    });
  }
  return <PocketScreen header={<BackButton disabled={busy} />}>
    <Text style={ui.title}>{showHidden ? 'Hidden Wallets' : 'Wallets'}</Text>
    <Text style={ui.caption}>Recorded money, in one place. No bank connection.</Text>
    {loading || error || !balances ? <ReadState loading={loading} error={error} retry={() => void reload()} /> : <>
      <View style={ui.soft}><Text style={ui.body}>Total Budget</Text><Text style={ui.money}>{formatCentavos(balances.totalCentavos)}</Text><Text style={ui.caption}>Included wallets + General. Separate from your monthly spending limit.</Text></View>
      {!showHidden && <View style={ui.card}><Text style={ui.heading}>General · Always Included</Text><Text style={ui.money}>{formatCentavos(balances.generalCentavos)}</Text><Text style={ui.caption}>Transactions without a wallet. General can be negative and always counts in Total Budget.</Text></View>}
      {!!saveError && <Text style={ui.error} accessibilityLiveRegion="polite">{saveError}</Text>}
      {balances.wallets.filter(w => w.hidden === showHidden).map(wallet => <View key={wallet.id} style={[styles.wallet, !wallet.included && styles.excluded]}>
        <Pressable disabled={busy} accessibilityRole="button" accessibilityLabel={`Open ${wallet.name}`} onPress={() => router.push({ pathname: '/wallets/[id]', params: { id: wallet.id } })} style={({ pressed }) => [styles.details, pressed && { opacity: 0.75 }]}>
          <Text style={[ui.heading, !wallet.included && styles.muted]}>{wallet.name}  ›</Text>
          <Text style={[wallet.balanceCentavos < 0 ? ui.error : ui.body, !wallet.included && wallet.balanceCentavos >= 0 && styles.muted]}>{wallet.configured ? formatCentavos(wallet.balanceCentavos) : 'Starting Balance Not Set'}</Text>
          <Text style={ui.caption}>{wallet.included ? 'Included in Total Budget' : 'Not Included'}{wallet.hidden ? ' · Hidden' : ''}</Text>
        </Pressable>
        <View style={styles.switchRow}><Text style={[ui.body, styles.switchLabel]}>Include in Total Budget</Text><View style={styles.switchTarget}><Switch accessibilityLabel={`Include ${wallet.name} in Total Budget`} value={wallet.included} disabled={busy} onValueChange={value => void include(wallet.id, value)} hitSlop={8} trackColor={{ false: C.track, true: C.accent }} thumbColor={C.surface} /></View></View>
      </View>)}
      {!balances.wallets.some(w => w.hidden === showHidden) && <Text style={ui.body}>{showHidden ? 'No hidden wallets.' : 'No visible wallets. Add one or restore a hidden wallet.'}</Text>}
      {!showHidden && <PocketButton secondary title="Transfer Between Wallets" disabled={busy} onPress={() => router.push('/transfer')} />}
      {!showHidden && <PocketButton title="Add Wallet" disabled={busy} onPress={() => router.push('/wallets/add')} />}
      <View style={styles.hiddenControls}>
        {hiddenCount > 0 && <Text style={ui.caption}>{hiddenCount} hidden wallet{hiddenCount === 1 ? '' : 's'} still count{hiddenCount === 1 ? 's' : ''} in Total Budget.</Text>}
        <PocketButton secondary disabled={busy} title={showHidden ? 'Show Visible Wallets' : 'Manage Hidden Wallets'} onPress={() => setShowHidden(value => !value)} />
      </View>
    </>}
  </PocketScreen>;
}

const styles = StyleSheet.create({
  wallet: { backgroundColor: C.surface, borderRadius: 20, overflow: 'hidden' },
  excluded: { backgroundColor: '#F0E9E1', borderWidth: 1, borderColor: C.track },
  muted: { color: C.muted },
  details: { minHeight: 48, padding: 18, gap: 8 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingBottom: 12, borderTopWidth: 1, borderColor: C.track },
  switchLabel: { flex: 1, flexShrink: 1 },
  switchTarget: { minWidth: 64, minHeight: 48, justifyContent: 'center', alignItems: 'center' },
  hiddenControls: { gap: 8 },
});
