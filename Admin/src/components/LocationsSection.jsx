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

function LocationRow({ entry, editing, draft, onDraftChange, onToggle, onEdit, onSave, onCancel, onDelete }) {
  const isEditing = Boolean(editing);

  return (
    <article className={`ua-cfg-loc-row${isEditing ? " is-editing" : ""}`}>
      <span className="ua-cfg-loc-pin" aria-hidden="true">📍</span>
      <div className="ua-cfg-loc-row__main">
        {isEditing ? (
          <>
            <input
              type="text"
              className="ua-cfg-loc-row__input"
              value={draft.name}
              placeholder="Name"
              onChange={(event) => onDraftChange({ ...draft, name: event.target.value })}
            />
            <input
              type="text"
              className="ua-cfg-loc-row__input"
              value={draft.address}
              placeholder="Full address"
              onChange={(event) => onDraftChange({ ...draft, address: event.target.value })}
              onKeyDown={(event) => {
                if (event.key === "Enter") onSave();
                if (event.key === "Escape") onCancel();
              }}
            />
          </>
        ) : (
          <>
            <strong className="ua-cfg-loc-row__name">{entry.name}</strong>
            <p className="ua-cfg-loc-row__address">{entry.address}</p>
          </>
        )}
      </div>
      <span className={`ua-cfg-faq__shown${entry.live ? " is-on" : ""}`}>
        {entry.live ? "LIVE" : "HIDDEN"}
      </span>
      <button
        type="button"
        className={`ua-toggle ua-toggle--sm${entry.live ? " ua-toggle--on" : ""}`}
        aria-pressed={entry.live}
        aria-label={`${entry.name} ${entry.live ? "live" : "hidden"}`}
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
        aria-label={isEditing ? "Cancel" : `Remove ${entry.name}`}
        onClick={isEditing ? onCancel : onDelete}
      >
        ×
      </button>
    </article>
  );
}

export function LocationsSection({ locations, setLocations, onToast }) {
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ name: "", address: "" });
  const [showAdd, setShowAdd] = useState(false);
  const [newDraft, setNewDraft] = useState({ name: "", address: "" });

  function startEdit(entry) {
    setShowAdd(false);
    setEditingId(entry.id);
    setDraft({ name: entry.name, address: entry.address });
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft({ name: "", address: "" });
  }

  function saveEdit(id) {
    const name = draft.name.trim();
    const address = draft.address.trim();
    if (!name) {
      onToast("Name is required");
      return;
    }
    if (!address) {
      onToast("Address is required");
      return;
    }
    setLocations((prev) => prev.map((entry) => (entry.id === id ? { ...entry, name, address } : entry)));
    cancelEdit();
    onToast("Location saved");
  }

  function addLocation() {
    const name = newDraft.name.trim();
    const address = newDraft.address.trim();
    if (!name) {
      onToast("Name is required");
      return;
    }
    if (!address) {
      onToast("Address is required");
      return;
    }
    setLocations((prev) => [
      ...prev,
      { id: `loc-${Date.now()}`, name, address, live: true },
    ]);
    setNewDraft({ name: "", address: "" });
    setShowAdd(false);
    onToast(`${name} added`);
  }

  return (
    <Panel
      title="Locations"
      subtitle="Shown on the contact page and in the footer."
      actions={
        <button
          type="button"
          className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm"
          onClick={() => {
            cancelEdit();
            setShowAdd(true);
          }}
        >
          + Add location
        </button>
      }
    >
      {showAdd ? (
        <section className="ua-cfg-faq-new ua-cfg-loc-add">
          <div className="ua-cfg-faq-new__head">
            <h4 className="ua-cfg-faq-new__title">
              <span aria-hidden="true">📍</span> New location
            </h4>
            <button
              type="button"
              className="ua-cfg-icon-btn"
              aria-label="Close"
              onClick={() => {
                setShowAdd(false);
                setNewDraft({ name: "", address: "" });
              }}
            >
              ×
            </button>
          </div>
          <div className="ua-cfg-loc-add__row">
            <input
              type="text"
              className="ua-cfg-faq-new__question"
              placeholder="Name · e.g. Wellness studio · Delhi"
              value={newDraft.name}
              onChange={(event) => setNewDraft((prev) => ({ ...prev, name: event.target.value }))}
            />
            <input
              type="text"
              className="ua-cfg-faq-new__question"
              placeholder="Full address"
              value={newDraft.address}
              onChange={(event) => setNewDraft((prev) => ({ ...prev, address: event.target.value }))}
            />
            <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" onClick={addLocation}>
              Add location
            </button>
          </div>
        </section>
      ) : null}

      <div className="ua-cfg-loc-list">
        {locations.map((entry) => (
          <LocationRow
            key={entry.id}
            entry={entry}
            editing={editingId === entry.id}
            draft={draft}
            onDraftChange={setDraft}
            onToggle={() => {
              setLocations((prev) =>
                prev.map((row) => (row.id === entry.id ? { ...row, live: !row.live } : row)),
              );
            }}
            onEdit={() => startEdit(entry)}
            onSave={() => saveEdit(entry.id)}
            onCancel={cancelEdit}
            onDelete={() => {
              setLocations((prev) => prev.filter((row) => row.id !== entry.id));
              onToast(`${entry.name} removed`);
            }}
          />
        ))}
      </div>
    </Panel>
  );
}
