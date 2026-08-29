import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  adminCreateHealthDisorder,
  adminDeleteHealthDisorder,
  adminListHealthDisorders,
  adminUpdateHealthDisorder,
} from "../api/healthDisorderApi.js";
import { moveConfigListItem } from "../utils/configReorder.js";
import { ConfirmDialog } from "./ConfirmDialog.jsx";
import { CfgSelect, ListPagination } from "./shared.jsx";
import { SectionSurfacePanel } from "./SectionSurfacePanel.jsx";
import "./healthDisordersConfig.css";

const PAGE_SIZE = 10;

const TYPE_OPTIONS = [
  { value: "acute", label: "Acute" },
  { value: "chronic", label: "Chronic" },
];

const EMPTY_DRAFT = {
  title: "",
  description: "",
  symptoms: [""],
  type: "acute",
};

function Panel({ title, subtitle, actions, children }) {
  return (
    <section className="ua-cfg-panel">
      <div className="ua-cfg-panel__head">
        <div className="ua-cfg-panel__copy">
          {title ? <h3 className="ua-cfg-panel__title">{title}</h3> : null}
          {subtitle ? <p className="ua-cfg-panel__sub">{subtitle}</p> : null}
        </div>
        {actions ? <div className="ua-cfg-panel__actions">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

function cleanSymptoms(list) {
  return (Array.isArray(list) ? list : [])
    .map((entry) => String(entry || "").trim())
    .filter(Boolean);
}

function typeLabel(value) {
  return TYPE_OPTIONS.find((row) => row.value === value)?.label || "Acute";
}

function SymptomsEditor({ value, disabled, onChange }) {
  const incoming = Array.isArray(value) ? value : [];
  const incomingKey = incoming.join("\n");
  const syncedKey = useRef(incomingKey);
  const [rows, setRows] = useState(() => (incomingKey ? incomingKey.split("\n") : [""]));

  useEffect(() => {
    if (incomingKey === syncedKey.current) return;
    syncedKey.current = incomingKey;
    setRows(incomingKey ? incomingKey.split("\n") : [""]);
  }, [incomingKey]);

  function emit(nextRows) {
    const normalized = nextRows.length ? nextRows : [""];
    setRows(normalized);
    const cleaned = cleanSymptoms(normalized);
    syncedKey.current = cleaned.join("\n");
    onChange(normalized);
  }

  function addSymptom() {
    emit([...rows, ""]);
  }

  return (
    <div className="ua-cfg-rc-specs-editor ua-cfg-hd-symptoms-editor">
      {rows.map((row, index) => (
        <div className="ua-cfg-rc-specs-editor__row" key={`symptom-${index}`}>
          <span className="ua-cfg-rc-specs-editor__bullet" aria-hidden="true">•</span>
          <input
            className="ua-cfg-vh-input"
            value={row}
            disabled={disabled}
            placeholder={index === 0 ? "Symptom · e.g. Fatigue" : "Add another symptom"}
            aria-label={index === 0 ? "Symptom" : `Symptom ${index + 1}`}
            onChange={(event) => emit(rows.map((entry, i) => (i === index ? event.target.value : entry)))}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              addSymptom();
            }}
          />
          {rows.length > 1 || String(row).trim() ? (
            <button
              type="button"
              className="ua-cfg-icon-btn"
              aria-label="Remove symptom"
              disabled={disabled}
              onClick={() => emit(rows.filter((_, i) => i !== index))}
            >
              ×
            </button>
          ) : null}
        </div>
      ))}
      <button
        type="button"
        className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm ua-cfg-tf-add-btn"
        disabled={disabled}
        onClick={addSymptom}
      >
        + Add symptom
      </button>
    </div>
  );
}

export function HealthDisordersSection({ items, setItems, editor, setEditor, onToast }) {
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_SIZE,
    total: 0,
    pages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState(null);
  const [editSnapshot, setEditSnapshot] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  const activeCount = useMemo(
    () => items.filter((row) => row.status === "active").length,
    [items],
  );

  const load = useCallback(async (pageOverride) => {
    const nextPage = pageOverride ?? page;
    setLoading(true);
    try {
      const result = await adminListHealthDisorders(null, {
        page: nextPage,
        limit: PAGE_SIZE,
      });
      const rows = result?.healthDisorders || [];
      const nextPagination = result?.pagination || {};
      setItems(rows);
      setPagination({
        page: Number(nextPagination.page) || nextPage,
        limit: Number(nextPagination.limit) || PAGE_SIZE,
        total: Number(nextPagination.total) || rows.length,
        pages: Number(nextPagination.pages) || 1,
      });
    } catch (error) {
      onToast?.(error?.message || "Failed to load health disorders");
      setItems([]);
      setPagination({ page: 1, limit: PAGE_SIZE, total: 0, pages: 1 });
    } finally {
      setLoading(false);
    }
  }, [onToast, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!loading && page > pagination.pages) setPage(pagination.pages);
  }, [loading, page, pagination.pages]);

  function updateLocalItem(id, patch) {
    setItems((list) => list.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function startEdit(item) {
    setCreating(false);
    setEditSnapshot({
      id: item.id,
      title: item.title,
      description: item.description,
      symptoms: [...(item.symptoms || [])],
      type: item.type || "acute",
    });
    setEditingId(item.id);
    updateLocalItem(item.id, {
      symptoms: item.symptoms?.length ? [...item.symptoms] : [""],
    });
  }

  function cancelEdit() {
    if (editSnapshot) {
      updateLocalItem(editSnapshot.id, {
        title: editSnapshot.title,
        description: editSnapshot.description,
        symptoms: editSnapshot.symptoms,
        type: editSnapshot.type,
      });
    }
    setEditingId(null);
    setEditSnapshot(null);
  }

  async function saveEdit(entry) {
    const title = String(entry.title || "").trim();
    const description = String(entry.description || "").trim();
    const symptoms = cleanSymptoms(entry.symptoms);
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
      const saved = await adminUpdateHealthDisorder(null, entry.id, {
        title,
        description,
        symptoms,
        type: entry.type || "acute",
      });
      setItems((list) => list.map((row) => (row.id === entry.id ? saved : row)));
      setEditingId(null);
      setEditSnapshot(null);
      onToast?.("Health disorder saved");
    } catch (error) {
      onToast?.(error?.message || "Failed to save health disorder");
    } finally {
      setBusy(false);
    }
  }

  async function addItem() {
    const title = String(draft.title || "").trim();
    const description = String(draft.description || "").trim();
    const symptoms = cleanSymptoms(draft.symptoms);
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
      setDraft(EMPTY_DRAFT);
      setCreating(false);
      onToast?.(`${created.title} added`);
      setPage(1);
      await load(1);
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
      if (editingId === target.id) {
        setEditingId(null);
        setEditSnapshot(null);
      }
      onToast?.(`${target.title} removed`);
      const nextTotal = Math.max(0, pagination.total - 1);
      const nextPages = Math.max(1, Math.ceil(nextTotal / PAGE_SIZE));
      const nextPage = Math.min(page, nextPages);
      setPage(nextPage);
      await load(nextPage);
    } catch (error) {
      onToast?.(error?.message || "Failed to delete health disorder");
    } finally {
      setBusy(false);
    }
  }

  async function moveItem(index, direction) {
    await moveConfigListItem({
      canReorder,
      busy,
      setBusy,
      items,
      setItems,
      index,
      direction,
      listAll: async () => {
        const result = await adminListHealthDisorders(null, { page: 1, limit: 200 });
        return result?.healthDisorders || [];
      },
      updateItem: (id, fields) => adminUpdateHealthDisorder(null, id, fields),
      reload: () => load(page),
      onToast,
    });
  }

  const canReorder = true;
  const locked = loading || busy;
  const totalCount = pagination.total || items.length;

  return (
    <div className="ua-cfg-bl ua-cfg-hd">
      <SectionSurfacePanel
        sectionId="health-disorders"
        editor={editor}
        setEditor={setEditor}
        onToast={onToast}
      />
      <Panel
        title="Health disorders"
        subtitle={
          loading
            ? "Loading health disorders…"
            : `Catalog from HealthDisorder · ${activeCount} of ${items.length} live · use arrows to reorder`
        }
        actions={
          loading ? null : (
            <button
              type="button"
              className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-tf-add-btn"
              disabled={locked || creating}
              onClick={() => {
                cancelEdit();
                setCreating(true);
              }}
            >
              + Add disorder
            </button>
          )
        }
      >
        {creating ? (
          <section className="ua-cfg-rc-new">
            <div className="ua-cfg-rc-new__head">
              <strong><span aria-hidden="true">🩺</span> New disorder</strong>
              <button
                type="button"
                className="ua-cfg-icon-btn"
                aria-label="Close"
                onClick={() => {
                  setCreating(false);
                  setDraft(EMPTY_DRAFT);
                }}
              >
                ×
              </button>
            </div>
            <div className="ua-cfg-rc-new__fields">
              <label className="ua-cfg-rc-field">
                <span>Title</span>
                <input
                  className="ua-cfg-vh-input"
                  placeholder="e.g. Type 2 diabetes"
                  value={draft.title}
                  disabled={locked}
                  onChange={(event) => setDraft((prev) => ({
                    ...prev,
                    title: event.target.value,
                  }))}
                />
              </label>
              <label className="ua-cfg-rc-field">
                <span>Type</span>
                <CfgSelect
                  className="ua-cfg-hd-type"
                  options={TYPE_OPTIONS}
                  value={draft.type}
                  disabled={locked}
                  onChange={(value) => setDraft((prev) => ({ ...prev, type: value }))}
                  ariaLabel="Disorder type"
                  placeholder="Type"
                />
              </label>
              <label className="ua-cfg-rc-field ua-cfg-rc-field--wide">
                <span>Description</span>
                <textarea
                  className="ua-cfg-tf-story ua-cfg-bl-edit__desc"
                  rows={6}
                  placeholder="Write the disorder description…"
                  value={draft.description}
                  disabled={locked}
                  onChange={(event) => setDraft((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))}
                />
              </label>
              <div className="ua-cfg-rc-field ua-cfg-rc-field--wide">
                <span>Symptoms</span>
                <SymptomsEditor
                  value={draft.symptoms}
                  disabled={locked}
                  onChange={(symptoms) => setDraft((prev) => ({ ...prev, symptoms }))}
                />
              </div>
              <div className="ua-cfg-bl-new-foot">
                {/* <button
                  type="button"
                  className="ua-cfg-btn ua-cfg-btn--outline"
                  disabled={locked}
                  onClick={() => {
                    setCreating(false);
                    setDraft(EMPTY_DRAFT);
                  }}
                >
                  Cancel
                </button> */}
                <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" disabled={locked} onClick={addItem}>
                  {busy && creating ? "Saving…" : "Add disorder"}
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {loading && !items.length ? (
          <p className="ua-cfg-panel__sub">Fetching health disorders…</p>
        ) : items.length ? (
          <div className="ua-cfg-rc-list">
            {items.map((entry, index) => {
              const editing = editingId === entry.id;
              const live = entry.status === "active";
              return (
                <article
                  key={entry.id}
                  className={`ua-cfg-rc-item ua-cfg-bl-item ua-cfg-hd-item${editing ? " is-editing" : ""}`}
                >
                  <div className="ua-cfg-rc-item__body">
                    <div className="ua-cfg-bl-item__head">
                      <div className="ua-cfg-bl-item__identity">
                        {editing ? (
                          <div className="ua-cfg-hd-edit">
                            <label className="ua-cfg-rc-field">
                              <span>Title</span>
                              <input
                                className="ua-cfg-vh-input"
                                placeholder="Enter disorder title"
                                value={entry.title}
                                disabled={locked}
                                onChange={(event) => updateLocalItem(entry.id, {
                                  title: event.target.value,
                                })}
                              />
                            </label>
                            <label className="ua-cfg-rc-field">
                              <span>Type</span>
                              <CfgSelect
                                className="ua-cfg-hd-type"
                                options={TYPE_OPTIONS}
                                value={entry.type || "acute"}
                                disabled={locked}
                                onChange={(value) => updateLocalItem(entry.id, { type: value })}
                                ariaLabel="Disorder type"
                                placeholder="Type"
                              />
                            </label>
                            <label className="ua-cfg-rc-field ua-cfg-rc-field--wide">
                              <span>Description</span>
                              <textarea
                                className="ua-cfg-tf-story ua-cfg-bl-edit__desc"
                                rows={6}
                                placeholder="Enter description"
                                value={entry.description}
                                disabled={locked}
                                onChange={(event) => updateLocalItem(entry.id, {
                                  description: event.target.value,
                                })}
                              />
                            </label>
                            <div className="ua-cfg-rc-field ua-cfg-rc-field--wide">
                              <span>Symptoms</span>
                              <SymptomsEditor
                                value={entry.symptoms}
                                disabled={locked}
                                onChange={(symptoms) => updateLocalItem(entry.id, { symptoms })}
                              />
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="ua-cfg-hd-item__title-row">
                              <strong>{entry.title}</strong>
                              <span className={`ua-cfg-rc-pill ua-cfg-hd-flag ua-cfg-hd-flag--${entry.type}`}>
                                {typeLabel(entry.type)}
                              </span>
                            </div>
                            <p>{entry.description || "No description yet."}</p>
                            <div className="ua-cfg-hd-symptoms">
                              {(entry.symptoms || []).length
                                ? entry.symptoms.map((symptom) => (
                                    <span key={symptom} className="ua-cfg-hd-chip">{symptom}</span>
                                  ))
                                : <span className="ua-cfg-panel__sub">No symptoms</span>}
                            </div>
                          </>
                        )}
                      </div>
                      <div className="ua-cfg-bl-item__actions">
                        <div className="ua-cfg-bl-item__surfaces">
                          <div className="ua-cfg-bl-item__live">
                            <span className={`ua-cfg-faq__shown${live ? " is-on" : ""}`}>
                              {live ? "LIVE" : "HIDDEN"}
                            </span>
                            <button
                              type="button"
                              className={`ua-toggle ua-toggle--sm${live ? " ua-toggle--on" : ""}`}
                              aria-pressed={live}
                              aria-label={`${entry.title} ${live ? "live" : "hidden"}`}
                              disabled={locked}
                              onClick={() => toggleStatus(entry)}
                            >
                              <span className="ua-toggle__knob" />
                            </button>
                          </div>
                        </div>
                        <div className="ua-cfg-tf-item__moves">
                          <button
                            type="button"
                            className="ua-cfg-icon-btn"
                            disabled={locked || index === 0}
                            onClick={() => moveItem(index, -1)}
                            aria-label="Move up"
                            title="Move up"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className="ua-cfg-icon-btn"
                            disabled={locked || index === items.length - 1}
                            onClick={() => moveItem(index, 1)}
                            aria-label="Move down"
                            title="Move down"
                          >
                            ↓
                          </button>
                        </div>
                        <div className="ua-cfg-bl-item__btns">
                          {editing ? (
                            <>
                              <button
                                type="button"
                                className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm"
                                disabled={locked}
                                onClick={() => saveEdit(entry)}
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm"
                                disabled={locked}
                                onClick={cancelEdit}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm"
                              disabled={locked}
                              onClick={() => startEdit(entry)}
                            >
                              Edit
                            </button>
                          )}
                          <button
                            type="button"
                            className="ua-cfg-icon-btn"
                            aria-label="Delete"
                            disabled={locked}
                            onClick={() => setPendingDelete(entry)}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="ua-cfg-panel__sub">No health disorders yet. Add one to populate the catalog.</p>
        )}

        {!loading && pagination.total > 0 ? (
          <ListPagination
            page={pagination.page}
            pages={pagination.pages}
            total={pagination.total}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            label="Health disorders pagination"
          />
        ) : null}
      </Panel>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete health disorder?"
        body={
          pendingDelete
            ? `Remove “${pendingDelete.title}” from the catalog? This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        confirmTone="danger"
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
