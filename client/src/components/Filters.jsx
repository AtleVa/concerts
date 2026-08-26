import './Filters.css';

export default function Filters({
  search,
  onSearchChange,
  venues,
  activeVenues,
  onToggleVenue,
}) {
  return (
    <div className="filters">
      <input
        className="filters__search"
        type="search"
        placeholder="Search concerts, artists…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <div className="filters__venues">
        {venues.map((venue) => (
          <button
            key={venue}
            type="button"
            className={`filters__venue-chip${activeVenues.has(venue) ? ' filters__venue-chip--active' : ''}`}
            onClick={() => onToggleVenue(venue)}
          >
            {venue}
          </button>
        ))}
      </div>
    </div>
  );
}
