import type { BulsaColors } from '../../constants/bulsa';
import { useBulsaTheme, useBulsaStyles } from '../../hooks/use-bulsa-theme';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { BackButton, ReadState, useUI } from '../../components/bulsa-form';
import { BulsaButton } from '../../components/bulsa-button';
import { BulsaScreen } from '../../components/bulsa-screen';

import { useLedger, useSaveAction } from '../../hooks/use-ledger';
import { formatCentavos } from '../../lib/money';
import { setWalletFlags } from '../../storage/wallets';

export default function Wallets() {
  const router = useRouter();
  const ui = useUI();
  const { colors: C } = useBulsaTheme();
  const styles = useBulsaStyles(createStyles);
  const { view } = useLocalSearchParams<{ view?: string }>();
  const [showHidden, setShowHidden] = useState(view === 'hidden');
  const [pendingFlags, setPendingFlags] = useState<Record<string, boolean>>({});
  const { balances, error, loading, reload } = useLedger();
  const { busy, error: saveError, run } = useSaveAction();
  const canOpenTransfer = useRef(false);
  const [transferReady, setTransferReady] = useState(false);
  useFocusEffect(useCallback(() => {
    canOpenTransfer.current = true;
    setTransferReady(true);
    return () => {
      canOpenTransfer.current = false;
      setTransferReady(false);
    };
  }, []));
  const transferDisabled = busy || !transferReady;
  function openTransfer() {
    if (busy || !canOpenTransfer.current) return;
    canOpenTransfer.current = false;
    setTransferReady(false);
    router.push('/transfer');
  }
  const hiddenCount = balances?.wallets.filter(w => w.hidden && w.included).length ?? 0;
  async function include(id: string, included: boolean) {
    if (busy) return;
    setPendingFlags(previous => ({ ...previous, [id]: included }));
    await run(async () => {
      await setWalletFlags(id, { included });
      await reload(true);
    });
    setPendingFlags(previous => { const next = { ...previous }; delete next[id]; return next; });
  }
  return <BulsaScreen header={showHidden ? <BackButton disabled={busy} title="‹ Back to Wallets" onPress={() => setShowHidden(false)} /> : undefined}>
    <View style={styles.titleRow}>
      <Text style={ui.title}>{showHidden ? 'Hidden Wallets' : 'Wallets'}</Text>
      {!showHidden && <Pressable accessibilityRole="button" accessibilityLabel="Add Wallet" accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => router.push('/wallets/add')} style={({ pressed }) => [styles.addWallet, (pressed || busy) && { opacity: 0.65 }]}><Text style={styles.addWalletLabel}>+ Add Wallet</Text></Pressable>}
    </View>
    <Text style={ui.caption}>Recorded money, in one place. No bank connection.</Text>
    {!showHidden && <>
      <Pressable accessibilityRole="button" accessibilityLabel="Transfer Money Between Wallets" accessibilityHint="Choose where the money comes from and where it goes, then review the transfer." accessibilityState={{ disabled: transferDisabled }} disabled={transferDisabled} onPress={openTransfer} style={({ pressed }) => [styles.transferAction, (pressed || transferDisabled) && { opacity: 0.7 }]}>
        <View style={styles.transferIcon}><Text accessible={false} style={styles.transferSymbol}>⇄</Text></View>
        <View style={styles.transferText}><Text style={styles.transferTitle}>Transfer Money</Text><Text style={ui.caption}>From one wallet to another</Text></View>
        <Text accessible={false} style={styles.chevron}>›</Text>
      </Pressable>
      <Text style={ui.caption}>Record a wallet transfer here. It does not count as income or spending.</Text>
    </>}
    {loading || error || !balances ? <ReadState loading={loading} error={error} retry={() => void reload()} /> : <>
      <View style={ui.soft}><Text style={ui.body}>Total Budget</Text><Text style={ui.money}>{formatCentavos(balances.totalCentavos)}</Text><Text style={ui.caption}>Included wallets + General. Separate from your monthly spending limit.</Text></View>
      {!showHidden && <View style={ui.card}><Text style={ui.heading}>General · Always Included</Text><Text style={ui.money}>{formatCentavos(balances.generalCentavos)}</Text><Text style={ui.caption}>Transactions without a wallet. General can be negative and always counts in Total Budget.</Text></View>}
      {!showHidden && <View style={styles.titleRow}>
        <Text accessibilityRole="header" style={ui.heading}>Your Wallets</Text>
        {balances.wallets.filter(w => !w.hidden && w.id !== 'wallet-cash').length > 1 &&
          <Pressable accessibilityRole="button" accessibilityLabel="Arrange Wallets" onPress={() => router.push('/arrange-wallets')} style={styles.addWallet}>
            <Text style={styles.addWalletLabel}>Arrange</Text>
          </Pressable>}
      </View>}
      {!!saveError && <Text style={ui.error} accessibilityLiveRegion="polite">{saveError}</Text>}
      {balances.wallets.filter(w => w.hidden === showHidden).map(wallet => <View key={wallet.id} style={[styles.wallet, !wallet.included && styles.excluded]}>
        <Pressable disabled={busy} accessibilityRole="button" accessibilityLabel={`Open ${wallet.name}`} onPress={() => router.push({ pathname: '/wallets/[id]', params: { id: wallet.id } })} style={({ pressed }) => [styles.details, pressed && { opacity: 0.75 }]}>
          <Text style={[ui.heading, !wallet.included && styles.muted]}>{wallet.name}  ›</Text>
          <Text style={[wallet.balanceCentavos < 0 ? ui.error : ui.body, !wallet.included && wallet.balanceCentavos >= 0 && styles.muted]}>{wallet.configured ? formatCentavos(wallet.balanceCentavos) : 'Starting Balance Not Set'}</Text>
          <Text style={ui.caption}>{wallet.included ? 'Included in Total Budget' : 'Not Included'}{wallet.hidden ? ' · Hidden' : ''}</Text>
        </Pressable>
        <View style={styles.switchRow}><Text style={[ui.body, styles.switchLabel]}>Include in Total Budget</Text><View style={styles.switchTarget}><Switch accessibilityLabel={`Include ${wallet.name} in Total Budget`} value={pendingFlags[wallet.id] ?? wallet.included} disabled={busy} onValueChange={value => void include(wallet.id, value)} hitSlop={8} trackColor={{ false: C.track, true: C.accent }} thumbColor={C.switchThumb} /></View></View>
      </View>)}
      {!balances.wallets.some(w => w.hidden === showHidden) && <Text style={ui.body}>{showHidden ? 'No hidden wallets.' : 'No visible wallets. Add one or restore a hidden wallet.'}</Text>}
      {!showHidden && <BulsaButton secondary title="Edit Total Budget" disabled={busy} onPress={() => router.push('/edit-total-budget')} />}
      <View style={styles.hiddenControls}>
        {hiddenCount > 0 && <Text style={ui.caption}>{hiddenCount} hidden wallet{hiddenCount === 1 ? '' : 's'} still count{hiddenCount === 1 ? 's' : ''} in Total Budget.</Text>}
        <BulsaButton secondary disabled={busy} title={showHidden ? 'Show Visible Wallets' : 'Manage Hidden Wallets'} onPress={() => setShowHidden(value => !value)} />
      </View>
    </>}
  </BulsaScreen>;
}

const createStyles = (C: BulsaColors) => StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  addWallet: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 8, marginRight: -8, borderRadius: 12 },
  addWalletLabel: { color: C.accent, fontSize: 16, fontWeight: '600' },
  transferAction: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 88, padding: 16, borderRadius: 20, backgroundColor: C.soft, borderWidth: 1, borderColor: C.track },
  transferIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: C.accent },
  transferSymbol: { color: C.onAccent, fontSize: 28, lineHeight: 34 },
  transferText: { flex: 1, minWidth: 0, gap: 4 },
  transferTitle: { color: C.text, fontSize: 18, fontWeight: '600' },
  chevron: { color: C.accent, fontSize: 28 },
  wallet: { backgroundColor: C.surface, borderRadius: 20, overflow: 'hidden' },
  excluded: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: C.muted },
  muted: { color: C.muted },
  details: { minHeight: 48, padding: 18, gap: 8 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, paddingBottom: 12, borderTopWidth: 1, borderColor: C.track },
  switchLabel: { flex: 1, flexShrink: 1 },
  switchTarget: { minWidth: 64, minHeight: 48, justifyContent: 'center', alignItems: 'center' },
  hiddenControls: { gap: 8 },
});
