import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Switch, Text, View } from 'react-native';
import { BackButton, Field, ReadState, ui } from '../../components/bulsa-form';
import { PocketButton } from '../../components/pocket-button';
import { PocketScreen } from '../../components/pocket-screen';
import { useLedger, useSaveAction } from '../../hooks/use-ledger';
import { parseBalance } from '../../lib/form-money';
import { formatCentavos } from '../../lib/money';
import { removeWallet, setOpening, setWalletFlags } from '../../storage/wallets';

export default function WalletDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { balances, data, loading, error: readError, reload } = useLedger();
  const { busy, error, run } = useSaveAction();
  const [amount, setAmount] = useState('');
  const [secondary, setSecondary] = useState(false);
  const wallet = balances?.wallets.find(w => w.id === id);
  const used = data && (data.changes.some(c => c.walletId === id) || data.transactions.some(t => t.walletId === id) || data.transfers.some(t => t.fromWalletId === id || t.toWalletId === id));
  async function opening() {
    await run(async () => {
      const value = parseBalance(amount);
      if (value === null) throw new Error('Enter a starting balance. Zero is allowed.');
      await setOpening(id, value); await reload();
    });
  }
  async function flags(value: { included?: boolean; hidden?: boolean }) {
    await run(async () => { await setWalletFlags(id, value); await reload(); });
  }
  function confirmDelete() {
    Alert.alert('Delete unused wallet?', 'Only a wallet with no history can be deleted. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { void (async () => { if (await run(() => removeWallet(id))) router.back(); })(); } },
    ]);
  }
  return <PocketScreen>
    <BackButton disabled={busy} />
    {loading || readError ? <ReadState loading={loading} error={readError} retry={() => void reload()} /> : !wallet ? <Text style={ui.body}>Wallet not found.</Text> : <>
      <Text style={ui.title}>{wallet.name}</Text>
      <View style={ui.card}><Text style={ui.caption}>Recorded balance</Text><Text style={wallet.balanceCentavos < 0 ? [ui.money, ui.error] : ui.money}>{wallet.configured ? formatCentavos(wallet.balanceCentavos) : 'Not set'}</Text>
        {wallet.balanceCentavos < 0 && <Text style={ui.error}>This recorded balance is negative. Check past entries or record missing funding.</Text>}
      </View>
      {!wallet.configured && <>
        <Field label="Starting balance (PHP)" keyboardType="numbers-and-punctuation" value={amount} onChangeText={setAmount} editable={!busy} placeholder="0.00" />
        <Text style={ui.caption}>Use the balance before the entries you will record. Start at ₱1,000, record a ₱100 expense, and ₱900 remains. Starting balance is not income.</Text>
        <PocketButton title={busy ? 'Saving…' : 'Save starting balance'} disabled={busy} onPress={() => void opening()} />
      </>}
      <View style={[ui.card, ui.row]}><Text style={[ui.body, { flex: 1 }]}>Include in total balance</Text><Switch hitSlop={12} trackColor={{ false: '#EADFD5', true: '#8A533A' }} thumbColor="#FFFFFF" accessibilityLabel="Include in total balance" disabled={busy} value={wallet.included} onValueChange={included => void flags({ included })} /></View>
      <Text style={ui.caption}>Inclusion changes the total shown. Your records stay unchanged.</Text>
      <PocketButton secondary title="View wallet activity" onPress={() => router.push({ pathname: '/activity', params: { wallet: id } })} disabled={busy} />
      <PocketButton secondary title={wallet.hidden ? 'Restore wallet' : 'Hide wallet'} disabled={busy} onPress={() => void flags({ hidden: !wallet.hidden })} />
      <Text style={ui.caption}>{wallet.hidden ? 'Hidden from new transaction choices.' : 'Hide wallets you do not use.'} {wallet.included ? 'Its balance still counts in Total balance when hidden.' : 'Its balance is not included in Total balance.'}</Text>
      <PocketButton secondary title={secondary ? 'Fewer options' : 'More wallet options'} disabled={busy} onPress={() => setSecondary(value => !value)} />
      {secondary && <View style={ui.card}><Text style={ui.caption}>Only a zero-balance wallet with no history, including a starting balance, can be deleted. Otherwise, use Hide.</Text><PocketButton title="Delete unused wallet" disabled={busy || !!used} onPress={confirmDelete} /></View>}
    </>}
    {!!error && <Text style={ui.error} accessibilityLiveRegion="polite">{error}</Text>}
  </PocketScreen>;
}
