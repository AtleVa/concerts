import './EventCard.css';

const DATE_FORMATTER = new Intl.DateTimeFormat('nb-NO', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

function formatDate(iso) {
  if (!iso) return null;
  try {
    return DATE_FORMATTER.format(new Date(iso));
  } catch {
    return null;
  }
}

export default function EventCard({ event, viewMode = 'grid' }) {
  const formattedDate = formatDate(event.date);

  return (
    <a
      className={`event-card event-card--${viewMode}`}
      href={event.url}
      target="_blank"
      rel="noreferrer"
    >
      <div className="event-card__image-wrap">
        {event.image ? (
          <img className="event-card__image" src={event.image} alt="" loading="lazy" />
        ) : (
          <div className="event-card__image event-card__image--placeholder">🎵</div>
        )}
      </div>
      <div className="event-card__body">
        <span className="event-card__venue">{event.venue || event.sourceName}</span>
        <h3 className="event-card__title">{event.title}</h3>
        <span className={`event-card__date${formattedDate ? '' : ' event-card__date--unknown'}`}>
          {formattedDate || 'Date TBA – see event page'}
        </span>
        {event.description && <p className="event-card__description">{event.description}</p>}
      </div>
    </a>
  );
}
