import { aiEnabledCount } from "../data/aiEnableData.js";

function Panel({ title, subtitle, actions, children, className = "" }) {
  const hasHead = Boolean(title || subtitle || actions);
  return (
    <section className={`ua-cfg-panel${className ? ` ${className}` : ""}`}>
      {hasHead ? (
        <div className="ua-cfg-panel__head">
          <div>
            {title ? <h3 className="ua-cfg-panel__title">{title}</h3> : null}
            {subtitle ? <p className="ua-cfg-panel__sub">{subtitle}</p> : null}
          </div>
          {actions ? <div className="ua-cfg-panel__actions">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

function AccessGroup({
  label,
  tone,
  people,
  onToggle,
  onEnableAll,
  onDisableAll,
  renderMeta,
}) {
  const enabledCount = aiEnabledCount(people);

  return (
    <section className={`ua-cfg-ai-group is-${tone}`}>
      <div className="ua-cfg-ai-group__head">
        <div className="ua-cfg-ai-group__label-wrap">
          <span className="ua-cfg-ai-group__label">{label}</span>
          <span className="ua-cfg-ai-group__count">
            {enabledCount} of {people.length} enabled
          </span>
        </div>
        <div className="ua-cfg-ai-group__bulk">
          <button type="button" className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm" onClick={onEnableAll}>
            Enable all
          </button>
          <button type="button" className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm" onClick={onDisableAll}>
            Disable all
          </button>
        </div>
      </div>

      <div className="ua-cfg-ai-group__grid">
        {people.map((person) => (
          <article key={person.id} className={`ua-cfg-ai-person${person.enabled ? " is-on" : ""}`}>
            <span
              className="ua-cfg-ai-person__avatar"
              style={{ backgroundColor: person.color }}
              aria-hidden="true"
            >
              {person.initials}
            </span>
            <div className="ua-cfg-ai-person__meta">
              <strong>{person.name}</strong>
              <span>{renderMeta(person)}</span>
            </div>
            <button
              type="button"
              className={`ua-toggle ua-toggle--sm${person.enabled ? " ua-toggle--on" : ""}`}
              aria-pressed={person.enabled}
              aria-label={`${person.enabled ? "Disable" : "Enable"} AI for ${person.name}`}
              onClick={() => onToggle(person.id)}
            >
              <span className="ua-toggle__knob" />
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

export function AiEnableSection({ coaches, setCoaches, assistants, setAssistants, onToast }) {
  const coachEnabled = aiEnabledCount(coaches);
  const assistantEnabled = aiEnabledCount(assistants);

  function toggleCoach(id) {
    setCoaches(coaches.map((entry) => (entry.id === id ? { ...entry, enabled: !entry.enabled } : entry)));
  }

  function toggleAssistant(id) {
    setAssistants(assistants.map((entry) => (entry.id === id ? { ...entry, enabled: !entry.enabled } : entry)));
  }

  return (
    <Panel
      className="ua-cfg-ai"
      title={(
        <span className="ua-cfg-ai__title">
          <span className="ua-cfg-ai__icon" aria-hidden="true">⚙</span>
          AI enable
        </span>
      )}
      subtitle="AI report interpretation and summaries"
    >
      <div className="ua-cfg-ai__who">
        <h4 className="ua-cfg-ai__who-title">Who gets it</h4>
        <p className="ua-cfg-ai__who-sub">
          Admin always has access. Switch it on or off per person — off means the feature is hidden for that coach and their clients.
        </p>
      </div>

      <AccessGroup
        label="Wellness coach"
        tone="coach"
        people={coaches}
        onToggle={toggleCoach}
        onEnableAll={() => {
          setCoaches(coaches.map((entry) => ({ ...entry, enabled: true })));
          onToast("All coaches enabled");
        }}
        onDisableAll={() => {
          setCoaches(coaches.map((entry) => ({ ...entry, enabled: false })));
          onToast("All coaches disabled");
        }}
        renderMeta={(person) => person.role}
      />

      <AccessGroup
        label="Assistant WC"
        tone="assistant"
        people={assistants}
        onToggle={toggleAssistant}
        onEnableAll={() => {
          setAssistants(assistants.map((entry) => ({ ...entry, enabled: true })));
          onToast("All assistants enabled");
        }}
        onDisableAll={() => {
          setAssistants(assistants.map((entry) => ({ ...entry, enabled: false })));
          onToast("All assistants disabled");
        }}
        renderMeta={(person) => `under ${person.reportsTo}`}
      />

      <p className="ua-cfg-ai__foot">
        {coachEnabled} of {coaches.length} coaches and {assistantEnabled} of {assistants.length} assistants have it.
      </p>
    </Panel>
  );
}

export { AI_ENABLE_ASSISTANTS, AI_ENABLE_COACHES } from "../data/aiEnableData.js";
