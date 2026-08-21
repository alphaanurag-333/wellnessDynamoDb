import { useCallback, useEffect, useMemo, useState } from "react";
import {
  adminCreateHealthDisorder,
  adminDeleteHealthDisorder,
  adminListHealthDisorders,
  adminUpdateHealthDisorder,
} from "../api/healthDisorderApi.js";
import { ConfirmDialog } from "./ConfirmDialog.jsx";

const TYPE_OPTIONS = [
  { value: "acute", label: "Acute" },
  { value: "chronic", label: "Chronic" },
];

const EMPTY_DRAFT = {
  title: "",
  description: "",
  symptoms: "",
  type: "acute",
};

function Panel({ title, subtitle, actions, children }) {
  return (
    <section className="ua-cfg-panel ua-cfg-hd">
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

function symptomsToText(symptoms) {
  return Array.isArray(symptoms) ? symptoms.join(", ") : String(symptoms || "");
}

function parseSymptoms(text) {
  return String(text || "")
    .split(/[,;\n]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function HealthDisordersSection({ onToast }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(EMPTY_DRAFT);
  const [pendingDelete, setPendingDelete] = useState(null);

  const activeCount = useMemo(
    () => items.filter((row) => row.status === "active").length,
    [items],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await adminListHealthDisorders(null, { page: 1, limit: 200 });
      setItems(result?.healthDisorders || []);
    } catch (error) {
      onToast?.(error?.message || "Failed to load health disorders");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  useEffect(() => {
    load();
  }, [load]);

  function startEdit(item) {
    setShowAdd(false);
    setEditingId(item.id);
    setEditDraft({
      title: item.title,
      description: item.description,
      symptoms: symptomsToText(item.symptoms),
      type: item.type || "acute",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft(EMPTY_DRAFT);
  }

  async function saveEdit(id) {
    const title = editDraft.title.trim();
    const description = editDraft.description.trim();
    const symptoms = parseSymptoms(editDraft.symptoms);
    if (!title) {
      onToast?.("Title is required");
      return;
    }
    if (!description) {
      onToast?.("Description is required");
      return;
    }
    if (!symptoms.length) {
      onToast?.("Add at least one symptom");
      return;
    }
    setBusy(true);
    try {
      const saved = await adminUpdateHealthDisorder(null, id, {
        title,
        description,
        symptoms,
        type: editDraft.type,
      });
      setItems((list) => list.map((row) => (row.id === id ? saved : row)));
      cancelEdit();
      onToast?.("Health disorder saved");
    } catch (error) {
      onToast?.(error?.message || "Failed to save health disorder");
    } finally {
      setBusy(false);
    }
  }

  async function addItem() {
    const title = draft.title.trim();
    const description = draft.description.trim();
    const symptoms = parseSymptoms(draft.symptoms);
    if (!title) {
      onToast?.("Title is required");
      return;
    }
    if (!description) {
      onToast?.("Description is required");
      return;
    }
    if (!symptoms.length) {
      onToast?.("Add at least one symptom");
      return;
    }
    setBusy(true);
    try {
      const created = await adminCreateHealthDisorder(null, {
        title,
        description,
        symptoms,
        type: draft.type,
        status: "active",
      });
      setItems((list) => [created, ...list]);
      setDraft(EMPTY_DRAFT);
      setShowAdd(false);
      onToast?.(`${created.title} added`);
    } catch (error) {
      onToast?.(error?.message || "Failed to add health disorder");
    } finally {
      setBusy(false);
    }
  }

  async function toggleStatus(item) {
    const nextOn = item.status !== "active";
    setBusy(true);
    try {
      const saved = await adminUpdateHealthDisorder(null, item.id, { on: nextOn });
      setItems((list) => list.map((row) => (row.id === item.id ? saved : row)));
      onToast?.(`${item.title} ${nextOn ? "shown" : "hidden"}`);
    } catch (error) {
      onToast?.(error?.message || "Failed to update status");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setPendingDelete(null);
    setBusy(true);
    try {
      await adminDeleteHealthDisorder(null, target.id);
      setItems((list) => list.filter((row) => row.id !== target.id));
      if (editingId === target.id) cancelEdit();
      onToast?.(`${target.title} removed`);
    } catch (error) {
      onToast?.(error?.message || "Failed to delete health disorder");
    } finally {
      setBusy(false);
    }
  }

  const locked = loading || busy;

  return (
    <div className="ua-cfg-hd-wrap">
      <Panel
        title="Health disorders"
        subtitle={
          loading
            ? "Loading health disorders…"
            : `Catalog from HealthDisorder · ${activeCount} of ${items.length} live`
        }
        actions={
          loading ? null : (
            <button
              type="button"
              className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm"
              disabled={locked}
              onClick={() => {
                cancelEdit();
                setShowAdd(true);
              }}
            >
              + Add disorder
            </button>
          )
        }
      >
        {loading ? (
          <p className="ua-cfg-panel__sub">Fetching health disorders from the server…</p>
        ) : (
          <>
            {showAdd ? (
              <div className="ua-cfg-hd-form">
                <input
                  type="text"
                  className="ua-cfg-hd-form__title"
                  placeholder="Disorder title"
                  value={draft.title}
                  disabled={locked}
                  onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
                />
                <select
                  className="ua-cfg-hd-form__type"
                  aria-label="Disorder type"
                  value={draft.type}
                  disabled={locked}
                  onChange={(event) => setDraft((prev) => ({ ...prev, type: event.target.value }))}
                >
                  {TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <textarea
                  className="ua-cfg-hd-form__desc"
                  rows={3}
                  placeholder="Description"
                  value={draft.description}
                  disabled={locked}
                  onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))}
                />
                <textarea
                  className="ua-cfg-hd-form__symptoms"
                  rows={2}
                  placeholder="Symptoms (comma separated)"
                  value={draft.symptoms}
                  disabled={locked}
                  onChange={(event) => setDraft((prev) => ({ ...prev, symptoms: event.target.value }))}
                />
                <div className="ua-cfg-hd-form__actions">
                  <button
                    type="button"
                    className="ua-cfg-btn ua-cfg-btn--ghost ua-cfg-btn--sm"
                    disabled={locked}
                    onClick={() => {
                      setShowAdd(false);
                      setDraft(EMPTY_DRAFT);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm"
                    disabled={locked}
                    onClick={addItem}
                  >
                    {busy ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            ) : null}

            {!items.length ? (
              <p className="ua-cfg-panel__sub">No health disorders yet. Add one to populate the catalog.</p>
            ) : (
              <div className="ua-cfg-hd-list">
                {items.map((item) => {
                  const isEditing = editingId === item.id;
                  const live = item.status === "active";
                  return (
                    <article key={item.id} className={`ua-cfg-hd-card${isEditing ? " is-editing" : ""}`}>
                      <div className="ua-cfg-hd-card__head">
                        {isEditing ? (
                          <input
                            type="text"
                            className="ua-cfg-hd-form__title"
                            value={editDraft.title}
                            disabled={locked}
                            onChange={(event) => setEditDraft((prev) => ({ ...prev, title: event.target.value }))}
                          />
                        ) : (
                          <h4 className="ua-cfg-hd-card__title">{item.title}</h4>
                        )}
                        <span className={`ua-cfg-hd-card__type ua-cfg-hd-card__type--${item.type}`}>
                          {item.type}
                        </span>
                        <span className={`ua-cfg-faq__shown${live ? " is-on" : ""}`}>
                          {live ? "LIVE" : "HIDDEN"}
                        </span>
                        <button
                          type="button"
                          className={`ua-toggle ua-toggle--sm${live ? " ua-toggle--on" : ""}`}
                          aria-pressed={live}
                          aria-label={`${item.title} ${live ? "live" : "hidden"}`}
                          disabled={locked}
                          onClick={() => toggleStatus(item)}
                        >
                          <span className="ua-toggle__knob" />
                        </button>
                      </div>

                      {isEditing ? (
                        <div className="ua-cfg-hd-form ua-cfg-hd-form--inline">
                          <select
                            className="ua-cfg-hd-form__type"
                            aria-label="Disorder type"
                            value={editDraft.type}
                            disabled={locked}
                            onChange={(event) => setEditDraft((prev) => ({ ...prev, type: event.target.value }))}
                          >
                            {TYPE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                          <textarea
                            className="ua-cfg-hd-form__desc"
                            rows={3}
                            value={editDraft.description}
                            disabled={locked}
                            onChange={(event) => setEditDraft((prev) => ({ ...prev, description: event.target.value }))}
                          />
                          <textarea
                            className="ua-cfg-hd-form__symptoms"
                            rows={2}
                            value={editDraft.symptoms}
                            disabled={locked}
                            onChange={(event) => setEditDraft((prev) => ({ ...prev, symptoms: event.target.value }))}
                          />
                          <div className="ua-cfg-hd-form__actions">
                            <button type="button" className="ua-cfg-btn ua-cfg-btn--ghost ua-cfg-btn--sm" disabled={locked} onClick={cancelEdit}>
                              Cancel
                            </button>
                            <button type="button" className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm" disabled={locked} onClick={() => saveEdit(item.id)}>
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="ua-cfg-hd-card__desc">{item.description || "No description"}</p>
                          <div className="ua-cfg-hd-card__symptoms">
                            {(item.symptoms || []).length
                              ? item.symptoms.map((symptom) => (
                                  <span key={symptom} className="ua-cfg-hd-chip">{symptom}</span>
                                ))
                              : <span className="ua-cfg-panel__sub">No symptoms</span>}
                          </div>
                          <div className="ua-cfg-hd-card__actions">
                            <button type="button" className="ua-cfg-btn ua-cfg-btn--ghost ua-cfg-btn--sm" disabled={locked} onClick={() => startEdit(item)}>
                              Edit
                            </button>
                            <button type="button" className="ua-cfg-btn ua-cfg-btn--ghost ua-cfg-btn--sm" disabled={locked} onClick={() => setPendingDelete(item)}>
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}
      </Panel>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete health disorder?"
        body={pendingDelete ? `Remove “${pendingDelete.title}” from the catalog? This cannot be undone.` : ""}
        confirmLabel="Delete"
        confirmTone="danger"
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
