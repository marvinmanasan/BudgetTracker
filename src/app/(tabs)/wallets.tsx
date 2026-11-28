import type { BulsaColors } from '../../constants/bulsa';
import { useBulsaTheme, useBulsaStyles } from '../../hooks/use-bulsa-theme';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { BackButton, ReadState, useUI } from '../../components/bulsa-form';
import { BulsaButton } from '../../components/bulsa-button';
import { BulsaScreen } from '../../components/bulsa-screen';

import { useLedger } from '../../hooks/use-ledger';
import { formatCentavos } from '../../lib/money';

export default function Wallets() {
  const router = useRouter();
  const ui = useUI();
  const { colors: C } = useBulsaTheme();
  const styles = useBulsaStyles(createStyles);
  const { view } = useLocalSearchParams<{ view?: string }>();
  const [about, setAbout] = useState(false);
  const [showHidden, setShowHidden] = useState(view === 'hidden');
  const { balances, error, loading, reload } = useLedger();
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
  const transferDisabled = !transferReady;
  function openTransfer() {
    if (!canOpenTransfer.current) return;
    canOpenTransfer.current = false;
    setTransferReady(false);
    router.push('/transfer');
  }
  const hiddenCount = balances?.wallets.filter(w => w.hidden && w.included).length ?? 0;
  const includedCount = balances?.wallets.filter(w => w.included).length ?? 0;
  const visibleWallets = balances?.wallets.filter(w => w.hidden === showHidden) ?? [];
  const ready = !loading && !error && !!balances;
  return <BulsaScreen header={showHidden ? <BackButton title="‹ Back to Wallets" onPress={() => setShowHidden(false)} /> : undefined}>
    <View style={styles.titleRow}>
      <Text style={ui.title}>{showHidden ? 'Hidden Wallets' : 'Wallets'}</Text>
      {!showHidden && <BulsaButton title="Add Wallet" onPress={() => router.push('/wallets/add')} />}
    </View>
    {ready && <View style={styles.summary}>
      <View style={styles.titleRow}>
        <Text style={styles.summaryLabel}>Total Budget</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="About Your Balances" accessibilityState={{ expanded: about }} onPress={() => setAbout(value => !value)} style={styles.infoAction}>
          <SymbolView name={{ ios: 'info.circle', android: 'info', web: 'info' }} size={22} tintColor={C.onSummary} accessible={false} />
        </Pressable>
      </View>
      <View style={styles.titleRow}>
        <Text style={styles.summaryMoney}>{formatCentavos(balances.totalCentavos)}</Text>
        {!showHidden && <BulsaButton secondary title="Adjust" accessibilityLabel="Adjust Total Budget" onPress={() => router.push('/edit-total-budget')} />}
      </View>
      <Text style={styles.summaryCaption}>{includedCount} wallet{includedCount === 1 ? '' : 's'} included{hiddenCount > 0 ? ` (${hiddenCount} hidden)` : ''}{balances.generalCentavos !== 0 ? ' + unassigned money' : ''}</Text>
    </View>}
    {ready && about && <View style={ui.soft}><Text style={ui.body}>Total Budget includes your included wallets and entries saved without a wallet (General). Unassigned money can be negative. Spending limits are separate.</Text><Text style={ui.caption}>Bulsa records your money without a bank connection. Transfers move recorded money between wallets; they are not income or spending. Open a wallet to change whether it is included.</Text></View>}
    {!showHidden && <>
      <Pressable accessibilityRole="button" accessibilityLabel="Transfer Money Between Wallets" accessibilityHint="Choose where the money comes from and where it goes, then review the transfer." accessibilityState={{ disabled: transferDisabled }} disabled={transferDisabled} onPress={openTransfer} style={({ pressed }) => [styles.transferAction, (pressed || transferDisabled) && { opacity: 0.7 }]}>
        <View style={styles.transferIcon}><SymbolView name={{ ios: 'arrow.left.arrow.right', android: 'swap_horiz', web: 'swap_horiz' }} size={24} tintColor={C.onAccent} accessible={false} /></View>
        <View style={styles.transferText}><Text style={styles.transferTitle}>Transfer Money</Text><Text style={ui.caption}>From one wallet to another</Text></View>
        <Text accessible={false} style={styles.chevron}>›</Text>
      </Pressable>
    </>}
    {loading || error || !balances ? <ReadState loading={loading} error={error} retry={() => void reload()} /> : <>
      {!showHidden && balances.generalCentavos !== 0 && <View style={ui.row}><Text style={ui.body}>Unassigned Money</Text><Text style={ui.heading}>{formatCentavos(balances.generalCentavos)}</Text></View>}
      {!showHidden && <View style={styles.titleRow}>
        <Text accessibilityRole="header" style={ui.heading}>Your Wallets</Text>
        {balances.wallets.filter(w => !w.hidden && w.id !== 'wallet-cash').length > 1 &&
          <Pressable accessibilityRole="button" accessibilityLabel="Arrange Wallets" onPress={() => router.push('/arrange-wallets')} style={styles.addWallet}>
            <Text style={styles.addWalletLabel}>Arrange</Text>
          </Pressable>}
      </View>}
      {visibleWallets.map(wallet => <View key={wallet.id} style={[styles.wallet, !wallet.included && styles.excluded]}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Open ${wallet.name}. ${wallet.configured ? `${formatCentavos(wallet.balanceCentavos)} recorded balance` : 'Starting balance not set'}. ${wallet.included ? 'Included in' : 'Excluded from'} Total Budget${wallet.hidden ? '. Hidden' : ''}`} accessibilityHint="View activity, adjust balance or manage this wallet." onPress={() => router.push({ pathname: '/wallets/[id]', params: { id: wallet.id } })} style={({ pressed }) => [styles.walletDetails, pressed && { opacity: 0.75 }]}>
        <View style={styles.walletHeading}>
          <View style={styles.walletIcon}><SymbolView name={wallet.id === 'wallet-cash' ? { ios: 'banknote', android: 'payments', web: 'payments' } : { ios: 'wallet.pass', android: 'account_balance_wallet', web: 'account_balance_wallet' }} size={20} tintColor={C.accent} accessible={false} /></View>
          <Text style={styles.walletName}>{wallet.name}</Text>
          <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={20} tintColor={C.muted} accessible={false} />
        </View>
        {wallet.configured && <View style={styles.balanceRow}>
          <Text style={[styles.walletMoney, wallet.balanceCentavos < 0 && styles.negative]}>{formatCentavos(wallet.balanceCentavos)}</Text>
          <View style={[styles.badge, !wallet.included && styles.excludedBadge]}><Text style={[styles.badgeLabel, !wallet.included && styles.excludedBadgeLabel]}>{wallet.included ? 'Included' : 'Excluded'}</Text></View>
        </View>}
        {wallet.hidden && <Text style={ui.caption}>Hidden from new entries</Text>}
        </Pressable>
        {!wallet.configured && <View style={styles.setupRow}>
          <Pressable accessibilityRole="button" accessibilityLabel={`Set Starting Balance For ${wallet.name}`} onPress={() => router.push({ pathname: '/wallets/[id]', params: { id: wallet.id, setup: 'entry' } })} style={({ pressed }) => [styles.setupAction, pressed && { opacity: 0.65 }]}><Text style={styles.setupLabel}>Set Balance</Text></Pressable>
          <View style={[styles.badge, !wallet.included && styles.excludedBadge]}><Text style={[styles.badgeLabel, !wallet.included && styles.excludedBadgeLabel]}>{wallet.included ? 'Included' : 'Excluded'}</Text></View>
        </View>}
      </View>)}
      {!visibleWallets.length && <Text style={ui.body}>{showHidden ? 'No hidden wallets.' : 'No visible wallets. Add one or restore a hidden wallet.'}</Text>}
      <View style={styles.hiddenControls}>
        {hiddenCount > 0 && <Text style={ui.caption}>{hiddenCount} hidden wallet{hiddenCount === 1 ? '' : 's'} still count{hiddenCount === 1 ? 's' : ''} in Total Budget.</Text>}
        <BulsaButton secondary title={showHidden ? 'Show Visible Wallets' : 'Manage Hidden Wallets'} onPress={() => setShowHidden(value => !value)} />
      </View>
    </>}
  </BulsaScreen>;
}

const createStyles = (C: BulsaColors) => StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  addWallet: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 8, marginRight: -8, borderRadius: 12 },
  addWalletLabel: { color: C.accent, fontSize: 16, fontWeight: '600' },
  summary: { backgroundColor: C.summary, borderRadius: 24, padding: 20, gap: 4 },
  summaryLabel: { color: C.onSummary, fontSize: 16 },
  summaryMoney: { color: C.onSummary, fontSize: 32, fontWeight: '700', flexShrink: 1 },
  summaryCaption: { color: C.summaryMuted, fontSize: 14, lineHeight: 21, flexShrink: 1 },
  infoAction: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', marginRight: -12, marginTop: -12 },
  transferAction: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 72, padding: 12, borderRadius: 18, backgroundColor: C.soft, borderWidth: 1, borderColor: C.track },
  transferIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: C.accent },
  transferText: { flex: 1, minWidth: 0, gap: 4 },
  transferTitle: { color: C.text, fontSize: 18, fontWeight: '600' },
  chevron: { color: C.accent, fontSize: 28 },
  wallet: { backgroundColor: C.surface, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: C.track },
  walletDetails: { padding: 16, gap: 10, minHeight: 64 },
  excluded: { backgroundColor: C.excluded, borderColor: C.track },
  walletHeading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  walletIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: C.soft },
  walletName: { color: C.text, fontSize: 18, fontWeight: '600', flexGrow: 1, flexShrink: 1, flexBasis: 120 },
  balanceRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: C.soft },
  badgeLabel: { color: C.accent, fontSize: 12, fontWeight: '500' },
  excludedBadge: { backgroundColor: C.track },
  excludedBadgeLabel: { color: C.text },
  walletMoney: { color: C.text, fontSize: 24, fontWeight: '600', flexShrink: 1 },
  negative: { color: C.warning },
  setupRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 16, gap: 8 },
  setupAction: { minHeight: 48, paddingHorizontal: 16, paddingVertical: 10, justifyContent: 'center', borderRadius: 16, backgroundColor: C.soft, borderWidth: 1, borderColor: C.accent },
  setupLabel: { color: C.accent, fontSize: 16, fontWeight: '600' },
  hiddenControls: { gap: 8 },
});
