export function TrackingRefreshButton({ onClick, disabled, className = "" }) {
  return (
    <button
      type="button"
      className={`tracking-refresh-btn${className ? ` ${className}` : ""}`}
      onClick={onClick}
      disabled={disabled}
      aria-label="Refresh data"
      title="Refresh"
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
  );
}
