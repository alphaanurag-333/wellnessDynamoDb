import { useCallback, useEffect, useState } from "react";
import { getWebContactDetails, saveWebContactDetails } from "../api/contactDetailsApi.js";
import { ConfirmDialog } from "./ConfirmDialog.jsx";

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

function ContactRow({
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

  return (
    <article className={`ua-cfg-ct-row${isEditing ? " is-editing" : ""}`}>
      <span className="ua-cfg-ct-row__label">{entry.label}</span>
      {isEditing ? (
        <input
          type="text"
          className="ua-cfg-ct-row__input"
          value={draft}
          placeholder="Value"
          disabled={locked}
          onChange={(event) => onDraftChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onSave();
            if (event.key === "Escape") onCancel();
          }}
        />
      ) : (
        <strong className="ua-cfg-ct-row__value">{entry.value}</strong>
      )}
      <div className="ua-cfg-ct-row__actions">
        <span className={`ua-cfg-faq__shown${entry.live ? " is-on" : ""}`}>
          {entry.live ? "LIVE" : "HIDDEN"}
        </span>
        <button
          type="button"
          className={`ua-toggle ua-toggle--sm${entry.live ? " ua-toggle--on" : ""}`}
          aria-pressed={entry.live}
          aria-label={`${entry.label} ${entry.live ? "live" : "hidden"}`}
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
            className="ua-cfg-cr-link ua-cfg-cr-link--modify"
            disabled={locked}
            onClick={onEdit}
          >
            Edit
          </button>
        )}
        <button
          type="button"
          className="ua-cfg-icon-btn"
          aria-label={isEditing ? "Cancel" : `Remove ${entry.label}`}
          disabled={locked}
          onClick={isEditing ? onCancel : onDelete}
        >
          ×
        </button>
      </div>
    </article>
  );
}

export function ContactDetailsSection({ details, setDetails, onToast }) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newDraft, setNewDraft] = useState({ label: "", value: "" });
  const [pendingDelete, setPendingDelete] = useState(null);

  const loadDetails = useCallback(async () => {
    setLoading(true);
    try {
      setDetails(await getWebContactDetails());
    } catch (error) {
      onToast(error?.message || "Failed to load contact details");
      setDetails([]);
    } finally {
      setLoading(false);
    }
  }, [onToast, setDetails]);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  async function persist(nextItems, successMessage) {
    const previous = details;
    setDetails(nextItems);
    setBusy(true);
    try {
      setDetails(await saveWebContactDetails(nextItems));
      if (successMessage) onToast(successMessage);
      return true;
    } catch (error) {
      setDetails(previous);
      onToast(error?.message || "Failed to save contact details");
      return false;
    } finally {
      setBusy(false);
    }
  }

  function startEdit(entry) {
    setShowAdd(false);
    setEditingId(entry.id);
    setDraft(entry.value);
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft("");
  }

  async function saveEdit(id) {
    const value = draft.trim();
    if (!value) {
      onToast("Value is required");
      return;
    }
    const ok = await persist(
      details.map((entry) => (entry.id === id ? { ...entry, value } : entry)),
      "Contact detail saved"
    );
    if (ok) cancelEdit();
  }

  async function addDetail() {
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
    const ok = await persist(
      [...details, { id: `ct-${Date.now()}`, label, value, live: true }],
      `${label} added`
    );
    if (ok) {
      setNewDraft({ label: "", value: "" });
      setShowAdd(false);
    }
  }

  const locked = loading || busy;

  return (
    <div className="ua-cfg-ct">
    <Panel
      title="Contact details"
      subtitle={
        loading
          ? "Loading contact details…"
          : "Shown in the website footer. Toggle live, edit values, or remove a detail. Saved to App Config."
      }
      actions={
        <button
          type="button"
          className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm ua-cfg-ct-add-btn"
          disabled={locked}
          onClick={() => {
            cancelEdit();
            setShowAdd(true);
          }}
        >
          + Add detail
        </button>
      }
    >
      {loading ? (
        <p className="ua-cfg-panel__sub">Fetching contact details from App Config…</p>
      ) : null}

      {showAdd ? (
        <section className="ua-cfg-faq-new ua-cfg-ct-add">
          <div className="ua-cfg-faq-new__head">
            <h4 className="ua-cfg-faq-new__title">
              <span aria-hidden="true">☎️</span> New contact detail
            </h4>
            <button
              type="button"
              className="ua-cfg-icon-btn"
              aria-label="Close"
              disabled={locked}
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
              disabled={locked}
              onChange={(event) => setNewDraft((prev) => ({ ...prev, label: event.target.value }))}
            />
            <input
              type="text"
              className="ua-cfg-faq-new__question"
              placeholder="Value · e.g. +91 90000 12345"
              value={newDraft.value}
              disabled={locked}
              onChange={(event) => setNewDraft((prev) => ({ ...prev, value: event.target.value }))}
            />
            <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" disabled={locked} onClick={addDetail}>
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
            locked={locked}
            onDraftChange={setDraft}
            onToggle={() => {
              persist(
                details.map((row) => (row.id === entry.id ? { ...row, live: !row.live } : row)),
                entry.live ? `${entry.label} hidden` : `${entry.label} is live`
              );
            }}
            onEdit={() => startEdit(entry)}
            onSave={() => saveEdit(entry.id)}
            onCancel={cancelEdit}
            onDelete={() => setPendingDelete(entry)}
          />
        ))}
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        tag="Delete contact detail"
        title={pendingDelete ? `Remove “${pendingDelete.label}”?` : ""}
        body="This contact detail will be removed from the website footer. You can’t undo this."
        cancelLabel="Keep detail"
        confirmLabel="Delete"
        confirmTone="danger"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          const entry = pendingDelete;
          setPendingDelete(null);
          if (!entry) return;
          persist(
            details.filter((row) => row.id !== entry.id),
            `${entry.label} removed`
          );
        }}
      />
    </Panel>
    </div>
  );
}
