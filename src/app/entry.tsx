import { useLocalSearchParams } from 'expo-router';
import { EntryForm } from '../components/entry-form';

export default function Entry() {
  const { type } = useLocalSearchParams<{ type?: string }>();
  return <EntryForm initialType={type === 'income' ? 'income' : 'expense'} />;
}
