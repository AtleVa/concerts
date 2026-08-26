import { useCallback, useEffect, useState } from 'react';
import { fetchEvents } from '../api';

export function useConcertEvents() {
  const [data, setData] = useState({ events: [], sources: [], fetchedAt: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async (opts) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchEvents(opts);
      setData(result);
    } catch (err) {
      setError(err.message || 'Failed to load concerts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return {
    events: data.events,
    sources: data.sources,
    fetchedAt: data.fetchedAt,
    loading,
    error,
    refresh: () => load({ refresh: true }),
  };
}
