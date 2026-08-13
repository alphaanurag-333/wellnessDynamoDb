import { useState } from "react";
import {
  parsePointersFromText,
  rxProtocolExcerpt,
} from "../data/rxBankData.js";

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

function RxProtocolEditModal({ protocol, onClose, onChange, onDelete, onToast }) {
  const [newPointer, setNewPointer] = useState("");
  const [showNewRow, setShowNewRow] = useState(false);

  if (!protocol) return null;

  function updatePointer(index, value) {
    const pointers = protocol.pointers.map((entry, rowIndex) =>
      rowIndex === index ? value : entry,
    );
    onChange({ ...protocol, pointers });
  }

  function removePointer(index) {
    if (protocol.pointers.length <= 1) {
      onToast("A protocol needs at least one pointer");
      return;
    }
    onChange({
      ...protocol,
      pointers: protocol.pointers.filter((_, rowIndex) => rowIndex !== index),
    });
  }

  function commitNewPointer() {
    const text = newPointer.trim();
    if (!text) {
      setShowNewRow(false);
      setNewPointer("");
      return;
    }
    onChange({ ...protocol, pointers: [...protocol.pointers, text] });
    setNewPointer("");
    setShowNewRow(false);
    onToast("Pointer added");
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
              onClick={() => onChange({ ...protocol, live: !protocol.live })}
            >
              <span className="ua-toggle__knob" />
            </button>
            <button
              type="button"
              className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm ua-cfg-rx-modal__delete"
              onClick={() => {
                onDelete(protocol.id);
                onClose();
              }}
            >
              Delete
            </button>
            <button type="button" className="ua-cfg-icon-btn" aria-label="Close" onClick={onClose}>
              ×
            </button>
          </div>
        </div>

        <ul className="ua-cfg-rx-modal__list">
          {protocol.pointers.map((pointer, index) => (
            <li key={`${protocol.id}-${index}`} className="ua-cfg-rx-modal__item">
              <span className="ua-cfg-rx-modal__bullet" aria-hidden="true" />
              <input
                type="text"
                className="ua-cfg-rx-modal__pointer"
                value={pointer}
                onChange={(event) => updatePointer(index, event.target.value)}
              />
              <button
                type="button"
                className="ua-cfg-icon-btn ua-cfg-rx-modal__remove"
                aria-label="Remove pointer"
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

  const selectedProtocol = protocols.find((entry) => entry.id === selectedId) ?? null;

  function updateProtocol(nextProtocol) {
    setProtocols(protocols.map((entry) => (entry.id === nextProtocol.id ? nextProtocol : entry)));
  }

  function deleteProtocol(id) {
    setProtocols(protocols.filter((entry) => entry.id !== id));
    onToast("Protocol removed");
  }

  function addProtocol() {
    const title = newTitle.trim();
    const pointers = parsePointersFromText(newPointersText);
    if (!title) {
      onToast("Protocol name is required");
      return;
    }
    if (!pointers.length) {
      onToast("Write at least one pointer");
      return;
    }
    setProtocols([
      ...protocols,
      {
        id: `rx-${Date.now()}`,
        title,
        pointers,
        live: true,
      },
    ]);
    setNewTitle("");
    setNewPointersText("");
    setShowAddForm(false);
    onToast(`${title} added to the book`);
  }

  return (
    <>
      <Panel
        className="ua-cfg-rx"
        title="Master prescription book"
        subtitle="Coaches pick a protocol from here and can edit it per client. Open one to change its pointers, hide it, or delete it."
        actions={
          <span className="ua-cfg-rx__count">{liveCount} of {protocols.length} live</span>
        }
      >
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
      </Panel>

      <Panel
        title="Add a protocol"
        subtitle="Name it and write one pointer per line — it joins the book for every coach."
        actions={
          !showAddForm ? (
            <button
              type="button"
              className="ua-cfg-rx-new-btn"
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
              onChange={(event) => setNewTitle(event.target.value)}
            />
            <textarea
              className="ua-cfg-rx-add__pointers"
              rows={6}
              placeholder="One pointer per line…"
              value={newPointersText}
              onChange={(event) => setNewPointersText(event.target.value)}
            />
            <div className="ua-cfg-rx-add__actions">
              <button type="button" className="ua-cfg-btn ua-cfg-rx-add__submit" onClick={addProtocol}>
                Add to book
              </button>
              <button
                type="button"
                className="ua-cfg-btn ua-cfg-btn--outline"
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
          onClose={() => setSelectedId(null)}
          onChange={updateProtocol}
          onDelete={deleteProtocol}
          onToast={onToast}
        />
      ) : null}
    </>
  );
}

export { RX_BANK_PROTOCOLS } from "../data/rxBankData.js";
