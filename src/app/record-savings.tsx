import { BulsaScreen } from '../components/bulsa-screen';
import { BackButton, ReadState } from '../components/bulsa-form';
import { SavingsForm } from '../components/savings-form';
import { useSavings } from '../hooks/use-savings';

export default function RecordSavingsScreen() {
  const state = useSavings();
  if (!state.data) return <BulsaScreen header={<BackButton />}><ReadState loading={state.loading} error={state.error} retry={() => void state.reload()} /></BulsaScreen>;
  return <SavingsForm contribution initial={state.data.goals.find(g => g.id === 'main')} loading={state.loading} readError={state.error} retry={() => void state.reload()} />;
}
