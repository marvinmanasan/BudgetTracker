import { router, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { PocketScreen } from '../components/pocket-screen';
import { BackButton, ReadState, useUI } from '../components/bulsa-form';
import { PocketButton } from '../components/pocket-button';
import { CategoryLimitForm } from '../components/category-limit-form';
import { useCategoryPlan } from '../hooks/use-category-plan';
import { localDate } from '../lib/validation';

export default function CategoryLimits() {
  const ui = useUI();
  const { month: param } = useLocalSearchParams<{ month?: string }>();
  const month = param && /^[0-9]{4}-(0[1-9]|1[0-2])$/.test(param) && !param.startsWith('0000-') ? param : localDate().slice(0, 7);
  const state = useCategoryPlan(month);
  if (state.resolved !== month || !state.plan) return <PocketScreen header={<BackButton />}><ReadState loading={state.loading} error={state.error} retry={() => void state.reload()} /></PocketScreen>;
  if (state.plan.limitCentavos === null) return <PocketScreen header={<BackButton />}>
    <Text style={ui.title}>Category Limits</Text><Text style={ui.body}>Set a monthly spending limit before dividing it into categories.</Text>
    {(state.loading || !!state.error) && <ReadState loading={state.loading} error={state.error} retry={() => void state.reload()} />}
    <PocketButton title="Set Monthly Limit" disabled={state.loading || !!state.error} onPress={() => router.push({ pathname: '/monthly-limit', params: { month } })} />
  </PocketScreen>;
  return <CategoryLimitForm key={month} month={month} initial={state.plan} sourceError={state.error} sourceLoading={state.loading} retry={() => void state.reload()} />;
}
