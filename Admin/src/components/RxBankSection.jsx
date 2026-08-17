import { useCallback, useEffect, useRef, useState } from "react";
import {
  adminCreateRxProtocol,
  adminDeleteRxProtocol,
  adminListRxProtocols,
  adminUpdateRxProtocol,
} from "../api/wellnessPrescriptionCatalogApi.js";
import {
  parsePointersFromText,
  RX_BANK_PAGE_SIZE,
  rxProtocolExcerpt,
} from "../data/rxBankData.js";
import { ListPagination } from "./shared.jsx";
import { ConfirmDialog } from "./ConfirmDialog.jsx";

function samePointers(a = [], b = []) {
  if (a.length !== b.length) return false;
  return a.every((entry, index) => entry === b[index]);
}

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

function RxProtocolEditModal({ protocol, busy, onClose, onChange, onDelete, onToast }) {
  const [draftPointers, setDraftPointers] = useState(protocol.pointers);
  const [newPointer, setNewPointer] = useState("");
  const [showNewRow, setShowNewRow] = useState(false);

  useEffect(() => {
    setDraftPointers(protocol.pointers);
  }, [protocol.id, protocol.pointers]);

  if (!protocol) return null;

  async function persistPointers(next, message) {
    const cleaned = next.map((entry) => String(entry || "").trim()).filter(Boolean);
    if (!cleaned.length) {
      onToast("A protocol needs at least one pointer");
      setDraftPointers(protocol.pointers);
      return false;
    }
    if (samePointers(cleaned, protocol.pointers)) {
      setDraftPointers(cleaned);
      return true;
    }
    const saved = await onChange({ pointers: cleaned }, message);
    if (!saved) setDraftPointers(protocol.pointers);
    return saved;
  }

  function savePointer(index) {
    const next = [...draftPointers];
    const text = String(next[index] || "").trim();
    if (!text) {
      if (next.length <= 1) {
        onToast("A protocol needs at least one pointer");
        setDraftPointers(protocol.pointers);
        return;
      }
      next.splice(index, 1);
    } else {
      next[index] = text;
    }
    persistPointers(next, "Protocol saved");
  }

  function removePointer(index) {
    if (draftPointers.length <= 1) {
      onToast("A protocol needs at least one pointer");
      return;
    }
    persistPointers(
      draftPointers.filter((_, rowIndex) => rowIndex !== index),
      "Pointer removed",
    );
  }

  function commitNewPointer() {
    const text = newPointer.trim();
    if (!text) {
      setShowNewRow(false);
      setNewPointer("");
      return;
    }
    persistPointers([...draftPointers, text], "Pointer added");
    setNewPointer("");
    setShowNewRow(false);
  }

  return (
    <div className="ua-cp-modal-backdrop" onClick={onClose} role="presentation">
      <div className="ua-cfg-rx-modal" onClick={(event) => event.stopPropagation()} role="dialog">
        <div className="ua-cfg-rx-modal__head">
          <div>
            <h3 className="ua-cfg-rx-modal__title">{protocol.title}</h3>
            <p className="ua-cfg-rx-modal__sub">Protocol · master prescription book</p>
          </div>
          <div className="ua-cfg-rx-modal__actions">
            <span className="ua-cfg-rx-modal__live-label">Live</span>
            <button
              type="button"
              className={`ua-toggle ua-toggle--sm${protocol.live ? " ua-toggle--on" : ""}`}
              aria-pressed={protocol.live}
              disabled={busy}
              onClick={() => onChange({ live: !protocol.live }, protocol.live ? "Protocol hidden" : "Protocol is live")}
            >
              <span className="ua-toggle__knob" />
            </button>
            <button
              type="button"
              className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm ua-cfg-rx-modal__delete"
              disabled={busy}
              onClick={() => onDelete(protocol)}
            >
              Delete
            </button>
            <button type="button" className="ua-cfg-icon-btn" aria-label="Close" onClick={onClose}>
              ×
            </button>
          </div>
        </div>

        <ul className="ua-cfg-rx-modal__list">
          {draftPointers.map((pointer, index) => (
            <li key={`${protocol.id}-${index}`} className="ua-cfg-rx-modal__item">
              <span className="ua-cfg-rx-modal__bullet" aria-hidden="true" />
              <input
                type="text"
                className="ua-cfg-rx-modal__pointer"
                value={pointer}
                disabled={busy}
                onChange={(event) => {
                  const value = event.target.value;
                  setDraftPointers((prev) => prev.map((entry, rowIndex) => (rowIndex === index ? value : entry)));
                }}
                onBlur={() => savePointer(index)}
              />
              <button
                type="button"
                className="ua-cfg-icon-btn ua-cfg-rx-modal__remove"
                aria-label="Remove pointer"
                disabled={busy}
                onClick={() => removePointer(index)}
              >
                ×
              </button>
            </li>
          ))}
          {showNewRow ? (
            <li className="ua-cfg-rx-modal__item is-new">
              <span className="ua-cfg-rx-modal__bullet" aria-hidden="true" />
              <input
                type="text"
                className="ua-cfg-rx-modal__pointer"
                placeholder="New pointer"
                value={newPointer}
                autoFocus
                disabled={busy}
                onChange={(event) => setNewPointer(event.target.value)}
                onBlur={commitNewPointer}
                onKeyDown={(event) => {
                  if (event.key === "Enter") commitNewPointer();
                  if (event.key === "Escape") {
                    setNewPointer("");
                    setShowNewRow(false);
                  }
                }}
              />
              <button
                type="button"
                className="ua-cfg-icon-btn ua-cfg-rx-modal__remove"
                aria-label="Cancel new pointer"
                disabled={busy}
                onClick={() => {
                  setNewPointer("");
                  setShowNewRow(false);
                }}
              >
                ×
              </button>
            </li>
          ) : null}
        </ul>

        <button
          type="button"
          className="ua-cfg-rx-modal__add"
          disabled={busy}
          onClick={() => setShowNewRow(true)}
        >
          + Add pointer
        </button>
      </div>
    </div>
  );
}

