import { DefaultTheme, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import PocketTabs from '@/components/pocket-tabs';

export default function TabLayout() {
  return (
    <ThemeProvider value={DefaultTheme}>
      <StatusBar style="dark" />
      <PocketTabs />
    </ThemeProvider>
  );
}
