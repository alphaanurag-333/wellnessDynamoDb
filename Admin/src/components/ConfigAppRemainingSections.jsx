import { useMemo, useState } from "react";
import { TRACKER_COLORS } from "../data/configDetailData.js";

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

export function MedicalQuestionnairePanel({ items, setItems, onToast }) {
  const shownCount = items.filter((item) => item.shown).length;
  const [newQuestion, setNewQuestion] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState("");

  function addQuestion() {
    const question = newQuestion.trim();
    if (!question) {
      onToast("Type a question first");
      return;
    }
    setItems((prev) => [
      ...prev,
      { id: `mq-${Date.now()}`, question, shown: true },
    ]);
    setNewQuestion("");
    onToast("Question added");
  }

  function startEdit(item) {
    setEditingId(item.id);
    setEditDraft(item.question);
  }

  function saveEdit(id) {
    const question = editDraft.trim();
    if (!question) {
      onToast("Question is required");
      return;
    }
    setItems((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, question } : entry)),
    );
    setEditingId(null);
    setEditDraft("");
    onToast("Question saved");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft("");
  }

  return (
    <Panel
      title="Questions"
      subtitle="Clients answer these during onboarding. Disable any question to hide it from the app."
      actions={<span className="ua-cfg-mq__count">{shownCount} of {items.length} live in the app</span>}
    >
      <div className="ua-cfg-mq-add">
        <input
          type="text"
          className="ua-cfg-mq-add__input"
          placeholder="Type a question..."
          value={newQuestion}
          onChange={(event) => setNewQuestion(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") addQuestion();
          }}
        />
        <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" onClick={addQuestion}>
          + Add question
        </button>
      </div>

      <div className="ua-cfg-mq-list">
        {items.map((item, index) => {
          const isEditing = editingId === item.id;
          return (
            <article key={item.id} className={`ua-cfg-mq-row${isEditing ? " ua-cfg-mq-row--editing" : ""}`}>
              <span className="ua-cfg-mq-row__num">{index + 1}</span>
              {isEditing ? (
                <input
                  type="text"
                  className="ua-cfg-mq-row__input"
                  value={editDraft}
                  autoFocus
                  onChange={(event) => setEditDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") saveEdit(item.id);
                    if (event.key === "Escape") cancelEdit();
                  }}
                  onBlur={() => saveEdit(item.id)}
                />
              ) : (
                <button
                  type="button"
                  className="ua-cfg-mq-row__question"
                  onClick={() => startEdit(item)}
                >
                  {item.question}
                </button>
              )}
              <div className="ua-cfg-mq-row__controls">
                <span className={`ua-cfg-mq-row__shown${item.shown ? " is-on" : ""}`}>
                  {item.shown ? "SHOWN" : "HIDDEN"}
                </span>
                <button
                  type="button"
                  className={`ua-toggle ua-toggle--sm${item.shown ? " ua-toggle--on" : ""}`}
                  aria-pressed={item.shown}
                  aria-label={`Toggle ${item.question}`}
                  onClick={() => {
                    setItems((prev) =>
                      prev.map((entry) =>
                        entry.id === item.id ? { ...entry, shown: !entry.shown } : entry,
                      ),
                    );
                  }}
                >
                  <span className="ua-toggle__knob" />
                </button>
                {!isEditing ? (
                  <button
                    type="button"
                    className="ua-cfg-icon-btn ua-cfg-icon-btn--danger ua-cfg-mq-row__delete"
                    aria-label="Delete question"
                    onClick={() => {
                      setItems((prev) => prev.filter((entry) => entry.id !== item.id));
                      if (editingId === item.id) cancelEdit();
                      onToast("Question removed");
                    }}
                  >
                    ×
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </Panel>
  );
}

export function HealthProgressTrackersPanel({ items = [], setItems, onToast }) {
  const [newName, setNewName] = useState("");
  const availableCount = items.filter((item) => item.enabled).length;

  function addTracker() {
    const label = newName.trim();
    if (!label) {
      onToast("Enter a tracker name");
      return;
    }
    const color = TRACKER_COLORS[items.length % TRACKER_COLORS.length];
    setItems((prev) => [
      ...prev,
      {
        id: `tracker-${Date.now()}`,
        name: label,
        category: label,
        color,
        enabled: true,
        builtin: false,
      },
    ]);
    setNewName("");
    onToast(`${label} added to the master list`);
  }

  return (
    <Panel className="ua-cfg-hp">
      <div className="ua-cfg-hp__toolbar">
        <p className="ua-cfg-hp__hint">
          Coaches pick from this list when they add a tracker to a client. Turning one off leaves existing clients untouched but removes it from the picker.
        </p>
        <div className="ua-cfg-hp__add">
          <input
            type="text"
            className="ua-cfg-hp__add-input"
            placeholder="New tracker name..."
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") addTracker();
            }}
          />
          <button
            type="button"
            className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm"
            disabled={!newName.trim()}
            onClick={addTracker}
          >
            Add tracker
          </button>
        </div>
      </div>

      <div className="ua-cfg-hp-list">
        <div className="ua-cfg-hp-list__head">
          <span className="ua-cfg-hp-list__label">Tracker</span>
          <span className="ua-cfg-hp-list__count">{availableCount} of {items.length} available</span>
        </div>
        {items.length ? (
          items.map((item) => (
            <div key={item.id} className="ua-cfg-hp-row">
              <span className="ua-cfg-hp-row__dot" style={{ background: item.color }} aria-hidden="true" />
              <div className="ua-cfg-hp-row__main">
                <strong>{item.category}</strong>
                <span>Shown to coaches as &apos;{item.name}&apos;</span>
              </div>
              <div className="ua-cfg-hp-row__controls">
                <span className={`ua-cfg-hp-row__type${item.builtin !== false ? "" : " ua-cfg-hp-row__type--custom"}`}>
                  {item.builtin !== false ? "Built in" : "Custom"}
                </span>
                <button
                  type="button"
                  className={`ua-toggle ua-toggle--sm${item.enabled ? " ua-toggle--on" : ""}`}
                  aria-pressed={item.enabled}
                  aria-label={`${item.category} ${item.enabled ? "available" : "hidden"}`}
                  onClick={() => {
                    setItems((prev) =>
                      prev.map((entry) =>
                        entry.id === item.id ? { ...entry, enabled: !entry.enabled } : entry,
                      ),
                    );
                  }}
                >
                  <span className="ua-toggle__knob" />
                </button>
                {item.builtin === false ? (
                  <button
                    type="button"
                    className="ua-cfg-icon-btn ua-cfg-hp-row__delete"
                    aria-label={`Remove ${item.category}`}
                    onClick={() => {
                      setItems((prev) => prev.filter((entry) => entry.id !== item.id));
                      onToast(`${item.category} removed`);
                    }}
                  >
                    ×
                  </button>
                ) : null}
              </div>
            </div>
          ))
        ) : (
          <div className="ua-cfg-hp-empty">No trackers yet. Add one above to get started.</div>
        )}
      </div>
    </Panel>
  );
}

export function DrfActivityBankPanel({ items, setItems, sections, onToast }) {
  const [draft, setDraft] = useState({ name: "", section: sections[0] ?? "Meal Tracking" });
  const liveCount = items.filter((item) => item.enabled).length;
  const grouped = useMemo(() => {
    const map = new Map();
    for (const section of sections) map.set(section, []);
    for (const item of items) {
      const key = item.section || "Other";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    }
    return [...map.entries()];
  }, [items, sections]);

  function addActivity() {
    const name = draft.name.trim();
    if (!name) {
      onToast("Activity name is required");
      return;
    }
    setItems((prev) => [
      ...prev,
      {
        id: `drf-${Date.now()}`,
        name,
        section: draft.section,
        enabled: true,
      },
    ]);
    setDraft((prev) => ({ ...prev, name: "" }));
    onToast(`${name} added to the activity bank`);
  }

  return (
    <Panel
      title="Daily reflection activities"
      subtitle={`Coaches pick which activities a client logs · ${liveCount} of ${items.length} live`}
    >
      {grouped.map(([section, rows]) => (
        <div key={section} className="ua-cfg-bank-group">
          <div className="ua-cfg-bank-group__head">{section}</div>
          <div className="ua-cfg-bank-list">
            {rows.map((item) => (
              <div key={item.id} className="ua-cfg-bank-row">
                <div className="ua-cfg-bank-row__main">
                  <strong>{item.name}</strong>
                </div>
                <span className={`ua-cfg-faq__shown${item.enabled ? " is-on" : ""}`}>
                  {item.enabled ? "LIVE" : "HIDDEN"}
                </span>
                <button
                  type="button"
                  className={`ua-toggle${item.enabled ? " ua-toggle--on" : ""}`}
                  aria-pressed={item.enabled}
                  aria-label={`${item.name} ${item.enabled ? "on" : "off"}`}
                  onClick={() => {
                    setItems((prev) =>
                      prev.map((entry) =>
                        entry.id === item.id ? { ...entry, enabled: !entry.enabled } : entry,
                      ),
                    );
                  }}
                >
                  <span className="ua-toggle__knob" />
                </button>
                <button
                  type="button"
                  className="ua-cfg-icon-btn ua-cfg-icon-btn--danger"
                  aria-label={`Remove ${item.name}`}
                  onClick={() => {
                    setItems((prev) => prev.filter((entry) => entry.id !== item.id));
                    onToast(`${item.name} removed`);
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="ua-cfg-bank-add">
        <input
          type="text"
          className="ua-cfg-lookup__input"
          placeholder="Activity · e.g. Evening walk"
          value={draft.name}
          onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
        />
        <select
          className="ua-cfg-bank-select"
          value={draft.section}
          onChange={(event) => setDraft((prev) => ({ ...prev, section: event.target.value }))}
        >
          {sections.map((section) => (
            <option key={section} value={section}>{section}</option>
          ))}
        </select>
        <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" onClick={addActivity}>
          + Add activity
        </button>
      </div>
    </Panel>
  );
}

export function CommitmentLetterPanel({ copy, onChange, onToast }) {
  const [editing, setEditing] = useState(false);
  const [draftIntro, setDraftIntro] = useState(copy.intro);
  const [draftBullets, setDraftBullets] = useState(copy.bullets.join("\n"));

  function startEdit() {
    setDraftIntro(copy.intro);
    setDraftBullets(copy.bullets.join("\n"));
    setEditing(true);
  }

  function cancelEdit() {
    setDraftIntro(copy.intro);
    setDraftBullets(copy.bullets.join("\n"));
    setEditing(false);
  }

  function saveEdit() {
    const intro = draftIntro.trim();
    const bullets = draftBullets
      .split("\n")
      .map((line) => line.replace(/^[\s•\-–]+/, "").trim())
      .filter(Boolean);

    if (!intro) {
      onToast("Add an opening paragraph before saving");
      return;
    }

    onChange({ intro, bullets });
    setEditing(false);
    onToast("Commitment letter template updated");
  }

  return (
    <Panel
      title="Onboarding template"
      subtitle="Shown when a coach assigns the commitment letter. Use {name} for the client’s name."
      actions={
        editing ? (
          <>
            <button type="button" className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm" onClick={cancelEdit}>
              Cancel
            </button>
            <button type="button" className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm" onClick={saveEdit}>
              Save
            </button>
          </>
        ) : (
          <button type="button" className="ua-cfg-btn ua-cfg-btn--ghost" onClick={startEdit}>
            Edit
          </button>
        )
      }
    >
      {editing ? (
        <div className="ua-cfg-legal-edit">
          <label className="ua-cfg-legal-edit__field">
            <span className="ua-cfg-legal-edit__label">Opening paragraph</span>
            <textarea
              className="ua-cfg-legal-edit__textarea"
              rows={3}
              value={draftIntro}
              onChange={(event) => setDraftIntro(event.target.value)}
            />
          </label>
          <label className="ua-cfg-legal-edit__field">
            <span className="ua-cfg-legal-edit__label">Bullet points · one per line</span>
            <textarea
              className="ua-cfg-legal-edit__textarea ua-cfg-legal-edit__textarea--bullets"
              rows={6}
              value={draftBullets}
              placeholder="One bullet per line"
              onChange={(event) => setDraftBullets(event.target.value)}
            />
          </label>
        </div>
      ) : (
        <div className="ua-cfg-legal-view">
          <p className="ua-cfg-legal-view__intro">{copy.intro}</p>
          <ul className="ua-cfg-legal-view__list">
            {copy.bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}
