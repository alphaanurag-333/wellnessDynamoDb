import { useCallback, useEffect, useMemo, useState } from "react";
import { asCopyString } from "../data/bannerConfigData.js";
import {
  adminGetGoogleReviewStats,
  adminSaveGoogleReviewStats,
  statsFromAppConfig,
} from "../api/googleReviewApi.js";

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

export function DynamicGoogleReviewSection({ stats, setStats, onToast, onOpenPreview }) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [dirty, setDirty] = useState(false);
  const rows = Array.isArray(stats) ? stats : statsFromAppConfig({});

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const next = await adminGetGoogleReviewStats(null);
      setStats(Array.isArray(next) ? next : statsFromAppConfig({}));
      setDirty(false);
    } catch (error) {
      setStats(statsFromAppConfig({}));
      onToast(error?.message || "Could not load site stats");
    } finally {
      setLoading(false);
    }
  }, [onToast, setStats]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  function updateStat(id, patch) {
    setStats((prev) => {
      const list = Array.isArray(prev) ? prev : statsFromAppConfig({});
      return list.map((row) => {
      if (row.id !== id) return row;
      const next = { ...row, ...patch };
      if ("value" in patch) {
        const value = String(patch.value ?? "").trim();
        next.value = value;
        next.shown = Boolean(value);
      }
      return next;
    });
    });
    setDirty(true);
  }

  async function saveAll() {
    setBusy(true);
    try {
      const saved = await adminSaveGoogleReviewStats(null, rows);
      setStats(Array.isArray(saved) ? saved : statsFromAppConfig({}));
      setDirty(false);
      setEditingId(null);
      onToast("Site stats saved");
    } catch (error) {
      onToast(error?.message || "Could not save site stats");
    } finally {
      setBusy(false);
    }
  }

  const liveCount = useMemo(
    () => rows.filter((row) => String(row.value || "").trim()).length,
    [rows],
  );

  return (
    <div className="ua-cfg-gr">
      <Panel
        title="Google review & social stats"
        subtitle={loading ? "Loading from App Config…" : `${liveCount} of ${rows.length} stats set · synced to site hero and about sections`}
        actions={(
          <>
            {onOpenPreview ? (
              <button type="button" className="ua-cfg-btn ua-cfg-btn--outline ua-cfg-btn--sm" onClick={onOpenPreview}>Preview</button>
            ) : null}
            <button
              type="button"
              className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm"
              disabled={busy || loading || !dirty}
              onClick={saveAll}
            >
              Save changes
            </button>
          </>
        )}
      >
        <p className="ua-cfg-panel__sub">
          Values are stored in App Config and shown on the website and app when set. Clear a value to hide that stat.
        </p>
      </Panel>

      {loading ? <p className="ua-cfg-panel__sub">Loading…</p> : null}

      <div className="ua-cfg-gr-grid">
        {rows.map((entry) => {
          const editing = editingId === entry.id;
          const hasValue = Boolean(String(entry.value || "").trim());
          return (
            <article key={entry.id} className={`ua-cfg-gr-card ua-cfg-gr-card--${entry.tone}`}>
              <div className="ua-cfg-gr-card__head">
                <span aria-hidden="true">{entry.icon}</span>
                <strong>{asCopyString(entry.label)}</strong>
                {editing ? (
                  <button
                    type="button"
                    className="ua-cfg-btn ua-cfg-btn--ghost ua-cfg-btn--sm"
                    disabled={busy}
                    onClick={() => setEditingId(null)}
                  >
                    Done
                  </button>
                ) : (
                  <button
                    type="button"
                    className="ua-cfg-btn ua-cfg-btn--ghost ua-cfg-btn--sm"
                    disabled={busy}
                    onClick={() => setEditingId(entry.id)}
                  >
                    Edit
                  </button>
                )}
              </div>
              {editing ? (
                <input
                  className={`ua-cfg-gr-card__input ua-cfg-gr-card__value--${entry.tone}`}
                  value={asCopyString(entry.value)}
                  disabled={busy}
                  placeholder="e.g. 4.8 or 1,284"
                  onChange={(event) => updateStat(entry.id, { value: event.target.value })}
                />
              ) : (
                <p className={`ua-cfg-gr-card__value ua-cfg-gr-card__value--${entry.tone}`}>
                  {hasValue ? asCopyString(entry.value) : "Not set"}
                </p>
              )}
              <div className="ua-cfg-gr-card__shown">
                <span className={hasValue ? "is-on" : ""}>{hasValue ? "Shown on site" : "Hidden"}</span>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
