import { router } from 'expo-router';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { PocketColors as C } from '../constants/pocket';
import { PocketButton } from './pocket-button';

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return <View style={ui.card}><Text style={ui.caption}>{label}</Text><TextInput accessibilityLabel={label} placeholderTextColor={C.muted} {...props} style={[ui.input, props.style]} /></View>;
}
export function BackButton({ disabled = false }: { disabled?: boolean }) {
  return <PocketButton title="‹ Back" secondary disabled={disabled} onPress={() => router.canGoBack() ? router.back() : router.replace('/')} />;
}
export function ReadState({ loading, error, retry }: { loading: boolean; error: string; retry: () => void }) {
  return <View style={ui.card}><Text accessibilityLiveRegion="polite" style={error ? ui.error : ui.body}>{loading ? 'Reading your records…' : error}</Text>{!loading && error ? <PocketButton title="Try again" onPress={retry} /> : null}</View>;
}
export const ui = StyleSheet.create({
  title: { color: C.text, fontSize: 28, fontWeight: '700' },
  heading: { color: C.text, fontSize: 20, fontWeight: '600' },
  body: { color: C.text, fontSize: 16, lineHeight: 24 },
  caption: { color: C.muted, fontSize: 14, lineHeight: 21 },
  error: { color: C.warning, fontSize: 16, lineHeight: 24 },
  card: { backgroundColor: C.surface, borderRadius: 20, padding: 18, gap: 8 },
  soft: { backgroundColor: '#F2E4D4', borderRadius: 20, padding: 18, gap: 8 },
  input: { color: C.text, fontSize: 18, minHeight: 48, paddingVertical: 8, paddingHorizontal: 0 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center' },
  money: { color: C.text, fontSize: 30, fontWeight: '700' },
  choice: { minHeight: 48, padding: 14, borderRadius: 14, backgroundColor: C.surface, justifyContent: 'center' },
  selected: { backgroundColor: C.selected },
});
