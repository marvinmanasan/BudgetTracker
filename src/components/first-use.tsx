import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { useBulsaTheme } from '../hooks/use-bulsa-theme';
import type { Wallet } from '../types/wallet';
import { BulsaScreen } from './bulsa-screen';
import { BulsaButton } from './bulsa-button';
import { useUI } from './bulsa-form';

export function FirstUse({ wallets }: { wallets: Wallet[] }) {
  const router = useRouter();
  const ui = useUI();
  const { saving, error, save } = useBulsaTheme();
  const visible = wallets.filter(wallet => !wallet.hidden);
  return <BulsaScreen>
    <Text style={ui.title}>Where Do You Keep Your Money?</Text>
    <Text style={ui.body}>Choose a wallet and enter what’s in it today.</Text>
    <View style={ui.card}>
      {visible.map(wallet => <BulsaButton key={wallet.id} secondary title={wallet.name} disabled={saving}
        onPress={() => router.push({ pathname: '/wallets/[id]', params: { id: wallet.id, setup: 'intro' } })} />)}
      <BulsaButton secondary title="Add Another Wallet" disabled={saving}
        onPress={() => router.push({ pathname: '/wallets/add', params: { setup: 'intro' } })} />
    </View>
    <BulsaButton secondary title="Skip for Now" disabled={saving} onPress={() => void save({ onboardingComplete: true })} />
    {!!error && <Text accessibilityLiveRegion="polite" style={ui.error}>{error}</Text>}
  </BulsaScreen>;
}
