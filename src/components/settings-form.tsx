import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { BackHandler, Text, View } from 'react-native';
import { useBulsaTheme } from '../hooks/use-bulsa-theme';
import { BulsaScreen } from './bulsa-screen';
import { BulsaButton } from './bulsa-button';
import { BackButton, Field, useUI } from './bulsa-form';
import type { AppearanceChoice } from '../lib/preferences';

export function SettingsForm() {
  const ui = useUI();
  const { preferences, saving, error, save } = useBulsaTheme();
  const [name, setName] = useState(preferences.displayName);
  const [appearance, setAppearance] = useState<AppearanceChoice>(preferences.appearance);
  const [message, setMessage] = useState('');
  useFocusEffect(useCallback(() => { const sub = BackHandler.addEventListener('hardwareBackPress', () => saving); return () => sub.remove(); }, [saving]));
  async function submit() {
    setMessage('');
    if (await save({ displayName: name.trim(), appearance })) setMessage('Settings saved.');
  }
  return <BulsaScreen header={<BackButton disabled={saving} />}>
    <Text style={ui.title}>Settings</Text>
    <Field label="Display Name (Optional)" value={name} onChangeText={value => { setName(value); setMessage(''); }} maxLength={60} editable={!saving} autoCapitalize="words" />
    <Text style={ui.heading}>Appearance</Text>
    <View style={ui.row}>{(['light', 'dark', 'system'] as const).map(choice => <BulsaButton key={choice} title={choice === 'light' ? 'Light' : choice === 'dark' ? 'Dark' : 'System'} secondary={appearance !== choice} selected={appearance === choice} disabled={saving} onPress={() => { setAppearance(choice); setMessage(''); }} />)}</View>
    <Text style={ui.caption}>Light keeps Bulsa warm and soft. System follows your device. Your choice applies when you save.</Text>
    <Text style={ui.caption}>Text size follows your device settings.</Text>
    {!!error && <Text accessibilityLiveRegion="polite" style={ui.error}>{error}</Text>}
    {!!message && <Text accessibilityLiveRegion="polite" style={ui.body}>{message}</Text>}
    <BulsaButton title={saving ? 'Saving…' : 'Save Settings'} disabled={saving} onPress={() => void submit()} />
    <View style={ui.card}><Text style={ui.heading}>Your Records</Text>
      <BulsaButton secondary title="Manage Wallets" disabled={saving} onPress={() => router.push('/wallets')} />
      <BulsaButton secondary title="Reset Selected Data" disabled={saving} onPress={() => router.push('/reset-data')} />
      <BulsaButton secondary title="Backup and Restore" disabled={saving} onPress={() => router.push('/backup')} />
    </View>
    <View style={ui.card}><Text style={ui.heading}>Privacy and Storage</Text><Text style={ui.body}>Your records and preferences are stored on this device. Bulsa does not connect to your bank or sync records between devices.</Text><Text style={ui.body}>Removing the app or clearing its data can delete your records. Bulsa does not provide cloud recovery. Keep a separate copy of important records.</Text></View>
  </BulsaScreen>;
}
