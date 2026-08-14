import { useState } from "react";
import { asCopyString } from "../data/bannerConfigData.js";
import { socialIconForLabel } from "../data/socialLinksConfigData.js";

function Panel({ title, subtitle, actions, children }) {
  return (
    <section className="ua-cfg-panel">
      <div className="ua-cfg-panel__head">
        <div>
          {title ? <h3 className="ua-cfg-panel__title">{title}</h3> : null}
          {subtitle ? <p className="ua-cfg-panel__sub">{subtitle}</p> : null}
        </div>
        {actions ? <div className="ua-cfg-panel__actions">{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

function SocialGlyph({ icon }) {
  const mark =
    icon === "instagram" ? "📷" :
    icon === "youtube" ? "▶" :
    icon === "linkedin" ? "💼" :
    icon === "x" ? "𝕏" :
    icon === "facebook" ? "f" :
    icon === "globe" ? "🌐" :
    "🔗";

  return (
    <span className={`ua-cfg-sm-icon ua-cfg-sm-icon--${icon}`} aria-hidden="true">
      {mark}
    </span>
  );
}

export function SocialLinksSection({
  links,
  setLinks,
  onToast,
  defaultIcon,
  labelPlaceholder = "Label · e.g. Facebook",
  urlPlaceholder = "URL · e.g. facebook.com/irwellness",
}) {
  const [editingId, setEditingId] = useState(null);
  const [draftUrl, setDraftUrl] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newDraft, setNewDraft] = useState({ label: "", url: "" });

  function startEdit(entry) {
    setShowAdd(false);
    setEditingId(entry.id);
    setDraftUrl(asCopyString(entry.url));
  }

  function cancelEdit() {
    setEditingId(null);
    setDraftUrl("");
  }

  function saveEdit(id) {
    const url = asCopyString(draftUrl).trim().replace(/^https?:\/\//i, "");
    if (!url) {
      onToast("URL is required");
      return;
    }
    setLinks((prev) => prev.map((entry) => (entry.id === id ? { ...entry, url } : entry)));
    cancelEdit();
    onToast("Link saved");
  }

  function addLink() {
    const label = asCopyString(newDraft.label).trim();
    const url = asCopyString(newDraft.url).trim().replace(/^https?:\/\//i, "");
    if (!label) {
      onToast("Label is required");
      return;
    }
    if (!url) {
      onToast("URL is required");
      return;
    }
    setLinks((prev) => [
      ...prev,
      {
        id: `sm-${Date.now()}`,
        label,
        url,
        icon: defaultIcon || socialIconForLabel(label),
      },
    ]);
    setNewDraft({ label: "", url: "" });
    setShowAdd(false);
    onToast(`${label} added`);
  }

  return (
    <Panel
      title="Links"
      subtitle="Shown in the website footer."
      actions={
        <button
          type="button"
          className="ua-cfg-rc-add"
          onClick={() => {
            cancelEdit();
            setShowAdd(true);
          }}
        >
          + Add link
        </button>
      }
    >
      {showAdd ? (
        <section className="ua-cfg-sm-add">
          <div className="ua-cfg-sm-add__head">
            <strong><span aria-hidden="true">🔗</span> New link</strong>
            <button
              type="button"
              className="ua-cfg-icon-btn"
              aria-label="Close"
              onClick={() => {
                setShowAdd(false);
                setNewDraft({ label: "", url: "" });
              }}
            >
              ×
            </button>
          </div>
          <div className="ua-cfg-sm-add__row">
            <input
              type="text"
              className="ua-cfg-vh-input"
              placeholder={labelPlaceholder}
              value={asCopyString(newDraft.label)}
              onChange={(event) => setNewDraft((prev) => ({ ...prev, label: event.target.value }))}
            />
            <input
              type="text"
              className="ua-cfg-vh-input"
              placeholder={urlPlaceholder}
              value={asCopyString(newDraft.url)}
              onChange={(event) => setNewDraft((prev) => ({ ...prev, url: event.target.value }))}
            />
            <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" onClick={addLink}>
              Add link
            </button>
          </div>
        </section>
      ) : null}

      <div className="ua-cfg-sm-list">
        {links.map((entry) => {
          const isEditing = editingId === entry.id;
          const label = asCopyString(entry.label);
          const url = asCopyString(entry.url);
          return (
            <article key={entry.id} className={`ua-cfg-sm-row${isEditing ? " is-editing" : ""}`}>
              <SocialGlyph icon={entry.icon} />
              <strong className="ua-cfg-sm-row__label">{label}</strong>
              {isEditing ? (
                <input
                  type="text"
                  className="ua-cfg-sm-row__input"
                  value={asCopyString(draftUrl)}
                  onChange={(event) => setDraftUrl(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") saveEdit(entry.id);
                    if (event.key === "Escape") cancelEdit();
                  }}
                />
              ) : (
                <span className="ua-cfg-sm-row__url">{url}</span>
              )}
              {isEditing ? (
                <button type="button" className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm" onClick={() => saveEdit(entry.id)}>
                  Save
                </button>
              ) : (
                <button type="button" className="ua-cfg-cr-link ua-cfg-cr-link--modify" onClick={() => startEdit(entry)}>
                  Edit
                </button>
              )}
              <button
                type="button"
                className="ua-cfg-icon-btn"
                aria-label={`Remove ${label}`}
                onClick={() => {
                  setLinks((prev) => prev.filter((row) => row.id !== entry.id));
                  if (editingId === entry.id) cancelEdit();
                  onToast(`${label} removed`);
                }}
              >
                ×
              </button>
            </article>
          );
        })}
      </div>
    </Panel>
  );
}
