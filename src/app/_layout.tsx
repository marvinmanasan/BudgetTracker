import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { BulsaThemeProvider, useBulsaTheme } from '@/hooks/use-bulsa-theme';

function Navigation() {
  const { colors: PocketColors, dark } = useBulsaTheme();
  const base = dark ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...base,
    colors: {
      ...base.colors,
      background: PocketColors.background,
      card: PocketColors.surface,
      text: PocketColors.text,
      primary: PocketColors.accent,
      border: PocketColors.track,
    },
  };
  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() { return <BulsaThemeProvider><Navigation /></BulsaThemeProvider>; }
