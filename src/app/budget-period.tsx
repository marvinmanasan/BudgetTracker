import { useState, useCallback, useRef } from 'react';
import { BackHandler, Text, View } from 'react-native';
import { useCanGoBack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { BulsaScreen } from '../components/bulsa-screen';
import { BackButton, Field, ReadState, useUI } from '../components/bulsa-form';
import { BulsaButton } from '../components/bulsa-button';
import { CenteredPopup } from '../components/centered-popup';
import { useBudgetPeriods } from '../hooks/use-budget-periods';
import { useLedger, useSaveAction } from '../hooks/use-ledger';
import { deleteBudgetPeriod, saveBudgetPeriod } from '../storage/budget-periods';
import { periodSpending, PLAN_NAME_MAX_LENGTH, validatePlanName, type BudgetPeriod } from '../lib/budget-periods';
import { localDate } from '../lib/validation';
import { displayDate, parseDisplayDate } from '../lib/display-date';
import { formatCentavos, spendingPlanResult } from '../lib/money';
import { useCurrentDate } from '../hooks/use-current-date';
import { parseBalance, newRecordId } from '../lib/form-money';
import { centavosInput } from '../lib/editing';
import { BudgetCalendar } from '../components/budget-calendar';

export default function BudgetPeriodScreen() {
  const { period } = useLocalSearchParams<{ period?: string }>();
  const state = useBudgetPeriods();
  if (!state.loaded) return <BulsaScreen header={<BackButton />}><ReadState loading={state.loading} error={state.error} retry={() => void state.reload()} /></BulsaScreen>;
  const original = state.periods.find(row => row.id === period);
  if (period && !original) return <BulsaScreen header={<BackButton />}><Text>That spending plan is no longer available.</Text></BulsaScreen>;
  return <PeriodForm key={period ?? 'new'} original={original} periods={state.periods} sourceLoading={state.loading} sourceError={state.error} retry={() => void state.reload()} />;
}

function PeriodForm({ original: source, periods, sourceLoading, sourceError, retry }: {
  original?: BudgetPeriod; periods: BudgetPeriod[]; sourceLoading: boolean; sourceError: string; retry: () => void;
}) {
  const [original] = useState(source);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const ui = useUI();
  const today = useCurrentDate();
  const router = useRouter();
  const canGoBack = useCanGoBack();
  const [id] = useState(() => original?.id ?? newRecordId('budget'));
  const [title, setTitle] = useState(original?.title ?? 'Spending Plan');
  const [amount, setAmount] = useState(original ? centavosInput(original.limitCentavos) : '');
  const [start, setStart] = useState(displayDate(original?.startDate ?? localDate()));
  const [end, setEnd] = useState(displayDate(original?.endDate ?? localDate()));
  const [review, setReview] = useState<BudgetPeriod | null>(null);
  const [validation, setValidation] = useState('');
  const [dateIssues, setDateIssues] = useState<{ start?: string; end?: string }>({});
  const [baseline] = useState(() => ({ title, amount, start, end }));
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const writing = useRef(false);
  const ledger = useLedger();
  const { busy, error, run } = useSaveAction();
  const dirty = title !== baseline.title || amount !== baseline.amount || start !== baseline.start || end !== baseline.end;
  const exit = () => { if (!writing.current && !busy) { if (canGoBack) router.back(); else router.replace('/budgets'); } };
  const leave = useCallback(() => {
    if (busy || writing.current) return;
    if (confirmDelete) { setConfirmDelete(false); return; }
    if (confirmDiscard) { setConfirmDiscard(false); return; }
    if (review) { setReview(null); return; }
    if (dirty) setConfirmDiscard(true);
    else if (canGoBack) router.back();
    else router.replace('/budgets');
  }, [busy, confirmDelete, confirmDiscard, review, dirty, canGoBack, router]);
  useFocusEffect(useCallback(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { leave(); return true; });
    return () => sub.remove();
  }, [leave]));
  async function commit(work: () => Promise<void>, onSuccess: () => void) {
    if (writing.current || busy) return;
    writing.current = true;
    try { if (await run(work)) onSuccess(); }
    finally { writing.current = false; }
  }
  const blocked = sourceLoading || !!sourceError || busy || ledger.loading || !!ledger.error || !ledger.data;
  let spent: number | null = null;
  let calculationError = '';
  try { if (review && ledger.data) spent = periodSpending(ledger.data, review); }
  catch (cause) { calculationError = cause instanceof Error ? cause.message : 'Could not calculate spending.'; }
  function prepare() {
    const issues: { start?: string; end?: string } = {};
    let startDate = '', endDate = '';
    try { startDate = parseDisplayDate(start); }
    catch (cause) { issues.start = cause instanceof Error ? cause.message : 'Check the start date.'; }
    try { endDate = parseDisplayDate(end); }
    catch (cause) { issues.end = cause instanceof Error ? cause.message : 'Check the end date.'; }
    if (startDate && endDate) {
      if (endDate < startDate) issues.end = `Choose ${displayDate(startDate)} or later.`;
      else {
        const overlap = periods.find(row => row.id !== id && row.startDate <= endDate && row.endDate >= startDate);
        if (overlap) issues.end = `These dates overlap ${overlap.title} (${displayDate(overlap.startDate)} – ${displayDate(overlap.endDate)}). Choose dates outside that plan.`;
      }
    }
    setDateIssues(issues);
    setValidation('');
    if (issues.start || issues.end) return;
    try {
      const limitCentavos = parseBalance(amount);
      if (limitCentavos === null || limitCentavos < 0) throw new Error('Enter a limit of zero or more, with up to two decimal places.');
      const planTitle = title === original?.title ? title : title.trim();
      validatePlanName(planTitle, original?.title);
      setReview({ id, title: planTitle, startDate, endDate, limitCentavos });
      setValidation('');
    } catch (cause) { setValidation(cause instanceof Error ? cause.message : 'Check the plan details.'); }
  }
  async function save() {
    if (!review || blocked || calculationError) return;
    await commit(() => saveBudgetPeriod(review, original), () => {
      if (canGoBack) router.back();
      else router.replace({ pathname: '/budgets', params: { period: id } });
    });
  }
  function changeStart(value: string) { setStart(value); setDateIssues({}); }
  function changeEnd(value: string) { setEnd(value); setDateIssues({}); }
  if (confirmDelete && original) return <BulsaScreen header={<BackButton disabled={busy} onPress={leave} />}>
    <Text style={ui.title}>Delete this plan?</Text>
    <Text style={ui.heading}>{original.title}</Text>
    <Text style={ui.caption}>{displayDate(original.startDate)} – {displayDate(original.endDate)}</Text>
    <Text style={ui.body}>This removes the spending limit for these dates. Your expenses and wallet balances stay the same.</Text>
    {!!error && <Text accessibilityLiveRegion="polite" style={ui.error}>{error}</Text>}
    <BulsaButton title="Keep Plan" disabled={busy} onPress={() => setConfirmDelete(false)} />
    <BulsaButton destructive title={busy ? 'Deleting…' : 'Delete Plan'} disabled={busy} onPress={async () => {
      await commit(() => deleteBudgetPeriod(original), () => router.replace({ pathname: '/budgets', params: { period: 'auto' } }));
    }} />
  </BulsaScreen>;
  return <BulsaScreen header={<BackButton disabled={busy} onPress={leave} />}>
    <Text style={ui.title}>{review ? 'Review Spending Plan' : original ? 'Edit Spending Plan' : 'Set a Spending Limit'}</Text>
    {(sourceLoading || sourceError) && <ReadState loading={sourceLoading} error={sourceError} retry={retry} />}
    {ledger.loading || ledger.error ? <ReadState loading={ledger.loading} error={ledger.error} retry={() => void ledger.reload()} /> : null}
    {review ? <>
      <View style={ui.card}>
        <Text style={ui.heading}>{review.title}</Text>
        <Text style={ui.body}>{displayDate(review.startDate)} – {displayDate(review.endDate)}</Text>
        <Text style={ui.body}>Spending Limit · {formatCentavos(review.limitCentavos)}</Text>
        {spent !== null && !blocked && !calculationError && <><Text style={ui.body}>{formatCentavos(spent)} already spent during these dates</Text><Text style={ui.heading}>{spendingPlanResult(review.limitCentavos - spent, today > review.endDate)}</Text></>}
        {!!calculationError && <Text style={ui.error}>{calculationError}</Text>}
      </View>
      <Text style={ui.caption}>Expenses on both dates count, including expenses already recorded. Income, transfers and savings do not count toward spending.</Text>
      <BulsaButton title={busy ? 'Saving…' : 'Save Spending Plan'} disabled={blocked || !!calculationError} onPress={() => void save()} />
      <BulsaButton secondary title="Change Details" disabled={busy} onPress={() => setReview(null)} />
    </> : <>
      <View style={[ui.card, { gap: 12 }]}>
        <Field grouped label="Plan Name" value={title} onChangeText={setTitle} editable={!busy} maxLength={Math.max(PLAN_NAME_MAX_LENGTH, original?.title.length ?? 0)} />
        {title.length > PLAN_NAME_MAX_LENGTH && <Text style={ui.caption}>This older name is long. Shorten it to {PLAN_NAME_MAX_LENGTH} characters or fewer when renaming.</Text>}
        <Field grouped label="Spending Limit (PHP)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" editable={!busy} placeholder="0.00" />
      </View>
      <View style={[ui.card, { gap: 12 }]}>
        <Field grouped label="Start Date (MM-DD-YYYY)" value={start} issue={dateIssues.start} onChangeText={changeStart} editable={!busy} maxLength={10}
          action={<BudgetCalendar label="Choose Start Date" value={start} disabled={busy} onChange={changeStart} />} />
        <Field grouped label="End Date (MM-DD-YYYY)" value={end} issue={dateIssues.end} onChangeText={changeEnd} editable={!busy} maxLength={10}
          action={<BudgetCalendar label="Choose End Date" value={end} disabled={busy} onChange={changeEnd} />} />
      </View>
      {!!(dateIssues.start || dateIssues.end) && <Text accessibilityLiveRegion="polite" style={ui.error}>Check the dates above, then review your plan again.</Text>}
      <BulsaButton title="Review Spending Plan" disabled={blocked} onPress={prepare} />
    </>}
    {!!validation && <Text accessibilityLiveRegion="polite" style={ui.error}>{validation}</Text>}
    {!!error && <Text accessibilityLiveRegion="polite" style={ui.error}>{error}</Text>}
    <View style={ui.row}>
      <BulsaButton secondary title="Cancel" disabled={busy} onPress={leave} />
      {original && !review && <BulsaButton destructive title="Delete Plan" disabled={busy || sourceLoading || !!sourceError} onPress={() => setConfirmDelete(true)} />}
    </View>
    {confirmDiscard && <CenteredPopup onClose={() => setConfirmDiscard(false)}>
      <Text style={ui.heading}>Discard Changes?</Text>
      <Text style={ui.body}>Your plan changes haven’t been saved.</Text>
      <BulsaButton title="Keep Editing" onPress={() => setConfirmDiscard(false)} />
      <BulsaButton destructive title="Discard Changes" onPress={exit} />
    </CenteredPopup>}
  </BulsaScreen>;
}
