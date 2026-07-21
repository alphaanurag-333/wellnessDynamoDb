function formatLastRefreshedAt(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function TrackingRefreshButton({
  onClick,
  disabled,
  className = "",
  lastRefreshedAt = null,
}) {
  const lastLabel = formatLastRefreshedAt(lastRefreshedAt);

  return (
    <div className={`tracking-refresh${className ? ` ${className}` : ""}`}>
      {lastLabel ? (
        <span className="tracking-refresh__meta" title={`Last refreshed at ${lastLabel}`}>
          Last refresh {lastLabel}
        </span>
      ) : null}
      <button
        type="button"
        className="tracking-refresh-btn"
        onClick={onClick}
        disabled={disabled}
        aria-label="Refresh data"
        title={lastLabel ? `Refresh (last: ${lastLabel})` : "Refresh"}
      >
        <svg
          className={`tracking-refresh-btn__icon${disabled ? " tracking-refresh-btn__icon--spin" : ""}`}
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M21 12a9 9 0 1 1-2.64-6.36" />
          <path d="M21 3v6h-6" />
        </svg>
        <span className="tracking-refresh-btn__text">Refresh</span>
      </button>
    </div>
  );
}
