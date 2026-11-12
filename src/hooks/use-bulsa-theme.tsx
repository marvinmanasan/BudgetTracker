import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { Appearance, Pressable, SafeAreaView, Text, useColorScheme, View } from 'react-native';
import { getPreferences, updatePreferences } from '../storage/preferences';
import { DEFAULT_PREFERENCES, resolveAppearance, type Preferences } from '../lib/preferences';
import { DarkColors, PocketColors, type BulsaColors } from '../constants/pocket';

type ThemeState = { colors: BulsaColors; dark: boolean; preferences: Preferences; saving: boolean; error: string; save: (patch: Partial<Preferences>) => Promise<boolean> };
const ThemeContext = createContext<ThemeState>({ colors: PocketColors, dark: false, preferences: DEFAULT_PREFERENCES, saving: false, error: '', save: async () => false });

export function BulsaThemeProvider({ children }: PropsWithChildren) {
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [error, setError] = useState(''), [loading, setLoading] = useState(true), [saving, setSaving] = useState(false);
  const alive = useRef(false), request = useRef(0), pending = useRef(false);
  const system = useColorScheme();
  const reload = useCallback(async () => {
    const version = ++request.current;
    setLoading(true); setError('');
    try { const next = await getPreferences(); if (alive.current && request.current === version) setPreferences(next); }
    catch (cause) { if (alive.current && request.current === version) setError(cause instanceof Error ? cause.message : 'Could not read settings.'); }
    finally { if (alive.current && request.current === version) setLoading(false); }
  }, []);
  useEffect(() => {
    alive.current = true;
    let active = true;
    const version = ++request.current;
    void getPreferences().then(next => { if (active && request.current === version) setPreferences(next); })
      .catch(cause => { if (active && request.current === version) setError(cause instanceof Error ? cause.message : 'Could not read settings.'); })
      .finally(() => { if (active && request.current === version) setLoading(false); });
    return () => { active = false; alive.current = false; };
  }, []);
  useEffect(() => {
    if (preferences) Appearance.setColorScheme(preferences.appearance === 'system' ? 'auto' : preferences.appearance);
  }, [preferences]);
  const dark = resolveAppearance(preferences?.appearance ?? 'light', system) === 'dark';
  const colors = dark ? DarkColors : PocketColors;
  async function save(patch: Partial<Preferences>) {
    if (pending.current || !preferences) return false;
    pending.current = true; setSaving(true); setError('');
    try { const next = await updatePreferences(patch); if (alive.current) setPreferences(next); return true; }
    catch (cause) { if (alive.current) setError(cause instanceof Error ? cause.message : 'Could not save settings.'); return false; }
    finally { pending.current = false; if (alive.current) setSaving(false); }
  }
  if (!preferences) return <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}><View style={{ padding: 24, gap: 16 }}>
    <Text style={{ color: colors.text, fontSize: 24 }}>Bulsa</Text>
    <Text accessibilityLiveRegion="polite" style={{ color: error ? colors.warning : colors.text, fontSize: 16 }}>{loading ? 'Reading your settings…' : error}</Text>
    {!loading && <Pressable accessibilityRole="button" onPress={() => void reload()} style={{ minHeight: 48, justifyContent: 'center' }}><Text style={{ color: colors.accent, fontSize: 18 }}>Try Again</Text></Pressable>}
  </View></SafeAreaView>;
  return <ThemeContext.Provider value={{ colors, dark, preferences, saving, error, save }}>{children}</ThemeContext.Provider>;
}
export function useBulsaTheme() { return useContext(ThemeContext); }
export function useBulsaStyles<T>(factory: (colors: BulsaColors) => T): T {
  const { colors } = useBulsaTheme();
  return useMemo(() => factory(colors), [factory, colors]);
}
