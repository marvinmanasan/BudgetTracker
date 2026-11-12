import { useBulsaTheme } from '@/hooks/use-bulsa-theme';
import { Tabs } from "expo-router";
import { SymbolView } from 'expo-symbols';


export default function PocketTabs() {
  const { colors: PocketColors } = useBulsaTheme();
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: PocketColors.accent,
      tabBarInactiveTintColor: PocketColors.muted,
      tabBarStyle: { backgroundColor: PocketColors.surface, borderTopWidth: 0 },
      tabBarLabelStyle: { fontSize: 12 },
      tabBarActiveBackgroundColor: PocketColors.selected,
      tabBarItemStyle: { borderRadius: 16, marginHorizontal: 4 },
      sceneStyle: { backgroundColor: PocketColors.background },
    }}>
      <Tabs.Screen name="index" options={{ title: "Overview", tabBarIcon: ({ color }) => <SymbolView name={{ ios: 'house', android: 'home', web: 'home' }} tintColor={color} size={24} /> }} />
      <Tabs.Screen name="budgets" options={{ title: "Budgets", tabBarIcon: ({ color }) => <SymbolView name={{ ios: 'calendar', android: 'calendar_month', web: 'calendar_month' }} tintColor={color} size={24} /> }} />
      <Tabs.Screen name="activity" options={{ title: "Activity", tabBarIcon: ({ color }) => <SymbolView name={{ ios: 'list.bullet', android: 'receipt_long', web: 'receipt_long' }} tintColor={color} size={24} /> }} />
    </Tabs>
  );
}
