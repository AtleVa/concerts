import { useMemo, useState } from 'react';
import { useConcertEvents } from './hooks/useConcertEvents';
import EventCard from './components/EventCard';
import Filters from './components/Filters';
import SourceStatus from './components/SourceStatus';
import './App.css';

const VIEW_MODE_KEY = 'concerts:viewMode';

function getInitialViewMode() {
  if (typeof window === 'undefined') return 'grid';
  const stored = window.localStorage.getItem(VIEW_MODE_KEY);
  return stored === 'list' ? 'list' : 'grid';
}

const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat('nb-NO', { month: 'long', year: 'numeric' });

export default function App() {
  const { events, sources, fetchedAt, loading, error, refresh } = useConcertEvents();
  const [search, setSearch] = useState('');
  const [activeVenues, setActiveVenues] = useState(new Set());
  const [viewMode, setViewMode] = useState(getInitialViewMode);
  const [selectedMonth, setSelectedMonth] = useState('');

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(VIEW_MODE_KEY, mode);
    }
  };

  const venues = useMemo(
    () => [...new Set(events.map((e) => e.venue || e.sourceName))].sort(),
    [events]
  );

  const months = useMemo(() => {
    const keys = new Map();
    events.forEach((e) => {
      if (!e.date) return;
      const d = new Date(e.date);
      if (Number.isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!keys.has(key)) {
        const label = MONTH_LABEL_FORMATTER.format(d);
        keys.set(key, label.charAt(0).toUpperCase() + label.slice(1));
      }
    });
    return [...keys.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, label]) => ({ key, label }));
  }, [events]);

  const toggleVenue = (venue) => {
    setActiveVenues((prev) => {
      const next = new Set(prev);
      if (next.has(venue)) next.delete(venue);
      else next.add(venue);
      return next;
    });
  };

  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((e) => {
      const matchesSearch = !q || e.title.toLowerCase().includes(q);
      const venue = e.venue || e.sourceName;
      const matchesVenue = activeVenues.size === 0 || activeVenues.has(venue);
      let matchesMonth = true;
      if (selectedMonth) {
        if (!e.date) {
          matchesMonth = false;
        } else {
          const d = new Date(e.date);
          const key = Number.isNaN(d.getTime())
            ? null
            : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          matchesMonth = key === selectedMonth;
        }
      }
      return matchesSearch && matchesVenue && matchesMonth;
    });
  }, [events, search, activeVenues, selectedMonth]);

  return (
    <div className="app">
      <header className="app__header">
        <h1>Concerts in Stavanger</h1>
        <p>Live-aggregated concert listings from Stavangeren, Fiskepiren, Checkpoint Charlie, TOU, Stavanger konserthus, Folken &amp; DNB Arena.</p>
        <p className="app__contact">
          Contact: Atle Vatland — <a href="mailto:atle@vatland.no">atle@vatland.no</a>
        </p>
      </header>

      <SourceStatus sources={sources} fetchedAt={fetchedAt} onRefresh={refresh} loading={loading} />

      <Filters
        search={search}
        onSearchChange={setSearch}
        venues={venues}
        activeVenues={activeVenues}
        onToggleVenue={toggleVenue}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        months={months}
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
      />

      {error && <div className="app__error">Couldn't load concerts: {error}</div>}

      {loading && events.length === 0 && <div className="app__status">Loading concerts…</div>}

      {!loading && filteredEvents.length === 0 && !error && (
        <div className="app__status">No concerts match your filters.</div>
      )}

      <div className={`app__grid app__grid--${viewMode}`}>
        {filteredEvents.map((event) => (
          <EventCard key={event.id} event={event} viewMode={viewMode} />
        ))}
      </div>
    </div>
  );
}
