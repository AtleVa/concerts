import './SourceStatus.css';

export default function SourceStatus({ sources, fetchedAt, onRefresh, loading }) {
  return (
    <div className="source-status">
      <div className="source-status__pills">
        {sources.map((s) => (
          <span
            key={s.id}
            className={`source-status__pill${s.ok ? '' : ' source-status__pill--error'}`}
            title={s.ok ? `${s.count} event(s)` : s.error}
          >
            {s.name} {s.ok ? `(${s.count})` : '⚠️'}
          </span>
        ))}
      </div>
      <div className="source-status__meta">
        {fetchedAt && (
          <span className="source-status__updated">
            Updated {new Date(fetchedAt).toLocaleTimeString('nb-NO')}
          </span>
        )}
        <button className="source-status__refresh" onClick={onRefresh} disabled={loading}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
    </div>
  );
}
