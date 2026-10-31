import { DarkTheme, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import PocketTabs from '@/components/pocket-tabs';

export default function TabLayout() {
  return (
    <ThemeProvider value={DarkTheme}>
      <StatusBar style="light" />
      <PocketTabs />
    </ThemeProvider>
  );
}
