import { useState } from "react";
import { asCopyString } from "../data/bannerConfigData.js";
import { joinFooterLinks, parseFooterLinks } from "../data/footerConfigData.js";

function Panel({ title, subtitle, actions, children }) {
  const hasHead = Boolean(title || subtitle || actions);
  return (
    <section className="ua-cfg-panel">
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

function ColumnCard({ column, editing, draft, onToggle, onEdit, onSave, onDelete, onDraftChange }) {
  const isEditing = Boolean(editing);
  const heading = asCopyString(column.heading);

  return (
    <article className={`ua-cfg-ft-col${isEditing ? " is-editing" : ""}`}>
      <div className="ua-cfg-ft-col__head">
        <strong className="ua-cfg-ft-col__heading">{heading}</strong>
        <span className={`ua-cfg-faq__shown${column.live ? " is-on" : ""}`}>
          {column.live ? "LIVE" : "HIDDEN"}
        </span>
        <button
          type="button"
          className={`ua-toggle ua-toggle--sm${column.live ? " ua-toggle--on" : ""}`}
          aria-pressed={column.live}
          aria-label={`${heading} ${column.live ? "on" : "off"}`}
          onClick={onToggle}
        >
          <span className="ua-toggle__knob" />
        </button>
        {isEditing ? (
          <button type="button" className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm" onClick={onSave}>
            Save
          </button>
        ) : (
          <button type="button" className="ua-cfg-cr-link ua-cfg-cr-link--modify" onClick={onEdit}>
            Edit
          </button>
        )}
        <button type="button" className="ua-cfg-icon-btn" aria-label={`Remove ${heading}`} onClick={onDelete}>
          ×
        </button>
      </div>
      {isEditing ? (
        <input
          type="text"
          className="ua-cfg-ft-col__links-input"
          value={asCopyString(draft.links)}
          placeholder="Links · separate with ·"
          onChange={(event) => onDraftChange({ ...draft, links: event.target.value })}
        />
      ) : (
        <p className="ua-cfg-ft-col__links">{joinFooterLinks(column.links) || "No links yet"}</p>
      )}
    </article>
  );
}

export function FooterSettingSection({ columns, setColumns, bottomLine, setBottomLine, onToast }) {
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ heading: "", links: "" });
  const [showAdd, setShowAdd] = useState(false);
  const [newDraft, setNewDraft] = useState({ heading: "", links: "" });

  function startEdit(column) {
    setShowAdd(false);
    setEditingId(column.id);
    setDraft({ heading: asCopyString(column.heading), links: joinFooterLinks(column.links) });
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft({ heading: "", links: "" });
  }

  function saveEdit(id) {
    const links = parseFooterLinks(asCopyString(draft.links));
    if (!links.length) {
      onToast("Add at least one link");
      return;
    }
    setColumns((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, links } : entry)),
    );
    cancelEdit();
    onToast("Column saved");
  }

  function addColumn() {
    const heading = asCopyString(newDraft.heading).trim();
    const links = parseFooterLinks(asCopyString(newDraft.links));
    if (!heading) {
      onToast("Column heading is required");
      return;
    }
    if (!links.length) {
      onToast("Add at least one link");
      return;
    }
    setColumns((prev) => [
      ...prev,
      { id: `ft-${Date.now()}`, heading, links, live: true },
    ]);
    setNewDraft({ heading: "", links: "" });
    setShowAdd(false);
    onToast(`${heading} column added`);
  }

  return (
    <div className="ua-cfg-ft">
      <Panel
        title="Footer columns"
        subtitle="Edit the heading and the links inside each column."
        actions={
          <button
            type="button"
            className="ua-cfg-rc-add"
            onClick={() => {
              cancelEdit();
              setShowAdd(true);
            }}
          >
            + Add column
          </button>
        }
      >
        {showAdd ? (
          <section className="ua-cfg-ft-add">
            <div className="ua-cfg-ft-add__head">
              <strong><span aria-hidden="true">📦</span> New footer column</strong>
              <button
                type="button"
                className="ua-cfg-icon-btn"
                aria-label="Close"
                onClick={() => {
                  setShowAdd(false);
                  setNewDraft({ heading: "", links: "" });
                }}
              >
                ×
              </button>
            </div>
            <div className="ua-cfg-ft-add__row">
              <input
                type="text"
                className="ua-cfg-vh-input"
                placeholder="Heading · e.g. Resources"
                value={asCopyString(newDraft.heading)}
                onChange={(event) => setNewDraft((prev) => ({ ...prev, heading: event.target.value }))}
              />
              <input
                type="text"
                className="ua-cfg-vh-input"
                placeholder="Links · separate with ·"
                value={asCopyString(newDraft.links)}
                onChange={(event) => setNewDraft((prev) => ({ ...prev, links: event.target.value }))}
              />
              <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" onClick={addColumn}>
                Add column
              </button>
            </div>
          </section>
        ) : null}

        <div className="ua-cfg-ft-grid">
          {columns.map((column) => (
            <ColumnCard
              key={column.id}
              column={column}
              editing={editingId === column.id}
              draft={draft}
              onDraftChange={setDraft}
              onToggle={() => {
                setColumns((prev) =>
                  prev.map((entry) =>
                    entry.id === column.id ? { ...entry, live: !entry.live } : entry,
                  ),
                );
              }}
              onEdit={() => startEdit(column)}
              onSave={() => saveEdit(column.id)}
              onDelete={() => {
                setColumns((prev) => prev.filter((entry) => entry.id !== column.id));
                if (editingId === column.id) cancelEdit();
                onToast(`${asCopyString(column.heading)} removed`);
              }}
            />
          ))}
        </div>
      </Panel>

      <Panel title="Bottom line">
        <input
          type="text"
          className="ua-cfg-ft-bottom"
          value={asCopyString(bottomLine)}
          onChange={(event) => setBottomLine(event.target.value)}
        />
      </Panel>
    </div>
  );
}
