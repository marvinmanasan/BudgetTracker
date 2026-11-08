import { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { getLedger } from '../storage/wallets';
import { deriveBalances } from '../lib/ledger';
import type { Ledger } from '../types/wallet';

export function useLedger() {
  const [data, setData] = useState<Ledger | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const request = useRef(0);
  const reload = useCallback(async () => {
    const current = ++request.current;
    setLoading(true); setError('');
    try {
      const next = await getLedger();
      if (current === request.current) setData(next);
    } catch (cause) {
      if (current === request.current) setError(cause instanceof Error ? cause.message : 'Could not read your records.');
    } finally { if (current === request.current) setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void reload(); return () => { request.current++; }; }, [reload]));
  const balances = useMemo(() => data ? deriveBalances(data) : null, [data]);
  return { data, balances, error, loading, reload };
}

export function useSaveAction() {
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function run(work: () => Promise<void | boolean>) {
    if (pending.current) return false;
    pending.current = true; setBusy(true); setError('');
    try { return await work() !== false; }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save. Your fields are still here.'); return false; }
    finally { pending.current = false; setBusy(false); }
  }
  return { busy, error, run };
}
