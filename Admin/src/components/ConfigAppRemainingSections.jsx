import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createCustomTracker,
  getHealthProgressTrackers,
  saveHealthProgressTrackers,
} from "../api/healthProgressTrackersApi.js";
import { TRACKER_COLORS } from "../data/configDetailData.js";
import { DEFAULT_HEALTH_PROGRESS_TRACKERS } from "../data/healthProgressData.js";
import { ConfirmDialog } from "./ConfirmDialog.jsx";

function Panel({ title, subtitle, actions, children, className = "" }) {
  const hasHead = Boolean(title || subtitle || actions);
  return (
    <section className={`ua-cfg-panel${className ? ` ${className}` : ""}`}>
      {hasHead ? (
        <div style={{marginBottom
            :"0px"
        }} className="ua-cfg-panel__head">
          <div className="ua-cfg-panel__copy">
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

export function HealthProgressTrackersPanel({ items = [], setItems, onToast }) {
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const availableCount = items.filter((item) => item.enabled).length;

  const loadTrackers = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await getHealthProgressTrackers());
    } catch (error) {
      onToast(error?.message || "Failed to load health progress trackers");
      setItems(DEFAULT_HEALTH_PROGRESS_TRACKERS.map((row) => ({ ...row })));
    } finally {
      setLoading(false);
    }
  }, [onToast, setItems]);

  useEffect(() => {
    loadTrackers();
  }, [loadTrackers]);

  async function persist(nextItems, successMessage) {
    if (busy) return;
    const previous = items;
    setItems(nextItems);
    setBusy(true);
    try {
      setItems(await saveHealthProgressTrackers(nextItems));
      if (successMessage) onToast(successMessage);
    } catch (error) {
      setItems(previous);
      onToast(error?.message || "Failed to save health progress trackers");
    } finally {
      setBusy(false);
    }
  }

  function addTracker() {
    const label = newName.trim();
    if (!label) {
      onToast("Enter a tracker name");
      return;
    }
    const created = createCustomTracker(label, items);
    created.color = TRACKER_COLORS[items.length % TRACKER_COLORS.length];
    setNewName("");
    persist([...items, created], `${label} added to the master list`);
  }

  function confirmDelete() {
    const item = pendingDelete;
    if (!item) return;
    setPendingDelete(null);
    persist(items.filter((entry) => entry.id !== item.id), `${item.category} removed`);
  }

  return (
    <Panel
      className="ua-cfg-hp"
      title="Trackers"
      subtitle={
        loading
          ? "Loading trackers from App Config…"
          : "Coaches pick from this list when they add a tracker to a client. Turning one off leaves existing clients untouched but removes it from the picker."
      }
      actions={<span className="ua-cfg-hp__count">{availableCount} of {items.length} available</span>}
    >
      <div className="ua-cfg-hp__add">
        <input
          type="text"
          className="ua-cfg-hp__add-input"
          placeholder="New tracker name…"
          value={newName}
          disabled={busy || loading}
          onChange={(event) => setNewName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") addTracker();
          }}
        />
        <button style={{border:"0px",color:"rgb(255, 255, 255)",background:"rgb(94, 106, 210)"}}
          type="button"
          className="ua-cfg-btn ua-cfg-hp__add-btn"
          disabled={busy || loading || !newName.trim()}
          onClick={addTracker}
        >
          {busy ? "Saving…" : "+ Add tracker"}
        </button>
      </div>

      <div className="ua-cfg-hp-list">
        {loading ? (
          <div className="ua-cfg-hp-empty">Fetching the master tracker list…</div>
        ) : items.length ? (
          items.map((item) => (
            <div key={item.id} className="ua-cfg-hp-row">
              <span className="ua-cfg-hp-row__dot" style={{ background: item.color }} aria-hidden="true" />
              <div className="ua-cfg-hp-row__main">
                <strong>{item.category}</strong>
                <span>Shown to coaches as &apos;{item.name}&apos;</span>
              </div>
              <div className="ua-cfg-hp-row__controls">
                <span className={`ua-cfg-hp-row__type${item.builtin !== false ? "" : " ua-cfg-hp-row__type--custom"}`}>
                  {item.builtin !== false ? "Built in" : "Custom"}
                </span>
                <div className="ua-cfg-hp-row__shown-wrap">
                  <span className={`ua-cfg-faq__shown${item.enabled ? " is-on" : ""}`}>
                    {item.enabled ? "SHOWN" : "HIDDEN"}
                  </span>
                  <button
                    type="button"
                    className={`ua-toggle ua-toggle--sm${item.enabled ? " ua-toggle--on" : ""}`}
                    aria-pressed={item.enabled}
                    aria-label={`${item.category} ${item.enabled ? "available" : "hidden"}`}
                    disabled={busy}
                    onClick={() => {
                      persist(
                        items.map((entry) =>
                          entry.id === item.id ? { ...entry, enabled: !entry.enabled } : entry,
                        ),
                        item.enabled ? `${item.category} hidden from the picker` : `${item.category} available to coaches`,
                      );
                    }}
                  >
                    <span className="ua-toggle__knob" />
                  </button>
                </div>
                {item.builtin === false ? (
                  <button
                    type="button"
                    className="ua-cfg-icon-btn ua-cfg-icon-btn--danger ua-cfg-hp-row__delete"
                    aria-label={`Remove ${item.category}`}
                    disabled={busy}
                    onClick={() => setPendingDelete(item)}
                  >
                    ×
                  </button>
                ) : null}
              </div>
            </div>
          ))
        ) : (
          <div className="ua-cfg-hp-empty">No trackers yet. Add one above to get started.</div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        tag="Health progress"
        title={`Delete ${pendingDelete?.category || "this tracker"}?`}
        body="This removes the custom tracker from the master picker. Existing client data is left untouched."
        confirmLabel="Delete"
        confirmTone="danger"
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />
    </Panel>
  );
}

export function DrfActivityBankPanel({ items, setItems, sections, onToast }) {
  const [draft, setDraft] = useState({ name: "", section: sections[0] ?? "Meal Tracking" });
  const liveCount = items.filter((item) => item.enabled).length;
  const grouped = useMemo(() => {
    const map = new Map();
    for (const section of sections) map.set(section, []);
    for (const item of items) {
      const key = item.section || "Other";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    }
    return [...map.entries()];
  }, [items, sections]);

  function addActivity() {
    const name = draft.name.trim();
    if (!name) {
      onToast("Activity name is required");
      return;
    }
    setItems((prev) => [
      ...prev,
      {
        id: `drf-${Date.now()}`,
        name,
        section: draft.section,
        enabled: true,
      },
    ]);
    setDraft((prev) => ({ ...prev, name: "" }));
    onToast(`${name} added to the activity bank`);
  }

  return (
    <Panel
      title="Daily reflection activities"
      subtitle={`Coaches pick which activities a client logs · ${liveCount} of ${items.length} live`}
    >
      {grouped.map(([section, rows]) => (
        <div key={section} className="ua-cfg-bank-group">
          <div className="ua-cfg-bank-group__head">{section}</div>
          <div className="ua-cfg-bank-list">
            {rows.map((item) => (
              <div key={item.id} className="ua-cfg-bank-row">
                <div className="ua-cfg-bank-row__main">
                  <strong>{item.name}</strong>
                </div>
                <span className={`ua-cfg-faq__shown${item.enabled ? " is-on" : ""}`}>
                  {item.enabled ? "LIVE" : "HIDDEN"}
                </span>
                <button
                  type="button"
                  className={`ua-toggle${item.enabled ? " ua-toggle--on" : ""}`}
                  aria-pressed={item.enabled}
                  aria-label={`${item.name} ${item.enabled ? "on" : "off"}`}
                  onClick={() => {
                    setItems((prev) =>
                      prev.map((entry) =>
                        entry.id === item.id ? { ...entry, enabled: !entry.enabled } : entry,
                      ),
                    );
                  }}
                >
                  <span className="ua-toggle__knob" />
                </button>
                <button
                  type="button"
                  className="ua-cfg-icon-btn ua-cfg-icon-btn--danger"
                  aria-label={`Remove ${item.name}`}
                  onClick={() => {
                    setItems((prev) => prev.filter((entry) => entry.id !== item.id));
                    onToast(`${item.name} removed`);
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="ua-cfg-bank-add">
        <input
          type="text"
          className="ua-cfg-lookup__input"
          placeholder="Activity · e.g. Evening walk"
          value={draft.name}
          onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
        />
        <select
          className="ua-cfg-bank-select"
          value={draft.section}
          onChange={(event) => setDraft((prev) => ({ ...prev, section: event.target.value }))}
        >
          {sections.map((section) => (
            <option key={section} value={section}>{section}</option>
          ))}
        </select>
        <button type="button" className="ua-cfg-btn ua-cfg-btn--primary" onClick={addActivity}>
          + Add activity
        </button>
      </div>
    </Panel>
  );
}

export function CommitmentLetterPanel({ copy, onChange, onToast }) {
  const [editing, setEditing] = useState(false);
  const [draftIntro, setDraftIntro] = useState(copy.intro);
  const [draftBullets, setDraftBullets] = useState(copy.bullets.join("\n"));

  function startEdit() {
    setDraftIntro(copy.intro);
    setDraftBullets(copy.bullets.join("\n"));
    setEditing(true);
  }

  function cancelEdit() {
    setDraftIntro(copy.intro);
    setDraftBullets(copy.bullets.join("\n"));
    setEditing(false);
  }

  function saveEdit() {
    const intro = draftIntro.trim();
    const bullets = draftBullets
      .split("\n")
      .map((line) => line.replace(/^[\s•\-–]+/, "").trim())
      .filter(Boolean);

    if (!intro) {
      onToast("Add an opening paragraph before saving");
      return;
    }

    onChange({ intro, bullets });
    setEditing(false);
    onToast("Commitment letter template updated");
  }

  return (
    <Panel
      title="Onboarding template"
      subtitle="Shown when a coach assigns the commitment letter. Use {name} for the client’s name."
      actions={
        editing ? (
          <>
            <button type="button" className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm" onClick={cancelEdit}>
              Cancel
            </button>
            <button type="button" className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm" onClick={saveEdit}>
              Save
            </button>
          </>
        ) : (
          <button type="button" className="ua-cfg-btn ua-cfg-btn--ghost" onClick={startEdit}>
            Edit
          </button>
        )
      }
    >
      {editing ? (
        <div className="ua-cfg-legal-edit">
          <label className="ua-cfg-legal-edit__field">
            <span className="ua-cfg-legal-edit__label">Opening paragraph</span>
            <textarea
              className="ua-cfg-legal-edit__textarea"
              rows={3}
              value={draftIntro}
              onChange={(event) => setDraftIntro(event.target.value)}
            />
          </label>
          <label className="ua-cfg-legal-edit__field">
            <span className="ua-cfg-legal-edit__label">Bullet points · one per line</span>
            <textarea
              className="ua-cfg-legal-edit__textarea ua-cfg-legal-edit__textarea--bullets"
              rows={6}
              value={draftBullets}
              placeholder="One bullet per line"
              onChange={(event) => setDraftBullets(event.target.value)}
            />
          </label>
        </div>
      ) : (
        <div className="ua-cfg-legal-view">
          <p className="ua-cfg-legal-view__intro">{copy.intro}</p>
          <ul className="ua-cfg-legal-view__list">
            {copy.bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}
