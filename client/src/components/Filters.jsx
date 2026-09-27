import './Filters.css';

export default function Filters({
  search,
  onSearchChange,
  venues,
  activeVenues,
  onToggleVenue,
  viewMode,
  onViewModeChange,
}) {
  return (
    <div className="filters">
      <div className="filters__top">
        <input
          className="filters__search"
          type="search"
          placeholder="Search concerts, artists…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <div className="filters__view-toggle" role="group" aria-label="Choose view">
          <button
            type="button"
            className={`filters__view-btn${viewMode === 'grid' ? ' filters__view-btn--active' : ''}`}
            onClick={() => onViewModeChange('grid')}
            aria-pressed={viewMode === 'grid'}
            title="Thumbnail view"
          >
            ▦ Thumbnails
          </button>
          <button
            type="button"
            className={`filters__view-btn${viewMode === 'list' ? ' filters__view-btn--active' : ''}`}
            onClick={() => onViewModeChange('list')}
            aria-pressed={viewMode === 'list'}
            title="List view"
          >
            ☰ List
          </button>
        </div>
      </div>
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
