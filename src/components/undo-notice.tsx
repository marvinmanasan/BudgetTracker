import { Text, View } from 'react-native';
import { useTransactionUndo } from '../hooks/use-transaction-undo';
import { formatCentavos } from '../lib/money';
import { BulsaButton } from './bulsa-button';
import { useUI } from './bulsa-form';

export function UndoNotice({ onRestored }: { onRestored: () => void }) {
  const ui = useUI();
  const undo = useTransactionUndo();
  if (!undo.record && !undo.error) return null;
  return <View style={ui.soft}>
    <Text style={ui.body} accessibilityLiveRegion="polite">{undo.record ? `${undo.record.type === 'expense' ? 'Expense' : 'Income'} deleted · ${undo.record.category} · ${formatCentavos(undo.record.amountCentavos)}` : 'Delete failed'}</Text>
    {undo.record && <Text style={ui.caption}>Undo is available until dismissed or the app closes.</Text>}
    {!!undo.error && <Text style={ui.error} accessibilityLiveRegion="polite">{undo.error}</Text>}
    <View style={ui.row}>{undo.record && <BulsaButton title={undo.busy ? 'Restoring…' : 'Undo'} disabled={undo.busy} onPress={() => { void undo.undo().then(restored => { if (restored) onRestored(); }); }} />}
    <BulsaButton secondary title="Dismiss" disabled={undo.busy} onPress={undo.dismiss} /></View>
  </View>;
}
