import { useState } from "react";

function Panel({ title, subtitle, actions, children }) {
  return (
    <section className="ua-cfg-panel">
      <div className="ua-cfg-panel__head">
        <div>
          <h3 className="ua-cfg-panel__title">{title}</h3>
          {subtitle ? <p className="ua-cfg-panel__sub">{subtitle}</p> : null}
        </div>
        {actions ? <div className="ua-cfg-panel__actions">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

function ContactRow({ entry, editing, draft, onDraftChange, onToggle, onEdit, onSave, onCancel, onDelete }) {
  const isEditing = Boolean(editing);

  return (
    <article className={`ua-cfg-ct-row${isEditing ? " is-editing" : ""}`}>
      <div className="ua-cfg-ct-row__main">
        <span className="ua-cfg-ct-row__label">{entry.label}</span>
        {isEditing ? (
          <input
            type="text"
            className="ua-cfg-ct-row__input"
            value={draft}
            placeholder="Value"
            onChange={(event) => onDraftChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") onSave();
              if (event.key === "Escape") onCancel();
            }}
          />
        ) : (
          <strong className="ua-cfg-ct-row__value">{entry.value}</strong>
        )}
      </div>
      <span className={`ua-cfg-faq__shown${entry.live ? " is-on" : ""}`}>
        {entry.live ? "LIVE" : "HIDDEN"}
      </span>
      <button
        type="button"
        className={`ua-toggle ua-toggle--sm${entry.live ? " ua-toggle--on" : ""}`}
        aria-pressed={entry.live}
        aria-label={`${entry.label} ${entry.live ? "live" : "hidden"}`}
        onClick={onToggle}
      >
        <span className="ua-toggle__knob" />
      </button>
      {isEditing ? (
        <button type="button" className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm" onClick={onSave}>
          Save
        </button>
      ) : (
        <button type="button" className="ua-cfg-btn ua-cfg-btn--ghost" onClick={onEdit}>
          Edit
        </button>
      )}
      <button
        type="button"
        className="ua-cfg-icon-btn ua-cfg-icon-btn--danger"
        aria-label={isEditing ? "Cancel" : `Remove ${entry.label}`}
        onClick={isEditing ? onCancel : onDelete}
      >
        ×
      </button>
    </article>
  );
}

export function ContactDetailsSection({ details, setDetails, onToast }) {
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newDraft, setNewDraft] = useState({ label: "", value: "" });

  function startEdit(entry) {
    setShowAdd(false);
    setEditingId(entry.id);
    setDraft(entry.value);
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft("");
  }

  function saveEdit(id) {
    const value = draft.trim();
    if (!value) {
      onToast("Value is required");
      return;
    }
    setDetails((prev) => prev.map((entry) => (entry.id === id ? { ...entry, value } : entry)));
    cancelEdit();
    onToast("Contact detail saved");
  }

  function addDetail() {
    const label = newDraft.label.trim();
    const value = newDraft.value.trim();
    if (!label) {
      onToast("Label is required");
      return;
    }
    if (!value) {
      onToast("Value is required");
      return;
    }
    setDetails((prev) => [
      ...prev,
      { id: `ct-${Date.now()}`, label, value, live: true },
    ]);
    setNewDraft({ label: "", value: "" });
    setShowAdd(false);
    onToast(`${label} added`);
  }

  return (
    <Panel
      title="Contact details"
      subtitle="Shown in the website footer."
      actions={
        <button
          type="button"
          className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm"
          onClick={() => {
            cancelEdit();
            setShowAdd(true);
          }}
        >
          + Add detail
        </button>
      }
    >
      {showAdd ? (
        <section className="ua-cfg-faq-new ua-cfg-ct-add">
          <div className="ua-cfg-faq-new__head">
            <h4 className="ua-cfg-faq-new__title">
              <span aria-hidden="true">☎</span> New contact detail
            </h4>
            <button
              type="button"
              className="ua-cfg-icon-btn"
              aria-label="Close"
              onClick={() => {
                setShowAdd(false);
                setNewDraft({ label: "", value: "" });
              }}
            >
              ×
            </button>
          </div>
          <div className="ua-cfg-ct-add__row">
            <input
              type="text"
              className="ua-cfg-faq-new__question"
              placeholder="Label · e.g. WhatsApp"
              value={newDraft.label}
              onChange={(event) => setNewDraft((prev) => ({ ...prev, label: event.target.value }))}
            />
            <input
              type="text"
              className="ua-cfg-faq-new__question"
              placeholder="Value · e.g. +91 90000 12345"
              value={newDraft.value}
              onChange={(event) => setNewDraft((prev) => ({ ...prev, value: event.target.value }))}
            />
            <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" onClick={addDetail}>
              Add detail
            </button>
          </div>
        </section>
      ) : null}

      <div className="ua-cfg-ct-list">
        {details.map((entry) => (
          <ContactRow
            key={entry.id}
            entry={entry}
            editing={editingId === entry.id}
            draft={draft}
            onDraftChange={setDraft}
            onToggle={() => {
              setDetails((prev) =>
                prev.map((row) => (row.id === entry.id ? { ...row, live: !row.live } : row)),
              );
            }}
            onEdit={() => startEdit(entry)}
            onSave={() => saveEdit(entry.id)}
            onCancel={cancelEdit}
            onDelete={() => {
              setDetails((prev) => prev.filter((row) => row.id !== entry.id));
              onToast(`${entry.label} removed`);
            }}
          />
        ))}
      </div>
    </Panel>
  );
}
