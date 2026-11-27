import { useCanGoBack, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import type { BulsaColors } from '../constants/bulsa';
import { useBulsaStyles, useBulsaTheme } from '../hooks/use-bulsa-theme';
import { BulsaButton } from './bulsa-button';

export function Field({ label, inputRef, issue, grouped, action, ...props }: TextInputProps & {
  label: string; inputRef?: React.Ref<React.ComponentRef<typeof TextInput>>; issue?: string;
  grouped?: boolean; action?: React.ReactNode;
}) {
  const ui = useUI();
  const { colors: C } = useBulsaTheme();
  const input = <TextInput ref={inputRef} accessibilityLabel={label} placeholderTextColor={C.muted} {...props}
    style={[ui.input, grouped && ui.groupedInput, props.style]} />;
  return <View style={grouped ? { gap: 4 } : ui.card}>
    <Text style={ui.caption}>{label}</Text>
    {action ? <View style={ui.fieldRow}>{input}{action}</View> : input}
    {!!issue && <Text accessibilityLiveRegion="polite" style={ui.error}>{issue}</Text>}
  </View>;
}
export function BackButton({ disabled = false, onPress, title = '‹ Back' }: { disabled?: boolean; onPress?: () => void; title?: string }) {
  const router = useRouter();
  const canGoBack = useCanGoBack();
  const ui = useUI();
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress ?? (() => canGoBack ? router.back() : router.replace('/'))} style={({ pressed }) => [ui.back, (pressed || disabled) && { opacity: 0.65 }]}><Text style={ui.backLabel}>{title}</Text></Pressable>;
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
  input: { borderBottomWidth: 1, borderBottomColor: C.track, color: C.text, fontSize: 18, minHeight: 48, paddingVertical: 8, paddingHorizontal: 0 },
  groupedInput: { borderWidth: 1, borderColor: C.track, borderRadius: 10, paddingHorizontal: 12, flexGrow: 1, minWidth: 130 },
  fieldRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center' },
  money: { color: C.text, fontSize: 30, fontWeight: '700' },
  choice: { minHeight: 48, padding: 14, borderRadius: 14, backgroundColor: C.soft, borderWidth: 1, borderColor: C.track, justifyContent: 'center' },
  selected: { backgroundColor: C.selected },
});
