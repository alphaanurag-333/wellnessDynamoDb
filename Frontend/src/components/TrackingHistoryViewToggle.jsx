const MODES = [
  { id: "graph", label: "Graph" },
  { id: "table", label: "Table" },
  { id: "both", label: "Both" },
];

export function TrackingHistoryViewToggle({ value, onChange }) {
  return (
    <div className="tracking-view-toggle" role="tablist" aria-label="History view">
      {MODES.map((mode) => (
        <button
          key={mode.id}
          type="button"
          role="tab"
          aria-selected={value === mode.id}
          className={`tracking-view-toggle__btn${value === mode.id ? " tracking-view-toggle__btn--active" : ""}`}
          onClick={() => onChange(mode.id)}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}
