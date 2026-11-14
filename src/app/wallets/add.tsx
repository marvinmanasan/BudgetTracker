import { useBulsaTheme } from '../../hooks/use-bulsa-theme';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Switch, Text, View } from 'react-native';
import { BackButton, Field, useUI } from '../../components/bulsa-form';
import { BulsaButton } from '../../components/bulsa-button';
import { BulsaScreen } from '../../components/bulsa-screen';
import { useSaveAction } from '../../hooks/use-ledger';
import { newRecordId, parseBalance } from '../../lib/form-money';
import { duplicateWalletName, createWallet } from '../../storage/wallets';

export default function AddWallet() {
  const router = useRouter();
  const { setup } = useLocalSearchParams<{ setup?: string }>();
  const ui = useUI();
  const { colors: C, save: savePreferences } = useBulsaTheme();
  const [id] = useState(() => newRecordId('wallet'));
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [included, setIncluded] = useState(true);
  const { busy, error, run, clearError } = useSaveAction();
  async function save() {
    const saved = await run(async () => {
      const openingCentavos = parseBalance(amount);
      if (openingCentavos === null) throw new Error('Enter a starting balance with up to two decimal places. Zero is allowed.');
      await createWallet({ id, name, openingCentavos, included });
      if (setup === 'intro') await savePreferences({ onboardingComplete: true });
    });
    if (saved) router.back();
  }
  return <BulsaScreen header={<BackButton disabled={busy} />}>
    <Text style={ui.title}>Add Wallet</Text><Text style={ui.caption}>A money source you track yourself.</Text>
    <Field label="Wallet Name" value={name} onChangeText={value => { setName(value); if (error === duplicateWalletName) clearError(); }} maxLength={60} editable={!busy} placeholder="My Bank" />
    {error === duplicateWalletName && <Text style={ui.error} accessibilityLiveRegion="polite">{error}</Text>}
    <Field label="Starting Balance (PHP)" value={amount} onChangeText={setAmount} editable={!busy} keyboardType="numbers-and-punctuation" placeholder="0.00" />
    {setup === 'intro' && <Text style={ui.caption}>If you have ₱500 today, enter 500. You can also start at zero.</Text>}
    <View style={[ui.card, ui.row]}><Text style={[ui.body, { flex: 1 }]}>Include in Total Budget</Text><Switch hitSlop={12} trackColor={{ false: C.track, true: C.accent }} thumbColor={C.switchThumb} accessibilityLabel="Include in Total Budget" value={included} onValueChange={setIncluded} disabled={busy} /></View>
    {setup !== 'intro' && <View style={ui.soft}><Text style={ui.body}>Enter the balance before the transactions you will record.</Text><Text style={ui.caption}>Start at ₱1,000, then record a ₱100 expense, and ₱900 remains. Starting balance is not income.</Text></View>}
    {!!error && error !== duplicateWalletName && <Text style={ui.error} accessibilityLiveRegion="polite">{error}</Text>}
    <BulsaButton title={busy ? 'Saving…' : 'Add Wallet'} disabled={busy} onPress={() => void save()} />
  </BulsaScreen>;
}
