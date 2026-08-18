import { useEffect, useRef, useState } from "react";
import { asCopyString } from "../data/bannerConfigData.js";

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

  function handleKeyDown(event) {
    if (event.key === "Enter") onSave();
    if (event.key === "Escape") onCancel();
  }

  return (
    <article className={`ua-cfg-loc-row${isEditing ? " is-editing" : ""}`}>
      <span className="ua-cfg-loc-pin" aria-hidden="true">📍</span>
      {isEditing ? (
        <input
          type="text"
          className="ua-cfg-loc-row__name-input"
          value={asCopyString(draft.name)}
          placeholder="Name"
          onChange={(event) => onDraftChange({ ...draft, name: event.target.value })}
          onKeyDown={handleKeyDown}
        />
      ) : (
        <strong className="ua-cfg-loc-row__name">{asCopyString(entry.name)}</strong>
      )}
      {isEditing ? (
        <input
          type="text"
          className="ua-cfg-loc-row__address-input"
          value={asCopyString(draft.address)}
          placeholder="Full address"
          onChange={(event) => onDraftChange({ ...draft, address: event.target.value })}
          onKeyDown={handleKeyDown}
        />
      ) : (
        <p className="ua-cfg-loc-row__address">{asCopyString(entry.address)}</p>
      )}
      <div className="ua-cfg-loc-row__actions">
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
          <button type="button" className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm" onClick={onEdit}>
            Edit
          </button>
        )}
        <button
          type="button"
          className="ua-cfg-icon-btn"
          aria-label={isEditing ? "Cancel" : `Remove ${entry.name}`}
          onClick={isEditing ? onCancel : onDelete}
        >
          ×
        </button>
      </div>
    </article>
  );
}

export function LocationsSection({ locations, setLocations, onToast }) {
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ name: "", address: "" });
  const [showAdd, setShowAdd] = useState(false);
  const [newDraft, setNewDraft] = useState({ name: "", address: "" });
  const addNameRef = useRef(null);

  useEffect(() => {
    if (!showAdd) return undefined;
    const timer = window.setTimeout(() => addNameRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [showAdd]);

  function closeAdd() {
    setShowAdd(false);
    setNewDraft({ name: "", address: "" });
  }

  function startEdit(entry) {
    closeAdd();
    setEditingId(entry.id);
    setDraft({ name: asCopyString(entry.name), address: asCopyString(entry.address) });
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft({ name: "", address: "" });
  }

  function saveEdit(id) {
    const name = asCopyString(draft.name).trim();
    const address = asCopyString(draft.address).trim();
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
    const name = asCopyString(newDraft.name).trim();
    const address = asCopyString(newDraft.address).trim();
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
    closeAdd();
    onToast(`${name} added`);
  }

  function handleAddKeyDown(event) {
    if (event.key === "Enter") addLocation();
    if (event.key === "Escape") closeAdd();
  }

  return (
    <Panel
      title="Locations"
      subtitle="Shown on the contact page and in the footer."
      actions={
        <button
          type="button"
          className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-loc-add-btn"
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
        <section className="ua-cfg-loc-add">
          <div className="ua-cfg-loc-add__head">
            <h4 className="ua-cfg-loc-add__title">
              <span className="ua-cfg-loc-pin" aria-hidden="true">📍</span>
              New location
            </h4>
            <button type="button" className="ua-cfg-icon-btn" aria-label="Close" onClick={closeAdd}>
              ×
            </button>
          </div>
          <input
            ref={addNameRef}
            type="text"
            className="ua-cfg-loc-add__input"
            placeholder="Name · e.g. Wellness studio · Delhi"
            value={asCopyString(newDraft.name)}
            onChange={(event) => setNewDraft((prev) => ({ ...prev, name: event.target.value }))}
            onKeyDown={handleAddKeyDown}
          />
          <input
            type="text"
            className="ua-cfg-loc-add__input"
            placeholder="Full address"
            value={asCopyString(newDraft.address)}
            onChange={(event) => setNewDraft((prev) => ({ ...prev, address: event.target.value }))}
            onKeyDown={handleAddKeyDown}
          />
          <div className="ua-cfg-loc-add__foot">
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
