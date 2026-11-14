import { Image } from 'expo-image';
import { Tabs } from 'expo-router';
import { useEffect, useState, type ComponentProps } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useBulsaTheme } from '@/hooks/use-bulsa-theme';

type BarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const destinations = [
  { name: 'index', title: 'Overview', icon: require('../../assets/icons/overview.svg') },
  { name: 'wallets', title: 'Wallets', icon: require('../../assets/icons/wallets.svg') },
  { name: 'budgets', title: 'Budgets', icon: require('../../assets/icons/budgets.svg') },
  { name: 'activity', title: 'Activity', icon: require('../../assets/icons/activity.svg') },
] as const;

function AdaptiveTabBar({ state, descriptors, emitter, navigateToTab, insets }: BarProps) {
  const { colors, dark } = useBulsaTheme();
  const { width, fontScale } = useWindowDimensions();
  const [measurement, setMeasurement] = useState({ scale: 0, width: 0 });
  const [keyboardVisible, setKeyboardVisible] = useState(() => Keyboard.isVisible());
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  if (keyboardVisible) return null;

  const available = width - insets.left - insets.right - 16;
  // Overview is the widest of the four fixed labels. Measure it at the device's actual text scale.
  const labelWidth = measurement.scale === fontScale ? measurement.width : 58 * fontScale;
  const columns = available / 4 >= Math.max(48, labelWidth + 12) ? 4 : 2;
  return <View style={{ backgroundColor: colors.surface, paddingLeft: insets.left + 8, paddingRight: insets.right + 8, paddingTop: 6, paddingBottom: insets.bottom + 6 }}>
    <Text key={fontScale} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={[styles.label, styles.measure]} onLayout={({ nativeEvent }) => {
        const measured = Math.ceil(nativeEvent.layout.width);
        setMeasurement(previous => previous.scale === fontScale && previous.width === measured ? previous : { scale: fontScale, width: measured });
      }}>Overview</Text>
    <View accessibilityRole="tablist" style={styles.grid}>
      {state.routes.map((route, index) => {
        const { title = route.name, tabBarIcon } = descriptors[route.key].options;
        const focused = index === state.index;
        const color = focused ? (dark ? colors.onAccent : colors.text) : colors.muted;
        return <View key={route.key} style={{ width: columns === 4 ? '25%' : '50%', padding: 2 }}>
          <Pressable accessibilityRole="tab" accessibilityLabel={title} accessibilityState={{ selected: focused }}
            onPress={() => {
              const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigateToTab(route.key);
            }}
            onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
            style={[styles.tab, columns === 2 && styles.horizontal, focused && { backgroundColor: dark ? colors.accent : colors.selected }]}>
            {tabBarIcon?.({ focused, color, size: 24 })}
            <Text style={[styles.label, { color }]}>{title}</Text>
          </Pressable>
        </View>;
      })}
    </View>
  </View>;
}

export default function BulsaTabs() {
  const { colors, dark } = useBulsaTheme();
  return <Tabs tabBar={Platform.OS === 'web' ? undefined : props => <AdaptiveTabBar {...props} />}
    screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background },
      tabBarActiveTintColor: dark ? colors.onAccent : colors.text, tabBarInactiveTintColor: colors.muted,
      tabBarActiveBackgroundColor: dark ? colors.accent : colors.selected, tabBarStyle: { backgroundColor: colors.surface } }}>
    {destinations.map(({ name, title, icon }) => <Tabs.Screen key={name} name={name} options={{ title,
      tabBarIcon: ({ focused, size }) => <Image source={icon} tintColor={focused ? (dark ? colors.onAccent : colors.text) : colors.muted} contentFit="contain" style={{ width: size, height: size }} accessible={false} />,
    }} />)}
  </Tabs>;
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  tab: { flexGrow: 1, minHeight: 48, minWidth: 48, paddingHorizontal: 4, paddingVertical: 6, gap: 3, alignItems: 'center', justifyContent: 'center', borderRadius: 16 },
  horizontal: { flexDirection: 'row', gap: 6 },
  label: { fontSize: 12, fontWeight: '600', flexShrink: 1, textAlign: 'center' },
  measure: { position: 'absolute', left: 0, top: 0, opacity: 0 },
});
