import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { useState } from 'react';
import { Keyboard, Pressable, Text } from 'react-native';
import { displayDate, parseDisplayDate } from '../lib/display-date';
import { localDate } from '../lib/validation';
import { useBulsaTheme } from '../hooks/use-bulsa-theme';

export function BudgetCalendar({ label, value, onChange, disabled }: {
  label: string; value: string; onChange: (value: string) => void; disabled: boolean;
}) {
  const [date, setDate] = useState<Date | null>(null);
  const { dark, colors } = useBulsaTheme();
  function open() {
    let iso = localDate();
    try { iso = parseDisplayDate(value); } catch { /* Start invalid typed dates at today. */ }
    const initial = new Date(0);
    initial.setFullYear(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
    initial.setHours(12, 0, 0, 0);
    Keyboard.dismiss();
    setDate(initial);
  }
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={open}
      style={{ minHeight: 48, justifyContent: 'center', paddingHorizontal: 10, borderRadius: 10, backgroundColor: colors.soft }}>
      <Text style={{ fontWeight: '600', color: colors.accent }}>Calendar</Text>
    </Pressable>
    {date && <DateTimePicker value={date} mode="date" presentation="dialog" themeVariant={dark ? 'dark' : 'light'}
      onDismiss={() => setDate(null)}
      onValueChange={(_, selected) => {
        const iso = `${String(selected.getFullYear()).padStart(4, '0')}-${String(selected.getMonth() + 1).padStart(2, '0')}-${String(selected.getDate()).padStart(2, '0')}`;
        onChange(displayDate(iso));
        setDate(null);
      }} />}
  </>;
}
