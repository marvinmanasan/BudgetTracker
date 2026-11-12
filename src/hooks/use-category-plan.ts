import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { getCategoryPlan } from '../storage/categories';
import { ensureMonthlyLimit } from '../storage/budgets';
import { localDate } from '../lib/validation';

export function useCategoryPlan(month: string) {
  const [plan, setPlan] = useState<Awaited<ReturnType<typeof getCategoryPlan>> | null>(null);
  const [resolved, setResolved] = useState('');
  const [loading, setLoading] = useState(true), [error, setError] = useState('');
  const request = useRef(0);
  const reload = useCallback(async () => {
    const version = ++request.current; setLoading(true); setError('');
    try {
      let next = await getCategoryPlan(month);
      if (next.limitCentavos === null && month === localDate().slice(0, 7)) {
        await ensureMonthlyLimit(month);
        next = await getCategoryPlan(month);
      }
      if (version === request.current) { setPlan(next); setResolved(month); }
    } catch (cause) { if (version === request.current) setError(cause instanceof Error ? cause.message : 'Could not read category limits.'); }
    finally { if (version === request.current) setLoading(false); }
  }, [month]);
  useFocusEffect(useCallback(() => { void reload(); return () => { request.current++; }; }, [reload]));
  return { plan, loading: loading || (!error && resolved !== month), error, reload, resolved };
}
