import { useState } from 'react';
import { Text } from 'react-native';
import { CenteredPopup } from './centered-popup';
import { Field, useUI } from './bulsa-form';
import { PocketButton } from './pocket-button';
import { useSaveAction } from '../hooks/use-ledger';
import { centavosInput } from '../lib/editing';
import { displayDate, parseDisplayDate } from '../lib/display-date';
import { formatCentavos, parseAmountToCentavos } from '../lib/money';
import { deleteSavingsContribution, updateSavingsContribution, type SavingsContribution } from '../storage/savings';

export function SavingsCorrectionPopup({ record, mode, onClose, onSaved }: { record: SavingsContribution; mode: 'edit' | 'delete'; onClose: () => void; onSaved: () => void }) {
  const ui = useUI();
  const [original] = useState(() => ({ ...record }));
  const [amount, setAmount] = useState(() => centavosInput(original.amountCentavos));
  const [date, setDate] = useState(() => displayDate(original.date));
  const [note, setNote] = useState(original.note);
  const [validation, setValidation] = useState('');
  const [review, setReview] = useState<SavingsContribution | null>(null);
  const { busy, error, run } = useSaveAction();
  const deleting = mode === 'delete';
  function prepareReview() {
    const amountCentavos = parseAmountToCentavos(amount);
    if (amountCentavos === null) { setValidation('Enter an amount above zero with up to two decimal places.'); return; }
    try {
      const iso = parseDisplayDate(date);
      setReview({ ...original, amountCentavos, date: iso, note });
      setValidation('');
    } catch (cause) { setValidation((cause as Error).message); }
  }
  async function confirm() {
    if (!deleting && !review) return;
    const saved = await run(() => {
      if (deleting) return deleteSavingsContribution(original);
      if (review) return updateSavingsContribution(review, original);
      return Promise.resolve(false);
    });
    if (saved) onSaved();
  }
  function details(value: SavingsContribution) {
    return <><Text style={ui.heading}>{formatCentavos(value.amountCentavos)}</Text><Text style={ui.body}>{displayDate(value.date)}</Text><Text style={ui.body}>{value.note || 'No note'}</Text></>;
  }
  return <CenteredPopup busy={busy} onClose={onClose} stepKey={deleting ? 'delete' : review ? 'review' : 'edit'}>
    <Text style={ui.title}>{deleting ? 'Delete This Savings Record?' : review ? 'Review Savings Correction' : 'Edit Savings Record'}</Text>
    {deleting ? <>{details(original)}<Text style={ui.body}>This removes only this contribution from savings progress. Your goal and other savings records stay. This cannot be undone.</Text></> : review ? <>
      <Text style={ui.caption}>Before</Text>{details(original)}
      <Text style={ui.caption}>After</Text>{details(review)}
    </> : <>
      <Field label="Amount Saved (PHP)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" editable={!busy} />
      <Field label="Date (MM-DD-YYYY)" value={date} onChangeText={setDate} maxLength={10} editable={!busy} />
      <Field label="Note (Optional)" value={note} onChangeText={setNote} multiline editable={!busy} />
    </>}
    <Text style={ui.caption}>This does not move wallet money or change income, spending, or Total Budget.</Text>
    {!!validation && <Text accessibilityLiveRegion="polite" style={ui.error}>{validation}</Text>}
    {!!error && <Text accessibilityLiveRegion="polite" style={ui.error}>{error}</Text>}
    {deleting || review ? <PocketButton title={busy ? 'Saving…' : deleting ? 'Confirm Delete' : 'Confirm Correction'} disabled={busy} onPress={() => void confirm()} /> : <PocketButton title="Review Correction" onPress={prepareReview} disabled={busy} />}
    {!!review && <PocketButton secondary title="Back To Editing" disabled={busy} onPress={() => setReview(null)} />}
    <PocketButton secondary title="Cancel" disabled={busy} onPress={onClose} />
  </CenteredPopup>;
}
