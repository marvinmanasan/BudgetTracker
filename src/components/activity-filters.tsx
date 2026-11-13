import { Text, View } from 'react-native';
import { useUI } from './bulsa-form';
import { MonthPicker } from './month-picker';
import { PocketButton } from './pocket-button';
import type { ActivityFilters } from '../lib/activity';

export function FilterChoices({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  const ui = useUI();
  return <View style={{ gap: 8 }}><Text style={ui.caption}>{label}</Text><View style={ui.row}>
    {['', ...options].map(option => <PocketButton key={option} selected={value === option} secondary={value !== option} title={option ? (label === 'Record Type' ? ({ expense: 'Expense', income: 'Income', transfer: 'Transfer', opening: 'Starting Balance', adjustment: 'Balance Adjustment' } as Record<string, string>)[option] : option) : 'All'} onPress={() => onChange(option)} />)}
  </View></View>;
}
export function ActivityFilterPanel({ filters, month, monthError, categories, payments, onChange, onMonth, onClear }: {
  filters: ActivityFilters; month: string; monthError: string; categories: string[]; payments: string[];
  onChange: (filters: ActivityFilters) => void; onMonth: (month: string) => void; onClear: () => void;
}) {
  const ui = useUI();
  return <View style={{ gap: 16 }}>
    <MonthPicker value={month} onChange={onMonth} allowAll />
    {!!monthError && <Text style={ui.error}>{monthError}</Text>}
    <FilterChoices label="Record Type" value={filters.type ?? ''} options={['expense','income','transfer','opening','adjustment']} onChange={value => onChange({ ...filters, type: value as ActivityFilters['type'] || undefined })} />
    <FilterChoices label="Category or Source" value={filters.category ?? ''} options={categories} onChange={value => onChange({ ...filters, category: value || undefined })} />
    {payments.some(payment => payment.trim().toLowerCase() !== 'not specified') && <FilterChoices label="Payment Method" value={filters.payment ?? ''} options={payments} onChange={value => onChange({ ...filters, payment: value || undefined })} />}
    <PocketButton secondary title="Clear All Filters" onPress={onClear} />
  </View>;
}
