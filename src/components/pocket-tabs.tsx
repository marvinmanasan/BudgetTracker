import { Tabs } from "expo-router";
import { Text } from "react-native";
import { PocketColors } from "@/constants/pocket";

export default function PocketTabs() {
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: PocketColors.accent,
      tabBarInactiveTintColor: PocketColors.muted,
      tabBarStyle: { backgroundColor: PocketColors.surface, borderTopWidth: 0 },
      tabBarLabelStyle: { fontSize: 12 },
      sceneStyle: { backgroundColor: PocketColors.background },
    }}>
      <Tabs.Screen name="index" options={{ title: "Overview", tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 24 }}>⌂</Text> }} />
      <Tabs.Screen name="budgets" options={{ title: "Budgets", tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 24 }}>≡</Text> }} />
      <Tabs.Screen name="activity" options={{ title: "Activity", tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 24 }}>↔</Text> }} />
      <Tabs.Screen name="explore" options={{ href: null }} />
    </Tabs>
  );
}
