const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export async function fetchEvents({ refresh = false } = {}) {
  const url = `${API_BASE}/api/events${refresh ? '?refresh=1' : ''}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`API responded with ${res.status}`);
  }
  return res.json();
}
