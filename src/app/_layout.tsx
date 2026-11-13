import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { BulsaThemeProvider, useBulsaTheme } from '@/hooks/use-bulsa-theme';

function Navigation() {
  const { colors: LightColors, dark } = useBulsaTheme();
  const base = dark ? DarkTheme : DefaultTheme;
  const navigationTheme = {
    ...base,
    colors: {
      ...base.colors,
      background: LightColors.background,
      card: LightColors.surface,
      text: LightColors.text,
      primary: LightColors.accent,
      border: LightColors.track,
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
