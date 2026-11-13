import { router, useFocusEffect, useNavigation } from 'expo-router';
import { useCallback } from 'react';
import { BackHandler, Text, View } from 'react-native';
import { useBulsaTheme } from '../hooks/use-bulsa-theme';
import { BulsaScreen } from './bulsa-screen';
import { BulsaButton } from './bulsa-button';
import { useUI } from './bulsa-form';

export function FirstUse() {
  const ui = useUI();
  const navigation = useNavigation();
  const { saving, error, save } = useBulsaTheme();
  useFocusEffect(useCallback(() => { const sub = BackHandler.addEventListener('hardwareBackPress', () => saving); return () => sub.remove(); }, [saving]));
  async function start() {
    // The parent Overview screen survives the successful introduction save.
    // Check that screen's current focus, even if this child has unmounted.
    if (await save({ onboardingComplete: true }) && navigation.isFocused()) router.push('/wallets');
  }
  return <BulsaScreen>
    <Text style={ui.title}>Welcome to Bulsa</Text><Text style={ui.body}>A little room for what matters.</Text>
    <View style={ui.card}><Text style={ui.heading}>Start With Your Wallets</Text><Text style={ui.body}>Enter the money you already have in GCash, GoTyme, MariBank, Maya, Cash, or your own wallet.</Text><Text style={ui.body}>For example, if you have ₱500 in Cash, use ₱500 as its starting balance. Starting balance is not income.</Text></View>
    <View style={ui.card}><Text style={ui.heading}>One Total Budget</Text><Text style={ui.body}>Included wallets and General make up Total Budget. A transaction with Not Specified goes to General. General can be negative.</Text></View>
    <Text style={ui.body}>Your monthly spending limit is a separate plan for spending. Setting it does not add wallet money.</Text>
    {!!error && <Text accessibilityLiveRegion="polite" style={ui.error}>{error}</Text>}
    <BulsaButton title={saving ? 'Saving…' : 'Set Up Wallets'} disabled={saving} onPress={() => void start()} />
    <BulsaButton secondary title="Set Monthly Spending Limit" disabled={saving} onPress={() => router.push('/monthly-limit')} />
  </BulsaScreen>;
}
