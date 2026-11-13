import { useBulsaTheme } from '@/hooks/use-bulsa-theme';
import { Tabs } from "expo-router";
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


export default function BulsaTabs() {
  const { colors: LightColors, dark } = useBulsaTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: dark ? LightColors.onAccent : LightColors.text,
      tabBarInactiveTintColor: LightColors.muted,
      tabBarHideOnKeyboard: true,
      tabBarStyle: { backgroundColor: LightColors.surface, borderTopWidth: 0, elevation: 0, shadowOpacity: 0, height: 76 + insets.bottom, paddingTop: 8, paddingBottom: insets.bottom + 8, paddingHorizontal: 16 },
      tabBarLabelStyle: { fontSize: 12, fontWeight: '600', marginTop: 4, marginBottom: 4 },
      tabBarIconStyle: { marginTop: 4 },
      tabBarActiveBackgroundColor: dark ? LightColors.accent : LightColors.selected,
      tabBarItemStyle: { borderRadius: 16, overflow: 'hidden', marginHorizontal: 4 },
      sceneStyle: { backgroundColor: LightColors.background },
    }}>
      <Tabs.Screen name="index" options={{ title: "Overview", tabBarIcon: ({ focused }) => <Image source={require('../../assets/icons/overview.svg')} tintColor={focused ? (dark ? LightColors.onAccent : LightColors.text) : LightColors.muted} contentFit="contain" style={{ width: 24, height: 24 }} accessible={false} /> }} />
      <Tabs.Screen name="budgets" options={{ title: "Budgets", tabBarIcon: ({ focused }) => <Image source={require('../../assets/icons/budgets.svg')} tintColor={focused ? (dark ? LightColors.onAccent : LightColors.text) : LightColors.muted} contentFit="contain" style={{ width: 24, height: 24 }} accessible={false} /> }} />
      <Tabs.Screen name="activity" options={{ title: "Activity", tabBarIcon: ({ focused }) => <Image source={require('../../assets/icons/activity.svg')} tintColor={focused ? (dark ? LightColors.onAccent : LightColors.text) : LightColors.muted} contentFit="contain" style={{ width: 24, height: 24 }} accessible={false} /> }} />
    </Tabs>
  );
}
