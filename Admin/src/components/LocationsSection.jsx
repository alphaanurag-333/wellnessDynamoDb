import { useCallback, useEffect, useRef, useState } from "react";
import { getWebLocations, saveWebLocations } from "../api/locationsApi.js";
import { asCopyString } from "../data/bannerConfigData.js";

function Panel({ title, subtitle, actions, children }) {
  return (
    <section className="ua-cfg-panel">
      <div className="ua-cfg-panel__head">
        <div className="ua-cfg-panel__copy">
          <h3 className="ua-cfg-panel__title">{title}</h3>
          {subtitle ? <p className="ua-cfg-panel__sub">{subtitle}</p> : null}
        </div>
        {actions ? <div className="ua-cfg-panel__actions">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

function LocationRow({
  entry,
  editing,
  draft,
  locked,
  onDraftChange,
  onToggle,
  onEdit,
  onSave,
  onCancel,
  onDelete,
}) {
  const isEditing = Boolean(editing);

  function handleKeyDown(event) {
    if (event.key === "Enter" && event.target.tagName !== "TEXTAREA") onSave();
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
          disabled={locked}
          onChange={(event) => onDraftChange({ ...draft, name: event.target.value })}
          onKeyDown={handleKeyDown}
        />
      ) : (
        <strong className="ua-cfg-loc-row__name">{asCopyString(entry.name)}</strong>
      )}
      {isEditing ? (
        <textarea
          className="ua-cfg-loc-row__address-input"
          rows={3}
          value={asCopyString(draft.address)}
          placeholder="Full address"
          disabled={locked}
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
          disabled={locked}
          onClick={onToggle}
        >
          <span className="ua-toggle__knob" />
        </button>
        {isEditing ? (
          <button
            type="button"
            className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm"
            disabled={locked}
            onClick={onSave}
          >
            Save
          </button>
        ) : (
          <button
            type="button"
            className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm"
            disabled={locked}
            onClick={onEdit}
          >
            Edit
          </button>
        )}
        <button
          type="button"
          className="ua-cfg-icon-btn"
          aria-label={isEditing ? "Cancel" : `Remove ${entry.name}`}
          disabled={locked}
          onClick={isEditing ? onCancel : onDelete}
        >
          ×
        </button>
      </div>
    </article>
  );
}

export function LocationsSection({ locations, setLocations, onToast }) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
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

  const loadLocations = useCallback(async () => {
    setLoading(true);
    try {
      const next = await getWebLocations();
      setLocations(Array.isArray(next) ? next : []);
    } catch (error) {
      onToast(error?.message || "Failed to load locations");
      setLocations([]);
    } finally {
      setLoading(false);
    }
  }, [onToast, setLocations]);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  async function persist(nextItems, successMessage) {
    const previous = locations;
    setLocations(nextItems);
    setBusy(true);
    try {
      setLocations(await saveWebLocations(nextItems));
      if (successMessage) onToast(successMessage);
      return true;
    } catch (error) {
      setLocations(previous);
      onToast(error?.message || "Failed to save locations");
      return false;
    } finally {
      setBusy(false);
    }
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

  async function saveEdit(id) {
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
    const ok = await persist(
      locations.map((entry) => (entry.id === id ? { ...entry, name, address } : entry)),
      "Location saved"
    );
    if (ok) cancelEdit();
  }

  async function addLocation() {
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
    const ok = await persist(
      [...locations, { id: `loc-${Date.now()}`, name, address, live: true }],
      `${name} added`
    );
    if (ok) closeAdd();
  }

  function handleAddKeyDown(event) {
    if (event.key === "Enter" && event.target.tagName !== "TEXTAREA") addLocation();
    if (event.key === "Escape") closeAdd();
  }

  const locked = loading || busy;

  return (
    <div className="ua-cfg-loc">
    <Panel
      title="Locations"
      subtitle={
        loading
          ? "Loading locations…"
          : "Shown on the contact page and in the footer. Saved to App Config."
      }
      actions={
        <button
          type="button"
          className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-loc-add-btn"
          disabled={locked}
          onClick={() => {
            cancelEdit();
            setShowAdd(true);
          }}
        >
          + Add location
        </button>
      }
    >
      {loading ? (
        <p className="ua-cfg-panel__sub">Fetching locations from App Config…</p>
      ) : null}

      {showAdd ? (
        <section className="ua-cfg-loc-add">
          <div className="ua-cfg-loc-add__head">
            <h4 className="ua-cfg-loc-add__title">
              <span className="ua-cfg-loc-pin" aria-hidden="true">📍</span>
              New location
            </h4>
            <button
              type="button"
              className="ua-cfg-icon-btn"
              aria-label="Close"
              disabled={locked}
              onClick={closeAdd}
            >
              ×
            </button>
          </div>
          <input
            ref={addNameRef}
            type="text"
            className="ua-cfg-loc-add__input"
            placeholder="Name · e.g. Wellness studio · Delhi"
            value={asCopyString(newDraft.name)}
            disabled={locked}
            onChange={(event) => setNewDraft((prev) => ({ ...prev, name: event.target.value }))}
            onKeyDown={handleAddKeyDown}
          />
          <textarea
            className="ua-cfg-loc-add__input ua-cfg-loc-add__input--address"
            rows={3}
            placeholder="Full address"
            value={asCopyString(newDraft.address)}
            disabled={locked}
            onChange={(event) => setNewDraft((prev) => ({ ...prev, address: event.target.value }))}
            onKeyDown={handleAddKeyDown}
          />
          <div className="ua-cfg-loc-add__foot">
            <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" disabled={locked} onClick={addLocation}>
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
            locked={locked}
            onDraftChange={setDraft}
            onToggle={() => {
              persist(
                locations.map((row) => (row.id === entry.id ? { ...row, live: !row.live } : row)),
                entry.live ? `${entry.name} hidden` : `${entry.name} is live`
              );
            }}
            onEdit={() => startEdit(entry)}
            onSave={() => saveEdit(entry.id)}
            onCancel={cancelEdit}
            onDelete={() => persist(
              locations.filter((row) => row.id !== entry.id),
              `${entry.name} removed`
            )}
          />
        ))}
      </div>
    </Panel>
    </div>
  );
}
