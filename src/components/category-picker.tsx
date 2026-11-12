import type { BulsaColors } from '../constants/pocket';
import { useBulsaStyles } from '../hooks/use-bulsa-theme';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { PRESET_CHOICES, type ChoiceKind, type CustomChoice } from '../lib/choices';
import { newRecordId } from '../lib/form-money';
import { addChoice, getChoices, removeChoice, renameChoice } from '../storage/choices';
import { Field, useUI } from './bulsa-form';
import { PocketButton } from './pocket-button';

type Props = { kind: ChoiceKind; value: string; onChange: (value: string) => void; disabled: boolean; onBusyChange: (busy: boolean) => void; retainedValue?: string };

export function CategoryPicker({ kind, value, onChange, disabled, onBusyChange, retainedValue }: Props) {
  const ui = useUI();
  const styles = useBulsaStyles(createStyles);
  const [custom, setCustom] = useState<CustomChoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [managing, setManaging] = useState(false);
  const [editor, setEditor] = useState<CustomChoice | 'new' | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    void getChoices(kind)
      .then(choices => { if (mounted.current) setCustom(choices); })
      .catch(cause => { if (mounted.current) setError(cause instanceof Error ? cause.message : 'Could not read your choices.'); })
      .finally(() => { if (mounted.current) setLoading(false); });
    return () => { mounted.current = false; };
  }, [kind]);

  async function run(work: () => Promise<void>) {
    if (pending.current || disabled) return;
    pending.current = true; setBusy(true); onBusyChange(true); setError('');
    try {
      await work();
      const choices = await getChoices(kind);
      if (mounted.current) setCustom(choices);
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : 'Could not save your choices. Try again.');
    } finally {
      pending.current = false;
      if (mounted.current) { setBusy(false); onBusyChange(false); }
    }
  }

  function edit(choice: CustomChoice | 'new') {
    setEditor(choice); setDraft(choice === 'new' ? '' : choice.name); setError('');
  }
  async function save() {
    if (!editor) return;
    const current = editor;
    await run(async () => {
      if (current === 'new') {
        await addChoice({ id: newRecordId('choice'), kind, name: draft });
        onChange(draft);
      } else {
        await renameChoice(current.id, kind, draft);
        if (value === current.name) onChange(draft);
      }
      setEditor(null);
    });
  }
  function confirmRemove(choice: CustomChoice) {
    Alert.alert('Remove this choice?', 'Old transactions will keep their original category names.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => void run(async () => {
        await removeChoice(choice.id, kind);
        if (value === choice.name) onChange(PRESET_CHOICES[kind][0]);
        if (editor !== 'new' && editor?.id === choice.id) setEditor(null);
      }) },
    ]);
  }
  const blocked = disabled || busy || loading;
  const options = [...PRESET_CHOICES[kind].map(name => ({ id: 'preset-' + name, name })), ...custom];
  if (retainedValue && !options.some(choice => choice.name === retainedValue)) options.push({ id: 'retained-original', name: retainedValue });
  return <View style={ui.card}>
    <Text style={ui.heading}>{kind === 'expense' ? 'Category' : 'Income Source'}</Text>
    <View style={styles.chips}>
      {options.map(choice => <Pressable key={choice.id} disabled={blocked} accessibilityRole="radio" accessibilityLabel={choice.name} accessibilityState={{ checked: value === choice.name, disabled: blocked }} onPress={() => onChange(choice.name)} style={({ pressed }) => [styles.chip, value === choice.name && styles.selected, pressed && { opacity: 0.75 }]}>
        <Text style={styles.chipText}>{value === choice.name ? '✓ ' : ''}{choice.name}</Text>
      </Pressable>)}
    </View>
    {loading && <Text style={ui.caption}>Reading your choices…</Text>}
    <View style={ui.row}>
      <PocketButton secondary title="Add Custom" disabled={blocked} onPress={() => edit('new')} />
      {custom.length > 0 && <PocketButton secondary title={managing ? 'Done Managing' : 'Manage Custom'} disabled={blocked} onPress={() => { setManaging(!managing); setEditor(null); }} />}
    </View>
    {managing && custom.map(choice => <View key={choice.id} style={styles.customRow}>
      <Text style={[ui.body, styles.customName]}>{choice.name}</Text>
      <View style={ui.row}><PocketButton secondary title="Rename" disabled={blocked} onPress={() => edit(choice)} /><PocketButton secondary title="Remove" disabled={blocked} onPress={() => confirmRemove(choice)} /></View>
    </View>)}
    {editor && <View style={styles.editor}>
      <Field label={editor === 'new' ? 'Custom Name' : 'Rename Choice'} value={draft} onChangeText={setDraft} maxLength={80} editable={!disabled && !busy} autoCapitalize="none" autoCorrect={false} />
      <View style={ui.row}><PocketButton title={busy ? 'Saving…' : 'Save Choice'} disabled={disabled || busy} onPress={() => void save()} /><PocketButton secondary title="Cancel" disabled={disabled || busy} onPress={() => setEditor(null)} /></View>
      <Text style={ui.caption}>Changing a choice does not change old transactions.</Text>
    </View>}
    {!!error && <><Text style={ui.error} accessibilityLiveRegion="polite">{error}</Text><PocketButton secondary title="Try Again" disabled={disabled || busy} onPress={() => void run(async () => {})} /></>}
  </View>;
}

const createStyles = (C: BulsaColors) => StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 48, maxWidth: '100%', paddingHorizontal: 14, paddingVertical: 12, justifyContent: 'center', borderRadius: 16, backgroundColor: C.background, borderWidth: 2, borderColor: C.track },
  selected: { backgroundColor: C.selected, borderColor: C.accent },
  chipText: { color: C.text, fontSize: 16, flexShrink: 1 },
  customRow: { gap: 8, paddingVertical: 12, borderTopWidth: 1, borderColor: C.track },
  customName: { flexShrink: 1 },
  editor: { gap: 12, paddingTop: 12, borderTopWidth: 1, borderColor: C.track },
});
