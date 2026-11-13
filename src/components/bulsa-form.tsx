import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import type { BulsaColors } from '../constants/bulsa';
import { useBulsaStyles, useBulsaTheme } from '../hooks/use-bulsa-theme';
import { BulsaButton } from './bulsa-button';

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const ui = useUI();
  const { colors: C } = useBulsaTheme();
  return <View style={ui.card}><Text style={ui.caption}>{label}</Text><TextInput accessibilityLabel={label} placeholderTextColor={C.muted} {...props} style={[ui.input, props.style]} /></View>;
}
export function BackButton({ disabled = false, onPress, title = '‹ Back' }: { disabled?: boolean; onPress?: () => void; title?: string }) {
  const ui = useUI();
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress ?? (() => router.canGoBack() ? router.back() : router.replace('/'))} style={({ pressed }) => [ui.back, (pressed || disabled) && { opacity: 0.65 }]}><Text style={ui.backLabel}>{title}</Text></Pressable>;
}
export function ReadState({ loading, error, retry }: { loading: boolean; error: string; retry: () => void }) {
  const ui = useUI();
  return <View style={ui.card}><Text accessibilityLiveRegion="polite" style={error ? ui.error : ui.body}>{loading ? 'Reading your records…' : error}</Text>{!loading && error ? <BulsaButton title="Try Again" onPress={retry} /> : null}</View>;
}
export function useUI() { return useBulsaStyles(createStyles); }
const createStyles = (C: BulsaColors) => StyleSheet.create({
  back: { minHeight: 48, minWidth: 48, alignSelf: 'flex-start', justifyContent: 'center', paddingHorizontal: 12, marginLeft: -12, borderRadius: 12 },
  backLabel: { color: C.accent, fontSize: 16, fontWeight: '600', flexShrink: 1 },
  title: { color: C.text, fontSize: 28, fontWeight: '700' },
  heading: { color: C.text, fontSize: 20, fontWeight: '600' },
  body: { color: C.text, fontSize: 16, lineHeight: 24 },
  caption: { color: C.muted, fontSize: 14, lineHeight: 21 },
  error: { color: C.warning, fontSize: 16, lineHeight: 24 },
  card: { backgroundColor: C.surface, borderRadius: 20, padding: 18, gap: 8 },
  soft: { backgroundColor: C.soft, borderRadius: 20, padding: 18, gap: 8 },
  input: { color: C.text, fontSize: 18, minHeight: 48, paddingVertical: 8, paddingHorizontal: 0 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center' },
  money: { color: C.text, fontSize: 30, fontWeight: '700' },
  choice: { minHeight: 48, padding: 14, borderRadius: 14, backgroundColor: C.surface, justifyContent: 'center' },
  selected: { backgroundColor: C.selected },
});
