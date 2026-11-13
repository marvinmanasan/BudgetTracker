import { useBulsaTheme } from '../../hooks/use-bulsa-theme';
import { router } from 'expo-router';
import { useState } from 'react';
import { Switch, Text, View } from 'react-native';
import { BackButton, Field, useUI } from '../../components/bulsa-form';
import { BulsaButton } from '../../components/bulsa-button';
import { BulsaScreen } from '../../components/bulsa-screen';
import { useSaveAction } from '../../hooks/use-ledger';
import { newRecordId, parseBalance } from '../../lib/form-money';
import { createWallet } from '../../storage/wallets';

export default function AddWallet() {
  const ui = useUI();
  const { colors: C } = useBulsaTheme();
  const [id] = useState(() => newRecordId('wallet'));
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [included, setIncluded] = useState(true);
  const { busy, error, run } = useSaveAction();
  async function save() {
    const saved = await run(async () => {
      const openingCentavos = parseBalance(amount);
      if (openingCentavos === null) throw new Error('Enter a starting balance with up to two decimal places. Zero is allowed.');
      await createWallet({ id, name, openingCentavos, included });
    });
    if (saved) router.back();
  }
  return <BulsaScreen header={<BackButton disabled={busy} />}>
    <Text style={ui.title}>Add Wallet</Text><Text style={ui.caption}>A money source you track yourself.</Text>
    <Field label="Wallet Name" value={name} onChangeText={setName} maxLength={60} editable={!busy} placeholder="My Bank" />
    <Field label="Starting Balance (PHP)" value={amount} onChangeText={setAmount} editable={!busy} keyboardType="numbers-and-punctuation" placeholder="0.00" />
    <View style={[ui.card, ui.row]}><Text style={[ui.body, { flex: 1 }]}>Include in Total Budget</Text><Switch hitSlop={12} trackColor={{ false: C.track, true: C.accent }} thumbColor={C.switchThumb} accessibilityLabel="Include in Total Budget" value={included} onValueChange={setIncluded} disabled={busy} /></View>
    <View style={ui.soft}><Text style={ui.body}>Enter the balance before the transactions you will record.</Text><Text style={ui.caption}>Start at ₱1,000, then record a ₱100 expense, and ₱900 remains. Starting balance is not income.</Text></View>
    {!!error && <Text style={ui.error} accessibilityLiveRegion="polite">{error}</Text>}
    <BulsaButton title={busy ? 'Saving…' : 'Add Wallet'} disabled={busy} onPress={() => void save()} />
  </BulsaScreen>;
}
