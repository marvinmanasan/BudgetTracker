import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { getSavings, type Savings } from '../storage/savings';

export function useSavings() {
  const [data, setData] = useState<Savings | null>(null);
  const [loading, setLoading] = useState(true), [error, setError] = useState('');
  const request = useRef(0);
  const reload = useCallback(async () => {
    const version = ++request.current;
    setLoading(true); setError('');
    try {
      const next = await getSavings();
      if (version === request.current) setData(next);
    } catch (cause) {
      if (version === request.current) setError(cause instanceof Error ? cause.message : 'Could not read savings.');
    } finally { if (version === request.current) setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void reload(); return () => { request.current++; }; }, [reload]));
  return { data, loading, error, reload };
}
