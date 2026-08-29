import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_NAMES,
  NAMES_MAX,
  getCompliance,
  saveCompliance,
} from "../api/complianceApi.js";

const EMPTY = {
  enabled: true,
  names: DEFAULT_NAMES,
};

function Panel({ title, subtitle, children }) {
  return (
    <section className="ua-cfg-panel">
      <div className="ua-cfg-panel__head">
        <div>
          {title ? <h3 className="ua-cfg-panel__title">{title}</h3> : null}
          {subtitle ? <p className="ua-cfg-panel__sub">{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

export function AppComplianceSection({
  settings,
  setSettings,
  onToast,
  registerPublishHandler,
  onLocalChange,
}) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(EMPTY);
  const settingsRef = useRef(settings);
  const persistRef = useRef(null);

  settingsRef.current = settings;

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const next = await getCompliance();
      const resolved = next || EMPTY;
      setSettings(resolved);
      setSaved(resolved);
      onLocalChange?.({ hasLocalChanges: false });
    } catch (error) {
      setSettings(EMPTY);
      setSaved(EMPTY);
      onToast(error?.message || "Failed to load compliance settings");
    } finally {
      setLoading(false);
    }
  }, [onLocalChange, onToast, setSettings]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  function patch(next) {
    setSettings((prev) => ({ ...(prev || EMPTY), ...next }));
  }

  async function persist() {
    const current = settingsRef.current || EMPTY;
    const names = String(current.names || "").trim();
    const enabled = Boolean(current.enabled);

    if (enabled && !names) {
      throw new Error("Enter compliance names (e.g. GDPR, HIPAA) before enabling");
    }

    setBusy(true);
    try {
      const next = await saveCompliance({
        enabled,
        names: names || DEFAULT_NAMES,
      });
      const resolved = next || { enabled, names: names || DEFAULT_NAMES };
      setSettings(resolved);
      setSaved(resolved);
      onLocalChange?.({ hasLocalChanges: false });
      return resolved;
    } finally {
      setBusy(false);
    }
  }

  persistRef.current = persist;

  useEffect(() => {
    if (!registerPublishHandler) return undefined;
    registerPublishHandler(async () => persistRef.current());
  }, [registerPublishHandler]);

  const dirty =
    Boolean(settings?.enabled) !== Boolean(saved.enabled)
    || String(settings?.names || "") !== String(saved.names || "");

  useEffect(() => {
    onLocalChange?.({ hasLocalChanges: dirty });
  }, [dirty, onLocalChange]);

  const enabled = Boolean(settings?.enabled);

  return (
    <div className="ua-cfg-lang">
      {dirty ? (
        <p className="ua-cfg-panel__sub ua-cfg-privacy__draft-note" role="status">
          Unsaved changes — stored in this session only. Click <strong>Publish</strong> to save to the app, or refresh to discard.
        </p>
      ) : null}

      <Panel
        title="Compliance"
        subtitle={
          loading
            ? "Loading compliance setting…"
            : "Drawer line in the mobile app — not a full legal page. Example: GDPR, HIPAA"
        }
      >
        {loading ? (
          <p className="ua-cfg-panel__sub">Fetching compliance from App Config…</p>
        ) : (
          <>
            <div className="ua-cfg-lang-row">
              <div>
                <div className="ua-cfg-lang-row__name">Show in app drawer</div>
                <div className="ua-cfg-lang-row__note">
                  When enabled, the compliance names line appears in the app drawer
                </div>
              </div>
              <div className="ua-cfg-lang-row__side">
                <span className="ua-cfg-lang-row__state">{enabled ? "Enabled" : "Disabled"}</span>
                <button
                  type="button"
                  className={`ua-toggle${enabled ? " ua-toggle--on" : ""}`}
                  aria-pressed={enabled}
                  aria-label="Compliance in app drawer"
                  disabled={busy}
                  onClick={() => patch({ enabled: !enabled })}
                >
                  <span className="ua-toggle__knob" />
                </button>
              </div>
            </div>

            <label className="ua-cfg-consult-field" htmlFor="compliance-names" style={{ marginTop: 16 }}>
              <span className="ua-cfg-consult-field__label">
                Compliance names
                {enabled ? <em className="ua-cfg-consult-field__req" aria-hidden="true">*</em> : null}
              </span>
              <input
                id="compliance-names"
                className="ua-cfg-pgw-field__input"
                type="text"
                maxLength={NAMES_MAX}
                value={settings?.names || ""}
                disabled={busy}
                placeholder={DEFAULT_NAMES}
                onChange={(event) =>
                  patch({ names: event.target.value.slice(0, NAMES_MAX) })
                }
              />
              <span className="ua-cfg-panel__sub" style={{ marginTop: 6 }}>
                Shown as a single line in the drawer (e.g. GDPR, HIPAA)
              </span>
              <span className="ua-cfg-consult-field__count">
                {String(settings?.names || "").length}/{NAMES_MAX}
              </span>
            </label>
          </>
        )}
      </Panel>
    </div>
  );
}
