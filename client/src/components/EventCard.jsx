import './EventCard.css';

const DATE_FORMATTER = new Intl.DateTimeFormat('nb-NO', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

const BADGE_MONTH_FORMATTER = new Intl.DateTimeFormat('nb-NO', { month: 'short' });
const BADGE_WEEKDAY_FORMATTER = new Intl.DateTimeFormat('nb-NO', { weekday: 'short' });
const BADGE_TIME_FORMATTER = new Intl.DateTimeFormat('nb-NO', { hour: '2-digit', minute: '2-digit' });

function formatDate(iso) {
  if (!iso) return null;
  try {
    return DATE_FORMATTER.format(new Date(iso));
  } catch {
    return null;
  }
}

function getDateBadge(iso) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return {
    day: date.getDate(),
    month: BADGE_MONTH_FORMATTER.format(date).replace('.', ''),
    weekday: BADGE_WEEKDAY_FORMATTER.format(date).replace('.', ''),
    time: BADGE_TIME_FORMATTER.format(date),
  };
}

export default function EventCard({ event, viewMode = 'grid' }) {
  const formattedDate = formatDate(event.date);
  const badge = getDateBadge(event.date);

  return (
    <a
      className={`event-card event-card--${viewMode}`}
      href={event.url}
      target="_blank"
      rel="noreferrer"
    >
      {badge && (
        <div className="event-card__date-badge">
          <span className="event-card__date-badge-weekday">{badge.weekday}</span>
          <span className="event-card__date-badge-day">{badge.day}</span>
          <span className="event-card__date-badge-month">{badge.month}</span>
        </div>
      )}
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
