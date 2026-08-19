import { useCallback, useEffect, useState } from "react";
import { getAppSocialLinks, saveAppSocialLinks } from "../api/socialLinksApi.js";
import { asCopyString } from "../data/bannerConfigData.js";
import {
  SOCIAL_APP_CONFIG_FIELDS,
  socialIconForLabel,
  toDisplaySocialUrl,
  toStoredSocialUrl,
} from "../data/socialLinksConfigData.js";

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
  persistToAppConfig = false,
  labelPlaceholder = "Label · e.g. Facebook",
  urlPlaceholder = "URL · e.g. facebook.com/irwellness",
}) {
  const [loading, setLoading] = useState(persistToAppConfig);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draftUrl, setDraftUrl] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newDraft, setNewDraft] = useState({ label: "", url: "" });

  const loadLinks = useCallback(async () => {
    if (!persistToAppConfig) return;
    setLoading(true);
    try {
      const next = await getAppSocialLinks();
      setLinks(next);
    } catch (error) {
      onToast(error?.message || "Failed to load social links");
      setLinks(SOCIAL_APP_CONFIG_FIELDS.map((field) => ({
        id: field.id,
        label: field.label,
        icon: field.icon,
        url: "",
      })));
    } finally {
      setLoading(false);
    }
  }, [onToast, persistToAppConfig, setLinks]);

  useEffect(() => {
    loadLinks();
  }, [loadLinks]);

  function startEdit(entry) {
    setShowAdd(false);
    setEditingId(entry.id);
    setDraftUrl(asCopyString(entry.url));
  }

  function cancelEdit() {
    setEditingId(null);
    setDraftUrl("");
  }

  async function persist(next, message) {
    if (!persistToAppConfig) {
      setLinks(next);
      if (message) onToast(message);
      return true;
    }
    setBusy(true);
    try {
      const saved = await saveAppSocialLinks(next);
      setLinks(saved);
      if (message) onToast(message);
      return true;
    } catch (error) {
      onToast(error?.message || "Failed to save social links");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(id) {
    const stored = toStoredSocialUrl(draftUrl);
    if (stored === null || !String(draftUrl || "").trim()) {
      onToast("Enter a valid http(s) URL");
      return;
    }
    const next = links.map((entry) => (
      entry.id === id ? { ...entry, url: toDisplaySocialUrl(stored) } : entry
    ));
    const ok = await persist(next, "Link saved");
    if (ok) cancelEdit();
  }

  async function addLink() {
    const label = asCopyString(newDraft.label).trim();
    const urlRaw = asCopyString(newDraft.url);
    const stored = toStoredSocialUrl(urlRaw);
    if (!label) {
      onToast("Label is required");
      return;
    }
    if (stored === null || !urlRaw.trim()) {
      onToast("Enter a valid http(s) URL");
      return;
    }

    const nextEntry = {
      id: `sm-${Date.now()}`,
      label,
      url: toDisplaySocialUrl(stored),
      icon: defaultIcon || socialIconForLabel(label),
    };

    const ok = await persist([...links, nextEntry], `${nextEntry.label} added`);
    if (ok) {
      setNewDraft({ label: "", url: "" });
      setShowAdd(false);
    }
  }

  async function removeLink(entry) {
    if (persistToAppConfig) return;
    const next = links.filter((row) => row.id !== entry.id);
    const ok = await persist(next, `${asCopyString(entry.label)} removed`);
    if (ok && editingId === entry.id) cancelEdit();
  }

  const canAdd = !persistToAppConfig;
  const locked = busy || loading;

  return (
    <div className="ua-cfg-sm">
    <Panel
      title="Links"
      subtitle={
        loading
          ? "Loading social links…"
          : persistToAppConfig
            ? "Shown in the website footer. Facebook, Instagram, YouTube, and LinkedIn are saved to App Config."
            : "Shown in the website footer."
      }
      actions={
        loading || !canAdd ? null : (
          <button
            type="button"
            className="ua-cfg-rc-add"
            disabled={locked}
            onClick={() => {
              cancelEdit();
              setShowAdd(true);
              setNewDraft({ label: "", url: "" });
            }}
          >
            + Add link
          </button>
        )
      }
    >
      {loading ? (
        <p className="ua-cfg-panel__sub">Fetching social links from App Config…</p>
      ) : (
        <>
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
                  disabled={locked}
                  onChange={(event) => setNewDraft((prev) => ({ ...prev, url: event.target.value }))}
                />
                <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" disabled={locked} onClick={addLink}>
                  Add link
                </button>
              </div>
            </section>
          ) : null}

          {links.length ? (
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
                        disabled={locked}
                        onChange={(event) => setDraftUrl(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") saveEdit(entry.id);
                          if (event.key === "Escape") cancelEdit();
                        }}
                      />
                    ) : (
                      <span className="ua-cfg-sm-row__url">{url || "Not set"}</span>
                    )}
                    <div className="ua-cfg-sm-row__actions">
                      {isEditing ? (
                        <button
                          type="button"
                          className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm"
                          disabled={locked}
                          onClick={() => saveEdit(entry.id)}
                        >
                          Save
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="ua-cfg-cr-link ua-cfg-cr-link--modify"
                          disabled={locked}
                          onClick={() => startEdit(entry)}
                        >
                          Edit
                        </button>
                      )}
                      {persistToAppConfig ? null : (
                        <button
                          type="button"
                          className="ua-cfg-icon-btn"
                          aria-label={`Remove ${label}`}
                          disabled={locked}
                          onClick={() => removeLink(entry)}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : persistToAppConfig ? (
            <p className="ua-cfg-panel__sub">Could not load social links.</p>
          ) : null}
        </>
      )}
    </Panel>
    </div>
  );
}
