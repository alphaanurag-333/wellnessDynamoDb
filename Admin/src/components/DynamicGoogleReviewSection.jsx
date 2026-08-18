import { useCallback, useEffect, useMemo, useState } from "react";
import { asCopyString } from "../data/bannerConfigData.js";
import {
  adminGetGoogleReviewStats,
  adminSaveGoogleReviewStats,
  statsFromAppConfig,
} from "../api/googleReviewApi.js";

const PLACEHOLDERS = {
  "gr-rating": "e.g. 4.8",
  "gr-reviews": "e.g. 1,284",
  "gr-clients": "e.g. 12,000",
  "gr-success": "e.g. 94",
  "gr-improved": "e.g. 8,400",
  "gr-facebook": "e.g. 42.1K",
};

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

export function DynamicGoogleReviewSection({ stats, setStats, onToast }) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
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
        subtitle={
          loading
            ? "Loading from App Config…"
            : `${liveCount} of ${rows.length} stats set · clear a value to hide it on the site`
        }
        actions={(
          <button
            type="button"
            className="ua-cfg-btn ua-cfg-btn--primary ua-cfg-btn--sm"
            disabled={busy || loading || !dirty}
            onClick={saveAll}
          >
            Save changes
          </button>
        )}
      >
        <div className={`ua-cfg-gr-grid${loading ? " is-loading" : ""}`}>
          {rows.map((entry) => {
            const hasValue = Boolean(String(entry.value || "").trim());
            return (
              <article key={entry.id} className={`ua-cfg-gr-card ua-cfg-gr-card--${entry.tone}`}>
                <div className="ua-cfg-gr-card__head">
                  <span className="ua-cfg-gr-card__icon" aria-hidden="true">{entry.icon}</span>
                  <strong>{asCopyString(entry.label)}</strong>
                </div>
                <input
                  className={`ua-cfg-gr-card__input ua-cfg-gr-card__value--${entry.tone}`}
                  value={asCopyString(entry.value)}
                  disabled={busy || loading}
                  placeholder={PLACEHOLDERS[entry.id] || "e.g. 4.8 or 1,284"}
                  aria-label={asCopyString(entry.label)}
                  onChange={(event) => updateStat(entry.id, { value: event.target.value })}
                />
                <div className="ua-cfg-gr-card__shown">
                  <span className={`ua-cfg-gr-chip${hasValue ? " is-on" : ""}`}>
                    {hasValue ? "Live" : "Hidden"}
                  </span>
                  <span className="ua-cfg-gr-card__hint">
                    {hasValue ? "Shown on site" : "Empty — hidden on site"}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
