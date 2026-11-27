import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { localDate } from '../lib/validation';

// Re-evaluate plans at local midnight and when returning from the background.
export function useCurrentDate() {
  const [today, setToday] = useState(localDate);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    function refresh() {
      clearTimeout(timer);
      setToday(localDate());
      const now = new Date();
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      timer = setTimeout(refresh, Math.max(1, midnight.getTime() - now.getTime()));
    }
    refresh();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') refresh();
    });
    return () => { clearTimeout(timer); subscription.remove(); };
  }, []);
  return today;
}