export function RxBankSection({ protocols, setProtocols, onToast }) {
  const liveCount = protocols.filter((entry) => entry.live).length;
  const [selectedId, setSelectedId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPointersText, setNewPointersText] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: RX_BANK_PAGE_SIZE,
    total: 0,
    pages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const protocolsRef = useRef(protocols);

  const selectedProtocol = protocols.find((entry) => entry.id === selectedId) ?? null;

  const loadProtocols = useCallback(async (pageOverride) => {
    const nextPage = pageOverride ?? page;
    setLoading(true);
    try {
      const { protocols: rows, pagination: nextPagination } = await adminListRxProtocols(null, {
        page: nextPage,
        limit: RX_BANK_PAGE_SIZE,
      });
      const next = rows || [];
      setProtocols(next);
      protocolsRef.current = next;
      setPagination({
        page: Number(nextPagination?.page) || nextPage,
        limit: Number(nextPagination?.limit) || RX_BANK_PAGE_SIZE,
        total: Number(nextPagination?.total) || next.length,
        pages: Number(nextPagination?.pages) || 1,
      });
    } catch (error) {
      onToast(error?.message || "Failed to load prescription bank");
      setProtocols([]);
      protocolsRef.current = [];
      setPagination({ page: 1, limit: RX_BANK_PAGE_SIZE, total: 0, pages: 1 });
    } finally {
      setLoading(false);
    }
  }, [onToast, page, setProtocols]);

  useEffect(() => {
    loadProtocols();
  }, [loadProtocols]);

  useEffect(() => {
    if (!loading && page > pagination.pages) setPage(pagination.pages);
  }, [loading, page, pagination.pages]);

  useEffect(() => {
    protocolsRef.current = protocols;
  }, [protocols]);

  async function persistProtocol(id, fields, successMessage) {
    setBusy(true);
    try {
      const updated = await adminUpdateRxProtocol(null, id, fields);
      if (!updated) throw new Error("Failed to save protocol");
      setProtocols((prev) => prev.map((entry) => (entry.id === id ? { ...entry, ...updated } : entry)));
      if (successMessage) onToast(successMessage);
      return true;
    } catch (error) {
      onToast(error?.message || "Failed to save protocol");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function addProtocol() {
    const title = newTitle.trim();
    const pointers = parsePointersFromText(newPointersText);
    if (!title) {
      onToast("Protocol name is required");
      return;
    }
    if (title.length < 2) {
      onToast("Protocol name must be at least 2 characters");
      return;
    }
    if (!pointers.length) {
      onToast("Write at least one pointer");
      return;
    }
    setBusy(true);
    try {
      const created = await adminCreateRxProtocol(null, { title, pointers, live: true });
      if (!created) throw new Error("Failed to add protocol");
      setNewTitle("");
      setNewPointersText("");
      setShowAddForm(false);
      onToast(`${title} added to the book`);
      const lastPage = Math.max(1, Math.ceil((pagination.total + 1) / RX_BANK_PAGE_SIZE));
      setPage(lastPage);
      await loadProtocols(lastPage);
    } catch (error) {
      onToast(error?.message || "Failed to add protocol");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete || busy) return;
    const protocol = pendingDelete;
    setPendingDelete(null);
    if (selectedId === protocol.id) setSelectedId(null);
    setBusy(true);
    try {
      await adminDeleteRxProtocol(null, protocol.id);
      onToast("Protocol removed");
      const remaining = protocolsRef.current.filter((entry) => entry.id !== protocol.id).length;
      if (remaining === 0 && page > 1) {
        const nextPage = page - 1;
        setPage(nextPage);
        await loadProtocols(nextPage);
      } else {
        await loadProtocols(page);
      }
    } catch (error) {
      onToast(error?.message || "Failed to delete protocol");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Panel
        className="ua-cfg-rx"
        title="Master prescription book"
        subtitle={
          loading
            ? "Loading prescription bank…"
            : "Coaches pick a protocol from here and can edit it per client. Open one to change its pointers, hide it, or delete it."
        }
        actions={
          loading ? null : (
            <span className="ua-cfg-rx__count">
              {liveCount} live on this page · {pagination.total} in book
            </span>
          )
        }
      >
        {loading ? (
          <p className="ua-cfg-panel__sub">Fetching protocols from the server…</p>
        ) : protocols.length ? (
          <div className="ua-cfg-rx-grid">
            {protocols.map((protocol) => (
              <button
                key={protocol.id}
                type="button"
                className={`ua-cfg-rx-card${selectedId === protocol.id ? " is-selected" : ""}`}
                onClick={() => setSelectedId(protocol.id)}
              >
                <div className="ua-cfg-rx-card__top">
                  <div className="ua-cfg-rx-card__title-wrap">
                    <span className="ua-cfg-rx-card__dot" aria-hidden="true" />
                    <strong>{protocol.title}</strong>
                  </div>
                  {protocol.live ? <span className="ua-cfg-rx-card__live">Live</span> : null}
                </div>
                <p className="ua-cfg-rx-card__excerpt">{rxProtocolExcerpt(protocol.pointers)}</p>
                <span className="ua-cfg-rx-card__count">
                  {protocol.pointers.length} pointer{protocol.pointers.length === 1 ? "" : "s"}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <p className="ua-cfg-panel__sub">No protocols in the book yet. Add one below.</p>
        )}

        {!loading && pagination.total > 0 ? (
          <ListPagination
            page={pagination.page}
            pages={pagination.pages}
            total={pagination.total}
            pageSize={RX_BANK_PAGE_SIZE}
            onPageChange={setPage}
            label="Prescription bank pagination"
          />
        ) : null}
      </Panel>

      <Panel
        title="Add a protocol"
        subtitle="Name it and write one pointer per line — it joins the book for every coach."
        actions={
          !showAddForm ? (
            <button
              type="button"
              className="ua-cfg-rx-new-btn"
              disabled={busy || loading}
              onClick={() => setShowAddForm(true)}
            >
              + New protocol
            </button>
          ) : null
        }
      >
        {showAddForm ? (
          <div className="ua-cfg-rx-add">
            <input
              type="text"
              className="ua-cfg-rx-add__title"
              placeholder="Protocol name · e.g. Alkaline Reset · Day 1-3"
              value={newTitle}
              disabled={busy}
              onChange={(event) => setNewTitle(event.target.value)}
            />
            <textarea
              className="ua-cfg-rx-add__pointers"
              rows={6}
              placeholder="One pointer per line…"
              value={newPointersText}
              disabled={busy}
              onChange={(event) => setNewPointersText(event.target.value)}
            />
            <div className="ua-cfg-rx-add__actions">
              <button type="button" className="ua-cfg-btn ua-cfg-rx-add__submit" disabled={busy} onClick={addProtocol}>
                {busy ? "Adding…" : "Add to book"}
              </button>
              <button
                type="button"
                className="ua-cfg-btn ua-cfg-btn--outline"
                disabled={busy}
                onClick={() => {
                  setShowAddForm(false);
                  setNewTitle("");
                  setNewPointersText("");
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </Panel>

      {selectedProtocol ? (
        <RxProtocolEditModal
          protocol={selectedProtocol}
          busy={busy}
          onClose={() => setSelectedId(null)}
          onChange={(fields, message) => persistProtocol(selectedProtocol.id, fields, message)}
          onDelete={(protocol) => setPendingDelete(protocol)}
          onToast={onToast}
        />
      ) : null}

      <ConfirmDialog
        open={!!pendingDelete}
        tag="Delete protocol"
        title={pendingDelete ? `Remove “${pendingDelete.title}”?` : ""}
        body="This will permanently remove the protocol from the book. You can’t undo this."
        cancelLabel="Keep protocol"
        confirmLabel="Delete"
        confirmTone="danger"
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </>
  );
}

export { RX_BANK_PROTOCOLS } from "../data/rxBankData.js";
