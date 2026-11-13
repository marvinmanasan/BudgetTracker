import { useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { EntryFields } from '../components/entry-form';
import { BulsaScreen } from '../components/bulsa-screen';
import { BackButton, ReadState, useUI } from '../components/bulsa-form';
import { useLedger } from '../hooks/use-ledger';

export default function EditEntry() {
  const ui = useUI();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const ledger = useLedger();
  const { data, loading, error, reload } = ledger;
  if (!data) return <BulsaScreen header={<BackButton />}><ReadState loading={loading} error={error} retry={() => void reload()} /></BulsaScreen>;
  const record = typeof id === 'string' ? data.transactions.find(t => t.id === id) : undefined;
  if (!record) return <BulsaScreen header={<BackButton />}><Text style={ui.body}>Transaction not found. Return to Activity.</Text></BulsaScreen>;
  return <EntryFields key={record.id} original={record} ledger={ledger} />;
}
