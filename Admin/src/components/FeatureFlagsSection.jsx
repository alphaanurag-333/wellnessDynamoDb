import { asCopyString } from "../data/bannerConfigData.js";
import {
  featureFlagTargetLabel,
  nextFeatureFlagTarget,
} from "../data/featureFlagsData.js";

export function FeatureFlagsSection({ flags, setFlags, onToast }) {
  function patch(id, next) {
    setFlags((prev) => prev.map((entry) => (entry.id === id ? { ...entry, ...next } : entry)));
  }

  return (
    <section className="ua-cfg-panel ua-cfg-ff">
      <div className="ua-cfg-panel__head">
        <div>
          <h3 className="ua-cfg-panel__title">Feature-flag manager</h3>
          <p className="ua-cfg-panel__sub">Toggle availability per platform and track rollout. Admin-only edit.</p>
        </div>
      </div>

      <div className="ua-cfg-ff-table" role="table">
        <div className="ua-cfg-ff-table__head" role="row">
          <span>Feature</span>
          <span>Target</span>
          <span>Rollout</span>
          <span>State</span>
        </div>
        {flags.map((entry) => {
          const name = asCopyString(entry.name);
          const note = asCopyString(entry.note);
          return (
            <div key={entry.id} className={`ua-cfg-ff-row${entry.on ? " is-on" : ""}`} role="row">
              <div className="ua-cfg-ff-row__feature">
                <strong>{name}</strong>
                <p>{note}</p>
              </div>
              <button
                type="button"
                className={`ua-cfg-ff-target ua-cfg-ff-target--${entry.target}`}
                onClick={() => {
                  const target = nextFeatureFlagTarget(entry.target);
                  patch(entry.id, { target });
                  onToast(`${name} · ${featureFlagTargetLabel(target)}`);
                }}
              >
                {featureFlagTargetLabel(entry.target)}
              </button>
              <label className="ua-cfg-ff-rollout">
                <span
                  className="ua-cfg-ff-rollout__bar"
                  style={{ "--rollout": `${entry.rollout}%` }}
                >
                  <span />
                </span>
                <em>{entry.rollout}%</em>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={entry.rollout}
                  aria-label={`${name} rollout`}
                  onChange={(event) => patch(entry.id, { rollout: Number(event.target.value) })}
                />
              </label>
              <button
                type="button"
                className={`ua-toggle${entry.on ? " ua-toggle--on" : ""}`}
                aria-pressed={entry.on}
                aria-label={`${name} ${entry.on ? "on" : "off"}`}
                onClick={() => {
                  const on = !entry.on;
                  patch(entry.id, { on });
                  onToast(`${name} ${on ? "enabled" : "disabled"}`);
                }}
              >
                <span className="ua-toggle__knob" />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function FeatureFlagsPreview({ flags = [] }) {
  const live = flags.filter((entry) => entry.on);
  return (
    <div className="ua-cfg-ff-preview">
      <strong>Feature flags</strong>
      {live.length ? (
        <ul>
          {live.map((entry) => (
            <li key={entry.id}>
              {asCopyString(entry.name)}
              <span>{featureFlagTargetLabel(entry.target)} · {entry.rollout}%</span>
            </li>
          ))}
        </ul>
      ) : (
        <p>No flags enabled.</p>
      )}
    </div>
  );
}
